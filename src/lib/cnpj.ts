import { getIaConfig } from "./config";
import { chamarGemini, IaError, lerJson } from "./gemini";

export type DadosCnpj = {
  nome: string;
  cnpj: string;
  endereco: string;
  cidade: string;
  uf: string;
};

export type ResultadoCnpj = {
  dados: DadosCnpj;
  razaoSocial: string;
  situacao: string;
  fonte: string;
  viaIA: boolean;
};

export function apenasDigitos(s: string): string {
  return s.replace(/\D/g, "");
}

export function formatarCnpj(d: string): string {
  return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2}).*$/, "$1.$2.$3/$4-$5");
}

/** Validação oficial dos dígitos verificadores. */
export function cnpjValido(d: string): boolean {
  if (!/^\d{14}$/.test(d) || /^(\d)\1{13}$/.test(d)) return false;
  const calc = (base: string, pesos: number[]) => {
    const soma = base.split("").reduce((acc, n, i) => acc + Number(n) * pesos[i], 0);
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const d1 = calc(d.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = calc(d.slice(0, 12) + d1, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return d.endsWith(`${d1}${d2}`);
}

type Registro = Record<string, unknown>;
const s = (r: Registro, k: string) => (typeof r[k] === "string" ? (r[k] as string).trim() : "");

async function buscar(url: string): Promise<Registro | null> {
  try {
    const r = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!r.ok) return null;
    const j = (await r.json()) as Registro;
    return j && typeof j === "object" ? j : null;
  } catch {
    return null;
  }
}

function montarEndereco(r: Registro): string {
  const log = [s(r, "logradouro"), s(r, "numero")].filter(Boolean).join(", ");
  const complemento = s(r, "complemento");
  const bairro = s(r, "bairro");
  const cep = apenasDigitos(s(r, "cep"));
  const cepFmt = cep.length === 8 ? `CEP ${cep.slice(0, 5)}-${cep.slice(5)}` : "";
  return [log, complemento, bairro, cepFmt].filter(Boolean).join(" — ");
}

/** Consulta a Receita (via BrasilAPI / ReceitaWS) e organiza os campos com apoio da IA. */
export async function consultarCnpj(cnpj: string): Promise<ResultadoCnpj> {
  const d = apenasDigitos(cnpj);
  if (!cnpjValido(d)) {
    throw new IaError("CNPJ inválido. Confira os 14 dígitos (dígitos verificadores não conferem).", 400);
  }

  let reg = await buscar(`https://brasilapi.com.br/api/cnpj/v1/${d}`);
  let fonte = "BrasilAPI (dados da Receita Federal)";
  if (!reg || !s(reg, "razao_social")) {
    const alt = await buscar(`https://receitaws.com.br/v1/cnpj/${d}`);
    if (alt && s(alt, "status") === "OK") {
      reg = alt;
      fonte = "ReceitaWS";
    }
  }
  if (!reg) {
    throw new IaError(
      "Não foi possível consultar o CNPJ agora (CNPJ não encontrado ou serviço da Receita indisponível). Preencha os dados manualmente.",
      502,
    );
  }

  const razaoSocial = s(reg, "razao_social") || s(reg, "nome");
  const situacao = s(reg, "descricao_situacao_cadastral") || s(reg, "situacao");
  const base: DadosCnpj = {
    nome: s(reg, "nome_fantasia") || s(reg, "fantasia") || razaoSocial,
    cnpj: formatarCnpj(d),
    endereco: montarEndereco(reg),
    cidade: s(reg, "municipio"),
    uf: s(reg, "uf").toUpperCase(),
  };

  const cfg = await getIaConfig();
  if (cfg.apiKey) {
    try {
      const texto = await chamarGemini({
        parts: [
          {
            text: `Você organiza dados cadastrais de condomínios para a Gerencial. Abaixo estão os dados oficiais retornados pela consulta de CNPJ. Converta para JSON com os campos do cadastro, SEM inventar informação:
- "nome": nome de uso do condomínio (prefira o nome fantasia; se não houver, use a razão social).
- "cnpj": no formato 00.000.000/0000-00.
- "endereco": logradouro, número, complemento, bairro e CEP em uma única linha (sem cidade/UF).
- "cidade": município. "uf": sigla com 2 letras.
Se algum dado não existir, devolva string vazia. Responda SOMENTE com JSON {"nome":"","cnpj":"","endereco":"","cidade":"","uf":""}.

DADOS OFICIAIS:
${JSON.stringify(reg).slice(0, 12000)}`,
          },
        ],
        json: true,
        temperature: 0,
      });
      const j = lerJson(texto);
      const limpo: DadosCnpj = {
        nome: typeof j.nome === "string" && j.nome.trim() ? j.nome.trim() : base.nome,
        cnpj: base.cnpj,
        endereco: typeof j.endereco === "string" ? j.endereco.trim() : base.endereco,
        cidade: typeof j.cidade === "string" && j.cidade.trim() ? j.cidade.trim() : base.cidade,
        uf: typeof j.uf === "string" && j.uf.trim() ? j.uf.trim().toUpperCase().slice(0, 2) : base.uf,
      };
      return { dados: limpo, razaoSocial, situacao, fonte, viaIA: true };
    } catch {
      /* sem IA disponível: devolve o mapeamento direto */
    }
  }
  return { dados: base, razaoSocial, situacao, fonte, viaIA: false };
}
