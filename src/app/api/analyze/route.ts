import { analyze, ProviderError } from "../../../lib/ai";
import { demos } from "../../../lib/demo";
import { prepareImage } from "../../../lib/image";
import { MAX_IMAGE, MAX_LINK, MAX_TEXT, validLink } from "../../../lib/input";

export const runtime = "nodejs";
export const maxDuration = 30;

const headers = { "Cache-Control": "no-store" };
const fail = (error: string, status = 400, extra = {}) => Response.json({ error }, { status, headers: { ...headers, ...extra } });
const quota = new Map<string, { count: number; until: number }>();
const windowMs = 60_000;
function allow(request: Request) {
  const now = Date.now();
  for (const [key, item] of quota) if (item.until <= now) quota.delete(key);
  const key = process.env.VERCEL ? request.headers.get("x-vercel-forwarded-for")?.split(",")[0].trim() || "unknown" : "local";
  const item = quota.get(key);
  if (item) return ++item.count <= 12;
  if (quota.size >= 2048) return false;
  quota.set(key, { count: 1, until: now + windowMs });
  return true;
}

const bodyLimit = MAX_IMAGE + 16_384;
async function readForm(request: Request) {
  const type = request.headers.get("content-type") ?? "";
  if (!type.startsWith("multipart/form-data;")) return null;
  if (Number(request.headers.get("content-length")) > bodyLimit) return false;
  const reader = request.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > bodyLimit) {
        void reader.cancel().catch(() => {});
        return false;
      }
      chunks.push(new Uint8Array(value));
    }
    return await new Response(new Blob(chunks), { headers: { "Content-Type": type } }).formData();
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}

export async function POST(request: Request) {
  if (request.headers.get("sec-fetch-site") === "cross-site") return fail("Abra o GolpeZero e tente novamente.", 403);
  if (!allow(request)) return fail("Muitas análises seguidas. Espere um minuto e tente de novo.", 429, { "Retry-After": "60" });
  const form = await readForm(request);
  if (form === false) return fail("Envie uma imagem de até 4 MB.", 413);
  if (!form) return fail("Não foi possível ler o envio. Tente novamente.");
  if (form.getAll("mode").length !== 1 || form.getAll("content").length !== 1 || [...form.keys()].length !== 2) {
    return fail("Escolha uma mensagem, um link ou uma imagem.");
  }
  const mode = form.get("mode");
  const content = form.get("content");
  const key = process.env.OPENAI_API_KEY?.trim();
  if (mode === "demo") {
    if (key) return fail("Use o formulário para analisar seu conteúdo.", 409);
    const sample = demos.find(item => item.id === content);
    return sample ? Response.json({ analysis: sample.analysis, demo: true }, { headers }) : fail("Escolha um exemplo da lista.");
  }
  let input: Parameters<typeof analyze>[0];
  if (mode === "message" || mode === "link") {
    if (typeof content !== "string") return fail("Digite ou cole o conteúdo.");
    const value = content.trim();
    if (mode === "message" && (!value || content.length > MAX_TEXT)) return fail("Digite uma mensagem de até 5.000 caracteres.");
    if (mode === "link" && (content.length > MAX_LINK || !validLink(value))) return fail("Cole um link completo que comece com https:// ou http://.");
    input = { mode, value };
  } else if (mode === "image" && content instanceof File) {
    try {
      input = { mode, image: await prepareImage(content) };
    } catch (error) {
      return fail(error instanceof Error ? error.message : "Escolha outra imagem.");
    }
  } else {
    return fail("Escolha uma mensagem, um link ou uma imagem.");
  }
  if (!key) return fail("A análise com inteligência artificial ainda não está disponível. Experimente um exemplo da demonstração.", 503);
  try {
    const analysis = await analyze(input, key, request.signal);
    return Response.json({ analysis, demo: false }, { headers });
  } catch (error) {
    const status = error instanceof ProviderError ? error.status : 503;
    const messages = {
      429: "O serviço está ocupado. Espere um minuto e tente de novo.",
      502: "Não recebemos uma resposta completa. Tente novamente.",
      503: "Não conseguimos analisar agora. Tente novamente em instantes.",
      504: "A análise demorou mais que o esperado. Tente novamente."
    };
    return fail(messages[status], status, status === 429 ? { "Retry-After": "60" } : {});
  }
}
