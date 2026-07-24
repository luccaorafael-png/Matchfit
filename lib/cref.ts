// Cada região do CREF (1 a 24+) tem seu próprio site de consulta pública
// — não existe uma API unificada. Isso mapeia a região pro link de busca
// certo, usado no painel de admin pra agilizar a verificação manual.
// Preenchido com as regiões mais comuns; região sem link mapeado ainda
// cai no fallback de busca no Google.
export const CREF_REGIONS = [
  { value: "CREF1/DF-GO-TO-MS-MT", label: "CREF1 (DF, GO, TO, MS, MT)" },
  { value: "CREF2/RS", label: "CREF2 (RS)" },
  { value: "CREF3/SC", label: "CREF3 (SC)" },
  { value: "CREF4/SP", label: "CREF4 (SP)" },
  { value: "CREF5/PR", label: "CREF5 (PR)" },
  { value: "CREF6/MG", label: "CREF6 (MG)" },
  { value: "CREF7/DF", label: "CREF7 (DF)" },
  { value: "CREF8/PA-AP", label: "CREF8 (PA, AP)" },
  { value: "CREF9/CE-PI", label: "CREF9 (CE, PI)" },
  { value: "CREF10/PE", label: "CREF10 (PE)" },
  { value: "CREF11/ES", label: "CREF11 (ES)" },
  { value: "CREF12/AM-AC-RO-RR", label: "CREF12 (AM, AC, RO, RR)" },
  { value: "CREF13/BA", label: "CREF13 (BA)" },
  { value: "CREF14/RN", label: "CREF14 (RN)" },
  { value: "CREF15/AL-SE", label: "CREF15 (AL, SE)" },
  { value: "CREF16/RJ", label: "CREF16 (RJ)" },
  { value: "CREF17/PB", label: "CREF17 (PB)" },
  { value: "CREF18/MA", label: "CREF18 (MA)" },
  { value: "Outra", label: "Outra região" },
] as const;

// Links de busca pública por região — usados só como atalho pro admin
// abrir o site certo e conferir manualmente. Nem toda região tem um link
// direto de busca fácil de montar por URL; nesses casos cai no fallback.
const REGION_SEARCH_URLS: Record<string, string> = {
  "CREF4/SP": "https://www.crefsp.gov.br/atendimento/servicos-online/consulta-de-inscritos",
  "CREF6/MG": "https://www.cref6.org.br/servico/consulta-cadastral/35",
  "CREF16/RJ": "https://www.cref16.org.br",
  "CREF13/BA": "https://www.cref13.org.br",
  "CREF7/DF": "https://www.cref7.org.br",
  "CREF3/SC": "https://crefsc.org.br",
};

export function getCrefSearchUrl(region: string | null): string {
  if (region && REGION_SEARCH_URLS[region]) return REGION_SEARCH_URLS[region];
  return `https://www.google.com/search?q=consulta+CREF+${encodeURIComponent(region ?? "")}`;
}
