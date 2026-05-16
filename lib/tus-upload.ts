// Resumable upload pro Supabase Storage usando o protocolo TUS.
// O endpoint `/storage/v1/upload/resumable` aceita uploads chunked,
// contornando o limite de ~6MB que afeta uploads "standard" (POST único)
// no proxy/gateway do Supabase.
//
// Refs:
//   https://supabase.com/docs/guides/storage/uploads/resumable-uploads
//   https://tus.io/protocols/resumable-upload.html (v1.0.0)

type TusUploadArgs = {
  file: File | Blob;
  path: string;
  bucket: string;
  projectUrl: string;
  accessToken: string;
  apiKey: string;
  contentType?: string;
  chunkSize?: number;
  onProgress?: (sent: number, total: number) => void;
};

const TUS_VERSION = "1.0.0";
const DEFAULT_CHUNK_SIZE = 6 * 1024 * 1024; // 6 MB

function b64utf8(input: string): string {
  // btoa só aceita Latin-1. Para preservar UTF-8 (chars do path),
  // codificamos via TextEncoder primeiro.
  const bytes = new TextEncoder().encode(input);
  let bin = "";
  bytes.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  return btoa(bin);
}

function encodeMetadata(meta: Record<string, string>): string {
  return Object.entries(meta)
    .map(([k, v]) => `${k} ${b64utf8(v)}`)
    .join(",");
}

export async function tusResumableUpload({
  file,
  path,
  bucket,
  projectUrl,
  accessToken,
  apiKey,
  contentType,
  chunkSize = DEFAULT_CHUNK_SIZE,
  onProgress,
}: TusUploadArgs): Promise<void> {
  const endpoint = `${projectUrl.replace(/\/$/, "")}/storage/v1/upload/resumable`;
  const mime = contentType ?? (file as File).type ?? "application/octet-stream";

  // O gateway do Supabase (Kong) exige `apikey` em todas as requests pra
  // rotear corretamente o projeto. Sem ele, o JWT no Bearer pode não ser
  // decodificado e `auth.uid()` retorna null no Postgres → RLS nega.
  const authHeaders = {
    Authorization: `Bearer ${accessToken}`,
    apikey: apiKey,
  };

  // 1) CREATE — anuncia tamanho + metadata, recebe Location.
  const createRes = await fetch(endpoint, {
    method: "POST",
    headers: {
      ...authHeaders,
      "Tus-Resumable": TUS_VERSION,
      "Upload-Length": String(file.size),
      "Upload-Metadata": encodeMetadata({
        bucketName: bucket,
        objectName: path,
        contentType: mime,
        cacheControl: "3600",
      }),
      "x-upsert": "false",
    },
  });

  if (createRes.status !== 201) {
    const body = await safeReadText(createRes);
    throw new Error(
      `TUS create falhou (HTTP ${createRes.status}): ${body.slice(0, 240)}`
    );
  }

  const uploadUrl = createRes.headers.get("Location");
  if (!uploadUrl) {
    throw new Error("TUS create sem header Location");
  }

  // Location pode vir relativo — resolve contra a origem do projeto.
  const resolvedUploadUrl = uploadUrl.startsWith("http")
    ? uploadUrl
    : new URL(uploadUrl, projectUrl).toString();

  // 2) PATCH — manda os chunks sequencialmente.
  let offset = 0;
  while (offset < file.size) {
    const end = Math.min(offset + chunkSize, file.size);
    const chunk = file.slice(offset, end);

    const patchRes = await fetch(resolvedUploadUrl, {
      method: "PATCH",
      headers: {
        ...authHeaders,
        "Tus-Resumable": TUS_VERSION,
        "Upload-Offset": String(offset),
        "Content-Type": "application/offset+octet-stream",
      },
      body: chunk,
    });

    if (patchRes.status !== 204) {
      const body = await safeReadText(patchRes);
      throw new Error(
        `TUS patch falhou em offset=${offset} (HTTP ${patchRes.status}): ${body.slice(0, 240)}`
      );
    }

    const nextOffsetHeader = patchRes.headers.get("Upload-Offset");
    const nextOffset = nextOffsetHeader ? Number(nextOffsetHeader) : end;
    if (!Number.isFinite(nextOffset) || nextOffset <= offset) {
      throw new Error(`TUS Upload-Offset inválido: "${nextOffsetHeader}"`);
    }
    offset = nextOffset;
    onProgress?.(offset, file.size);
  }
}

async function safeReadText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "<sem corpo>";
  }
}
