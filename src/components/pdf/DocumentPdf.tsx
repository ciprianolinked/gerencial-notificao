import type React from "react";
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
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

const s = StyleSheet.create({
  page: {
    paddingTop: 34,
    paddingBottom: 66,
    paddingHorizontal: 46,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: C.text,
  },
  header: { flexDirection: "row", alignItems: "flex-start", minHeight: 70 },
  headerLeft: { width: "30%", paddingTop: 4 },
  logo: { width: 140, height: 26, objectFit: "contain" },
  headerCenter: { width: "40%", alignItems: "center", paddingTop: 4 },
  headerRight: { width: "30%", alignItems: "flex-end", justifyContent: "flex-start" },
  condoLogo: { width: 125, height: 52, objectFit: "contain" },
  numero: { fontFamily: "Helvetica-Bold", fontSize: 9.5, color: C.ink, textAlign: "center" },
  localData: { fontSize: 8.5, color: C.muted, marginTop: 4, textAlign: "center" },
  bar: { flexDirection: "row", marginTop: 10, height: 3 },
  barBrand: { width: 64, backgroundColor: C.brand },
  barInk: { flex: 1, backgroundColor: C.ink },
  titulo: {
    fontFamily: "Helvetica-Bold",
    fontSize: 16,
    color: C.ink,
    marginTop: 22,
    letterSpacing: 0.6,
  },
  subtitulo: { fontSize: 9.5, color: C.muted, marginTop: 3 },
  condo: {
    marginTop: 14,
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
  condoInfo: { fontSize: 8.5, color: C.muted, marginTop: 1 },
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
  saudacao: { marginTop: 16, fontSize: 10.5 },
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
  dataLocal: { marginTop: 10, fontSize: 10 },
  assinaturas: { marginTop: 34, flexDirection: "row", flexWrap: "wrap" },
  assinatura: { paddingHorizontal: 8, marginBottom: 22 },
  assinaturaLinha: { borderTopWidth: 0.75, borderTopColor: C.ink, marginTop: 30, paddingTop: 4 },
  assinaturaNome: { fontFamily: "Helvetica-Bold", fontSize: 9, color: C.ink, textAlign: "center" },
  assinaturaCargo: { fontSize: 8, color: C.muted, textAlign: "center", marginTop: 1 },
  rodape: {
    position: "absolute",
    left: 46,
    right: 46,
    bottom: 26,
    borderTopWidth: 0.75,
    borderTopColor: C.line,
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  rodapeTexto: { flex: 1, fontSize: 7.5, color: C.muted, paddingRight: 12 },
  rodapePagina: { fontSize: 7.5, color: C.muted },
});

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
      // O título nunca fica sozinho no fim da página: segue junto com a linha seguinte.
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
  const n = Math.max(doc.assinaturas.length, 1);
  const larguraAss = `${100 / Math.min(n, 3)}%`;
  const localData = [doc.local, doc.data].filter((x) => x.trim()).join(", ");

  return (
    <Document
      title={`${doc.titulo}${doc.numero ? ` ${doc.numero}` : ""}`}
      author="Gerencial · Governança Condominial"
      subject={doc.condominio}
      creator="Gerencial"
    >
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Image src={logoUrl} style={s.logo} />
          </View>
          <View style={s.headerCenter}>
            {doc.numero.trim() ? <Text style={s.numero}>Nº {doc.numero}</Text> : null}
            {doc.local.trim() ? <Text style={s.localData}>{doc.local}</Text> : null}
            {doc.data.trim() ? <Text style={s.localData}>{doc.data}</Text> : null}
          </View>
          <View style={s.headerRight}>
            {condoLogoUrl ? <Image src={condoLogoUrl} style={s.condoLogo} /> : null}
          </View>
        </View>
        <View style={s.bar}>
          <View style={s.barBrand} />
          <View style={s.barInk} />
        </View>

        <Text style={s.titulo}>{doc.titulo}</Text>
        {doc.subtitulo.trim() ? <Text style={s.subtitulo}>{doc.subtitulo}</Text> : null}

        {doc.condominio.trim() || doc.condominioInfo.trim() ? (
          <View style={s.condo} wrap={false}>
            <Text style={s.microLabel}>Condomínio</Text>
            {doc.condominio.trim() ? <Text style={s.condoNome}>{doc.condominio}</Text> : null}
            {doc.condominioInfo.trim() ? (
              <Text style={s.condoInfo}>{doc.condominioInfo}</Text>
            ) : null}
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

        <View wrap={false}>
        {doc.fechamento.trim() ? <Text style={s.fechamento}>{doc.fechamento}</Text> : null}
          {localData ? <Text style={s.dataLocal}>{localData}.</Text> : null}

          {doc.assinaturas.length > 0 ? (
            <View style={s.assinaturas} wrap={false}>
              {doc.assinaturas.map((a) => (
                <View key={a.id} style={[s.assinatura, { width: larguraAss }]}>
                  <View style={s.assinaturaLinha}>
                    <Text style={s.assinaturaNome}>{a.nome}</Text>
                    {a.cargo.trim() ? <Text style={s.assinaturaCargo}>{a.cargo}</Text> : null}
                  </View>
                </View>
              ))}
            </View>
          ) : null}
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
