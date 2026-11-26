import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { analyze } from "../../src/lib/ai.ts";
import { demos } from "../../src/lib/demo.ts";
import { safeSteps } from "../../src/lib/guidance.ts";
import { prepareImage } from "../../src/lib/image.ts";
import { imageError, MAX_IMAGE, validLink } from "../../src/lib/input.ts";
import { analysisSchema } from "../../src/lib/schema.ts";

const sample = demos[0].analysis;
const message = { mode: "message", value: "Mensagem de teste." } as const;
const signal = new AbortController().signal;
const reply = (content: string) => Response.json({ choices: [{ finish_reason: "stop", message: { content } }] });

test("valida endereços HTTP e HTTPS sem buscar o destino", () => {
  for (const link of ["https://exemplo.com", "http://exemplo.com/?a=1"]) assert.equal(validLink(link), true);
  for (const link of ["exemplo.com", "file:///x", "https://", "https:///foo", "https://a b", "https://a:b@c.com", "https://a\\b"]) assert.equal(validLink(link), false);
});

test("rejeita imagens vazias, tipos inválidos e excesso de tamanho", () => {
  assert.ok(imageError({ size: 1, type: "image/gif" }));
  assert.ok(imageError({ size: MAX_IMAGE + 1, type: "image/png" }));
  assert.ok(imageError({ size: 0, type: "image/png" }));
  assert.equal(imageError({ size: 1, type: "image/png" }), "");
});

test("decodifica um print e rejeita tipo falsificado e excesso de pixels", async () => {
  const raw = await readFile(new URL("../fixtures/print.png", import.meta.url));
  const image = await prepareImage(new File([raw], "print.png", { type: "image/png" }));
  assert.equal((await sharp(image).metadata()).format, "jpeg");
  await assert.rejects(prepareImage(new File([raw], "print.webp", { type: "image/webp" })));
  await assert.rejects(prepareImage(new File(["not an image"], "print.png", { type: "image/png" })));
  const large = await sharp({ create: { width: 5000, height: 4100, channels: 3, background: "white" } }).png().toBuffer();
  await assert.rejects(prepareImage(new File([large], "large.png", { type: "image/png" })));
});

test("aceita os quatro exemplos e rejeita campos e ações fora do contrato", () => {
  for (const demo of demos) assert.equal(analysisSchema.safeParse(demo.analysis).success, true);
  for (const invalid of [{ ...sample, score: 87 }, { ...sample, risk: "certificado" }, { ...sample, summary: "a".repeat(241) }, { ...sample, signals: ["x\u202e"] }, { ...sample, next_steps: ["Pague a taxa"] }, { ...sample, next_steps: [] }, { risk: "alto" }]) {
    assert.equal(analysisSchema.safeParse(invalid).success, false);
  }
  assert.match(safeSteps(["no_click", "bank", "bank"])[0], /seu banco/);
  assert.equal(safeSteps(["no_click", "bank", "bank"]).length, 2);
});

test("envia as três modalidades somente para o endpoint fixo", async () => {
  for (const mode of ["message", "link", "image"] as const) {
    const input = mode === "image" ? { mode, image: Buffer.from("synthetic") } : { mode, value: "https://exemplo.invalid" };
    const result = await analyze(input, "test-secret", signal, async (url, init) => {
      assert.equal(url, "https://api.openai.com/v1/chat/completions");
      assert.equal(init?.redirect, "error");
      const body = JSON.parse(String(init?.body));
      assert.equal(body.store, false);
      assert.equal(body.response_format.json_schema.strict, true);
      assert.equal(body.messages[1].content[0].type, "text");
      assert.equal(body.messages[1].content[1]?.type, mode === "image" ? "image_url" : undefined);
      assert.equal(body.tools, undefined);
      return reply(JSON.stringify(sample));
    });
    assert.deepEqual(result, sample);
  }
});

test("limita retentativas e trata indisponibilidade e limite do provedor", async () => {
  let calls = 0;
  await assert.rejects(analyze(message, "test-secret", signal, async () => {
    calls++;
    return new Response(null, { status: 503 });
  }), { status: 503 });
  assert.equal(calls, 2);
  await assert.rejects(analyze(message, "test-secret", signal, async () => new Response(null, { status: 429 })), { status: 429 });
  await assert.rejects(analyze(message, "test-secret", signal, async () => { throw new TypeError("network"); }), { status: 503 });
});

test("trata cancelamento, timeout e JSON inválido ou incompleto", async () => {
  await assert.rejects(analyze(message, "test-secret", AbortSignal.abort(), async (_url, init) => {
    init?.signal?.throwIfAborted();
    return reply(JSON.stringify(sample));
  }), { status: 504 });
  const timeout = AbortSignal.timeout;
  AbortSignal.timeout = () => AbortSignal.abort(new DOMException("Timeout", "TimeoutError"));
  try {
    await assert.rejects(analyze(message, "test-secret", signal, async (_url, init) => {
      init?.signal?.throwIfAborted();
      return reply(JSON.stringify(sample));
    }), { status: 504 });
  } finally {
    AbortSignal.timeout = timeout;
  }
  for (const invalid of ["{", "{}", JSON.stringify({ ...sample, extra: true })]) {
    await assert.rejects(analyze(message, "test-secret", signal, async () => reply(invalid)), { status: 502 });
  }
});
