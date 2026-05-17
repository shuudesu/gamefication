// IMPORTANTE: este arquivo NÃO pode importar `pdf-parse` nem `pdfjs-dist`.
// Esses pacotes assumem ambiente browser (DOMMatrix, ImageData, canvas) e
// crasham no load em runtime Node do Vercel — quebrando todo o route que
// importar source-fetcher transitivamente. A extração de texto do PDF
// agora é feita nativamente pelo Claude (via document block com URL).

const MAX_URL_BYTES = 5 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 20_000;
const USER_AGENT = "GameficationConcursoOS/0.1 (+study-helper)";

export type FetchedSource = {
  text: string;
  origin: "url-pdf" | "url-html";
  url?: string;
  pdfBuffer?: Buffer;
};

export async function fetchUrlAsSource(url: string): Promise<FetchedSource> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("URL inválida");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Apenas URLs http/https são aceitas");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/pdf;q=0.9,*/*;q=0.5" },
      redirect: "follow",
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    const msg = err instanceof Error ? err.message : "Erro de rede";
    throw new Error(`Falha ao acessar a URL: ${msg}`);
  }
  clearTimeout(timer);

  if (!response.ok) {
    throw new Error(`URL retornou HTTP ${response.status}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  const buffer = Buffer.from(await response.arrayBuffer());

  if (buffer.byteLength > MAX_URL_BYTES) {
    throw new Error(
      `Resposta excede o limite de ${Math.round(MAX_URL_BYTES / 1024 / 1024)}MB`
    );
  }

  if (contentType.includes("application/pdf") || url.toLowerCase().endsWith(".pdf")) {
    // Não extraímos texto aqui — o route faz upload pro Storage e gera
    // signed URL pra Claude ler nativamente. `text` é placeholder pra
    // manter o shape do tipo.
    return {
      text: `[PDF de ${buffer.byteLength} bytes — extração nativa via Claude]`,
      origin: "url-pdf",
      url,
      pdfBuffer: buffer,
    };
  }

  if (contentType.includes("text/html") || contentType.includes("text/plain") || contentType === "") {
    const html = buffer.toString("utf8");
    return { text: stripHtml(html), origin: "url-html", url };
  }

  throw new Error(`Tipo de conteúdo não suportado: ${contentType}`);
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}
