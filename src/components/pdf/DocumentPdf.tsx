import type React from "react";
import { Document, Image, Link, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import {
  A4,
  FOTO_ALTURA_MAX_MM,
  FOTO_GAP_MM,
  LARGURA_UTIL_PT,
  MM_PARA_PT,
  linhasDeFotos,
} from "@/lib/documento-layout";
import { dimensoesImagem } from "@/lib/imagem-dimensoes";
import {
  CANAIS_COMUNICACAO,
  FECHAMENTO_PADRAO,
  NOME_GERENCIAL,
} from "@/lib/padrao-documento";
import type { DocData } from "@/lib/types";

const C = {
  ink: "#181447",
  brand: "#fab12a",
  brandDark: "#8a5c00",
  brandSoft: "#fdf3de",
  line: "#e3e0d3",
  paper: "#f6f4ee",
  text: "#23233a",
  muted: "#6b6b7d",
};

const MARGEM = A4.margemMm * MM_PARA_PT;
const GAP_FOTO = FOTO_GAP_MM * MM_PARA_PT;

const s = StyleSheet.create({
  page: {
    paddingTop: MARGEM,
    paddingBottom: MARGEM + 18,
    paddingHorizontal: MARGEM,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: C.text,
  },
  header: { flexDirection: "row", alignItems: "center", minHeight: 66 },
  headerLeft: { width: "34%", height: 66 },
  logo: { width: "100%", height: 66, objectFit: "contain" },
  headerCenter: { width: "32%", alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  headerRight: { width: "34%", height: 66 },
  numero: { fontFamily: "Helvetica-Bold", fontSize: 9.5, color: C.ink, textAlign: "center" },
  localData: { fontSize: 8.5, color: C.muted, marginTop: 4, textAlign: "center" },
  bar: { flexDirection: "row", marginTop: 10, height: 3 },
  barBrand: { width: 64, backgroundColor: C.brand },
  barInk: { flex: 1, backgroundColor: C.ink },
  titulo: {
    fontFamily: "Helvetica-Bold",
    fontSize: 16,
    color: C.ink,
    marginTop: 18,
    letterSpacing: 0.6,
  },
  subtitulo: { fontSize: 9.5, color: C.muted, marginTop: 3 },
  condo: {
    marginTop: 12,
    backgroundColor: C.paper,
    borderLeftWidth: 3,
    borderLeftColor: C.brand,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  microLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 6.5,
    letterSpacing: 1,
    color: C.muted,
    textTransform: "uppercase",
  },
  condoNome: { fontFamily: "Helvetica-Bold", fontSize: 11, color: C.ink, marginTop: 2 },
  tabela: { marginTop: 12, borderWidth: 0.75, borderColor: C.line },
  linha: { flexDirection: "row", borderBottomWidth: 0.75, borderBottomColor: C.line },
  linhaUltima: { flexDirection: "row" },
  celulaLabel: {
    width: 132,
    backgroundColor: C.paper,
    paddingVertical: 5,
    paddingHorizontal: 8,
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    letterSpacing: 0.5,
    color: C.muted,
    textTransform: "uppercase",
  },
  celulaValor: { flex: 1, paddingVertical: 5, paddingHorizontal: 8, fontSize: 9.5, color: C.ink },
  destaque: {
    marginTop: 12,
    backgroundColor: C.brandSoft,
    borderWidth: 1,
    borderColor: C.brand,
    borderRadius: 4,
    paddingVertical: 9,
    paddingHorizontal: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  destaqueLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    letterSpacing: 0.8,
    color: C.brandDark,
    textTransform: "uppercase",
  },
  destaqueValor: { fontFamily: "Helvetica-Bold", fontSize: 18, color: C.ink, marginTop: 2 },
  destaqueNota: { fontSize: 8.5, color: C.muted, maxWidth: 220, textAlign: "right" },
  saudacao: { marginTop: 14, fontSize: 10.5 },
  galeria: { marginTop: 12 },
  galeriaTitulo: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    letterSpacing: 0.8,
    color: C.muted,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  galeriaLinha: { flexDirection: "row", gap: GAP_FOTO, marginBottom: GAP_FOTO },
  foto: { alignItems: "center" },
  fotoLegenda: { fontSize: 8.5, color: C.muted, marginTop: 3, textAlign: "center" },
  paragrafo: { fontSize: 10, lineHeight: 1.5, textAlign: "justify", marginBottom: 6 },
  secao: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    letterSpacing: 0.5,
    color: C.ink,
    marginTop: 5,
    marginBottom: 2,
  },
  marcador: { flexDirection: "row", marginBottom: 3, paddingLeft: 8 },
  marcadorPonto: { width: 10, fontSize: 10, lineHeight: 1.5 },
  marcadorTexto: { flex: 1, fontSize: 10, lineHeight: 1.5 },
  fechamento: { marginTop: 12, fontSize: 10 },
  contatos: { marginTop: 12, fontSize: 9, lineHeight: 1.5, color: C.muted },
  contatosTitulo: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    letterSpacing: 0.8,
    color: C.muted,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  contatoRotulo: { fontFamily: "Helvetica-Bold", color: C.ink },
  contatoLink: { color: C.ink, textDecoration: "underline" },
  assinatura: { marginTop: 24, alignItems: "center" },
  assinaturaLinha: { width: 320, borderTopWidth: 0.75, borderTopColor: C.ink, paddingTop: 4 },
  assinaturaNome: { fontFamily: "Helvetica-Bold", fontSize: 10, color: C.ink, textAlign: "center" },
  rodape: {
    position: "absolute",
    left: MARGEM,
    right: MARGEM,
    bottom: 24,
    borderTopWidth: 0.75,
    borderTopColor: C.line,
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  rodapeTexto: { flex: 1, fontSize: 7.5, color: C.muted, paddingRight: 12 },
  rodapePagina: { fontSize: 7.5, color: C.muted },
});

function Galeria({ doc }: { doc: DocData }) {
  if (doc.imagens.length === 0) return null;
  const coluna = (LARGURA_UTIL_PT - GAP_FOTO) / 2;
  const alturaMax = FOTO_ALTURA_MAX_MM * MM_PARA_PT;

  return (
    <View style={s.galeria}>
      {doc.galeria.titulo.trim() ? (
        <Text style={s.galeriaTitulo} minPresenceAhead={60}>
          {doc.galeria.titulo}
        </Text>
      ) : null}
      {linhasDeFotos(doc.imagens).map((linha, linhaIdx) => (
        <View key={linhaIdx} style={s.galeriaLinha} wrap={false}>
          {linha.map((img) => {
            const idx = doc.imagens.findIndex((x) => x.id === img.id);
            const { largura, altura } = dimensoesImagem(img.dataUrl);
            const caixa = img.largura === "meia" ? coluna : LARGURA_UTIL_PT;
            const escala = Math.min(caixa / largura, alturaMax / altura);
            return (
              <View
                key={img.id}
                style={[s.foto, { width: img.largura === "meia" ? coluna : LARGURA_UTIL_PT }]}
              >
                <Image
                  src={img.dataUrl}
                  style={{
                    width: Math.round(largura * escala),
                    height: Math.round(altura * escala),
                    objectFit: "contain",
                  }}
                />
                <Text style={s.fotoLegenda}>
                  {img.legenda.trim() ? `Foto ${idx + 1} — ${img.legenda}` : `Foto ${idx + 1}`}
                </Text>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const ehSecao = (l: string) =>
  l.length >= 4 && l.length <= 90 && l === l.toUpperCase() && /[A-ZÀ-Ú]{3}/.test(l);

function Linha({ l }: { l: string }) {
  const m = /^([•\-*–])\s+(.*)$/.exec(l);
  if (m) {
    return (
      <View style={s.marcador} wrap={false}>
        <Text style={s.marcadorPonto}>•</Text>
        <Text style={s.marcadorTexto}>{m[2]}</Text>
      </View>
    );
  }
  return <Text style={s.paragrafo}>{l}</Text>;
}

function Corpo({ texto }: { texto: string }) {
  const linhas = texto
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.trim());
  const itens: React.ReactNode[] = [];
  for (let i = 0; i < linhas.length; i++) {
    const l = linhas[i];
    if (!l) {
      itens.push(<View key={i} style={{ height: 3 }} />);
      continue;
    }
    if (ehSecao(l)) {
      const prox = linhas[i + 1];
      if (prox && !ehSecao(prox)) {
        itens.push(
          <View key={i} wrap={false}>
            <Text style={s.secao}>{l}</Text>
            <Linha l={prox} />
          </View>,
        );
        i++;
      } else {
        itens.push(
          <Text key={i} style={s.secao} minPresenceAhead={40}>
            {l}
          </Text>,
        );
      }
      continue;
    }
    itens.push(<Linha key={i} l={l} />);
  }
  return <View>{itens}</View>;
}

export function DocumentPdf({
  doc,
  logoUrl,
  condoLogoUrl,
}: {
  doc: DocData;
  logoUrl: string;
  condoLogoUrl?: string | null;
}) {
  return (
    <Document
      title={`${doc.titulo}${doc.numero ? ` ${doc.numero}` : ""}`}
      author={NOME_GERENCIAL}
      subject={doc.condominio}
      creator="Gerencial"
    >
      <Page size="A4" style={s.page}>
        <View style={s.header} wrap={false}>
          <View style={s.headerLeft}>
            <Image src={logoUrl} style={[s.logo, { objectPosition: "left center" }]} />
          </View>
          <View style={s.headerCenter}>
            {doc.numero.trim() ? <Text style={s.numero}>Nº {doc.numero}</Text> : null}
            {doc.local.trim() ? <Text style={s.localData}>{doc.local}</Text> : null}
            {doc.data.trim() ? <Text style={s.localData}>{doc.data}</Text> : null}
          </View>
          <View style={s.headerRight}>
            {condoLogoUrl ? (
              <Image src={condoLogoUrl} style={[s.logo, { objectPosition: "right center" }]} />
            ) : null}
          </View>
        </View>
        <View style={s.bar}>
          <View style={s.barBrand} />
          <View style={s.barInk} />
        </View>

        <Text style={s.titulo}>{doc.titulo}</Text>
        {doc.subtitulo.trim() ? <Text style={s.subtitulo}>{doc.subtitulo}</Text> : null}

        {doc.condominio.trim() ? (
          <View style={s.condo} wrap={false}>
            <Text style={s.microLabel}>Condomínio</Text>
            <Text style={s.condoNome}>{doc.condominio}</Text>
          </View>
        ) : null}

        {doc.campos.length > 0 ? (
          <View style={s.tabela}>
            {doc.campos.map((c, i) => (
              <View
                key={c.id}
                style={i === doc.campos.length - 1 ? s.linhaUltima : s.linha}
                wrap={false}
              >
                <Text style={s.celulaLabel}>{c.label}</Text>
                <Text style={s.celulaValor}>{c.value}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {doc.destaque.ativo ? (
          <View style={s.destaque} wrap={false}>
            <View>
              <Text style={s.destaqueLabel}>{doc.destaque.label}</Text>
              <Text style={s.destaqueValor}>{doc.destaque.value}</Text>
            </View>
            {doc.destaque.nota.trim() ? (
              <Text style={s.destaqueNota}>{doc.destaque.nota}</Text>
            ) : null}
          </View>
        ) : null}

        {doc.saudacao.trim() ? <Text style={s.saudacao}>{doc.saudacao}</Text> : null}
        <View style={{ marginTop: 8 }}>
          <Corpo texto={doc.corpo} />
        </View>

        {/* Fotos sempre após o texto; cada linha fica junto da legenda. */}
        <Galeria doc={doc} />

        {/* Fechamento + canais + assinatura única não se separam entre páginas. */}
        <View wrap={false}>
          <Text style={s.fechamento}>{FECHAMENTO_PADRAO}</Text>
          <View style={s.contatos}>
            <Text style={s.contatosTitulo}>Canais de comunicação</Text>
            {CANAIS_COMUNICACAO.map((canal) => (
              <Text key={canal.rotulo}>
                <Text style={s.contatoRotulo}>{canal.rotulo}: </Text>
                {"href" in canal && canal.href ? (
                  <Link src={canal.href} style={s.contatoLink}>
                    {canal.valor}
                  </Link>
                ) : (
                  canal.valor
                )}
              </Text>
            ))}
          </View>
          <View style={s.assinatura}>
            <View style={s.assinaturaLinha}>
              <Text style={s.assinaturaNome}>{NOME_GERENCIAL}</Text>
            </View>
          </View>
        </View>

        <View style={s.rodape} fixed>
          <Text style={s.rodapeTexto}>{doc.rodape}</Text>
          <Text
            style={s.rodapePagina}
            render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
