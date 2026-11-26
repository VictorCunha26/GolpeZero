import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import { createRequire } from "node:module";
import { chromium } from "playwright";

const require = createRequire(import.meta.url);
const axe = require.resolve("axe-core/axe.min.js");
const base = process.env.TEST_BASE_URL || "http://localhost:3077";

let browser, server;
const synthetic = { risk: "atencao", summary: "Há um pedido para agir hoje.", signals: ["A mensagem pede um clique."], explanation: "Confirme a origem.", next_steps: ["no_click", "official"] };
const fixture = new URL("../fixtures/print.png", import.meta.url);
const visible = async locator => { await locator.waitFor({ state: "visible", timeout: 7000 }); };
const button = (page, name) => page.getByRole("button", { name, exact: true });

before(async () => {
  if (!process.env.TEST_BASE_URL) {
    server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", "3077"], {
      env: { ...process.env, OPENAI_API_KEY: "", NEXT_TELEMETRY_DISABLED: "1" }, stdio: "ignore"
    });
  }
  for (let i = 0; i < 100; i++) {
    if (await fetch(base).then(result => result.ok).catch(() => false)) break;
    if (i === 99) throw new Error("Servidor indisponível. Execute npm run build primeiro.");
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  const defaultEdge = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
  const executablePath = process.env.TEST_BROWSER_EXECUTABLE ||
    (process.platform === "win32" && await access(defaultEdge).then(() => true).catch(() => false) ? defaultEdge : undefined);
  browser = await chromium.launch({ executablePath });
});

after(async () => { await browser?.close(); server?.kill(); });

async function pageFor(options, run) {
  const context = await browser.newContext(options);
  try {
    const page = await context.newPage();
    await run(page, context);
  } finally {
    await context.close();
  }
}

async function demo(page, name) {
  if (!await page.locator(".demo").evaluate(node => node.open)) await page.getByText("Experimentar exemplos", { exact: true }).click();
  await button(page, name).click();
  await visible(page.getByRole("heading", { name: "Veja o que encontramos" }));
}

test("quatro demonstrações, três riscos, foco, orientação e reinício", () => pageFor({}, async page => {
  await page.goto(base);
  for (const [name, risk] of [["Pedido de Pix", "RISCO ALTO"], ["Aviso de bloqueio", "ATENÇÃO"], ["Prêmio com taxa", "RISCO ALTO"], ["Lembrete comum", "RISCO BAIXO"]]) {
    await demo(page, name);
    await visible(page.getByText(risk, { exact: true }));
    await visible(page.getByText("Resultado de demonstração", { exact: true }));
    await visible(page.getByText("Esta análise não confirma com certeza se é golpe.", { exact: true }));
    assert.equal(await page.locator(":focus").textContent(), "Veja o que encontramos");
    await button(page, "O que fazer agora?").click();
    assert.equal(await page.locator(":focus").textContent(), "O que fazer agora?");
    assert.ok(await page.locator(".step-list li").count() >= 1);
    await button(page, "Voltar ao resultado").click();
    await visible(page.getByRole("heading", { name: "Veja o que encontramos" }));
    await button(page, "Analisar outro conteúdo").click();
  }
}));

test("teclado, campos, URL inválida e validação e prévia de imagem", () => pageFor({}, async page => {
  await page.goto(base);
  await page.keyboard.press("Tab");
  assert.equal(await page.locator(":focus").textContent(), "Ir para o conteúdo");
  await button(page, "Analisar possível golpe").click();
  await visible(page.getByText("Digite ou cole uma mensagem primeiro."));
  await page.getByRole("tab", { name: "Mensagem" }).focus();
  await page.keyboard.press("ArrowRight");
  assert.equal(await page.locator(":focus").textContent(), "Link");
  await page.keyboard.press("Tab");
  assert.equal(await page.locator(":focus").getAttribute("id"), "field-link");
  await page.getByLabel("Cole o link", { exact: true }).fill("example.com");
  await button(page, "Analisar possível golpe").click();
  await visible(page.getByText("Cole um link completo que comece com https:// ou http://."));
  await page.getByRole("tab", { name: "Imagem" }).click();
  const picker = page.locator('input[type="file"]');
  await picker.setInputFiles({ name: "file.txt", mimeType: "text/plain", buffer: Buffer.from("test") });
  await visible(page.getByText("Escolha uma imagem JPG, PNG ou WebP."));
  await picker.setInputFiles({ name: "large.png", mimeType: "image/png", buffer: Buffer.alloc(4 * 1024 * 1024 + 1) });
  await visible(page.getByText("A imagem passa de 4 MB. Escolha uma menor."));
  await picker.setInputFiles(decodeURIComponent(fixture.pathname).replace(/^\/([A-Za-z]:\/)/, "$1"));
  await visible(page.getByAltText("Prévia da imagem escolhida"));
  await button(page, "Remover imagem").click();
  assert.equal(await page.getByAltText("Prévia da imagem escolhida").count(), 0);
  await visible(button(page, "Enviar imagem"));
}));

test("toque, 320 px, modo fácil persistente e auditoria axe nas três telas", () => pageFor({ viewport: { width: 320, height: 800 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2, reducedMotion: "reduce" }, async page => {
  await page.goto(base);
  await button(page, "Modo Fácil").tap();
  const overflow = async () => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  const audit = async () => {
    if (!await page.evaluate(() => !!window.axe)) await page.addScriptTag({ path: axe });
    const violations = await page.evaluate(async () => (await window.axe.run({ runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] } })).violations);
    assert.deepEqual(violations.map(issue => ({ id: issue.id, nodes: issue.nodes.map(node => node.target) })), []);
    await overflow();
  };
  await audit();
  await demo(page, "Pedido de Pix");
  await audit();
  await button(page, "O que fazer agora?").tap();
  await visible(page.locator("[aria-live=polite]").filter({ hasText: "Passo 1 de 2" }));
  assert.equal(await page.locator(".step-list li").count(), 1);
  await button(page, "Próximo passo").tap();
  assert.equal(await page.locator(".step-list li").getAttribute("value"), "2");
  await audit();
  await page.reload();
  assert.equal(await button(page, "Modo Fácil").getAttribute("aria-pressed"), "true");
  await overflow();
}));

test("áudio não toca sozinho, pode pausar, continuar e parar", () => pageFor({}, async page => {
  await page.addInitScript(() => {
    window.audioEvents = [];
    Object.defineProperty(window, "speechSynthesis", { value: {
      getVoices: () => [], speak: voice => window.audioEvents.push(voice.lang),
      pause: () => window.audioEvents.push("pause"), resume: () => window.audioEvents.push("resume"),
      cancel: () => window.audioEvents.push("stop")
    }});
  });
  await page.goto(base);
  await demo(page, "Lembrete comum");
  assert.deepEqual(await page.evaluate(() => window.audioEvents), []);
  await button(page, "Ouvir resultado").click();
  await button(page, "Pausar áudio").click();
  await button(page, "Continuar áudio").click();
  await button(page, "Parar áudio").click();
  assert.deepEqual(await page.evaluate(() => window.audioEvents), ["pt-BR", "pause", "resume", "stop"]);
}));

test("erro, nova tentativa, cancelamento, rede e ausência de voz", () => pageFor({ serviceWorkers: "block" }, async page => {
  await page.addInitScript(() => { delete window.SpeechSynthesisUtterance; });
  let attempt = 0;
  await page.route("**/api/analyze", async route => {
    attempt++;
    if (attempt === 1) return route.fulfill({ status: 504, json: { error: "A análise demorou mais que o esperado. Tente novamente." } });
    if (attempt === 2) return route.abort("failed");
    if (attempt === 3) return route.fulfill({ status: 200, json: { malformed: true } });
    if (attempt === 4) { await new Promise(resolve => setTimeout(resolve, 750)); return route.fulfill({ status: 503 }).catch(() => {}); }
    return route.fulfill({ json: { analysis: synthetic, demo: false } });
  });
  await page.goto(base);
  await page.getByLabel("Cole ou digite a mensagem").fill("Exemplo para revisão.");
  await button(page, "Analisar possível golpe").click();
  await visible(page.getByText("A análise demorou mais que o esperado. Tente novamente."));
  await button(page, "Tentar novamente").click();
  await visible(page.getByText("Não foi possível conectar. Confira sua internet e tente novamente."));
  await button(page, "Tentar novamente").click();
  await visible(page.getByText("Não recebemos uma resposta completa. Tente novamente."));
  await button(page, "Tentar novamente").click();
  await visible(page.locator(".loading").filter({ hasText: "Estamos analisando." }));
  await button(page, "Cancelar análise").click();
  await visible(page.getByText("Análise cancelada. Você pode ajustar o conteúdo e tentar de novo."));
  await button(page, "Analisar possível golpe").click();
  await visible(page.getByText("A leitura em voz alta não está disponível neste navegador."));
}));

test("manifesto, instalação e navegação offline sem resultado salvo", () => pageFor({}, async (page, context) => {
  await page.addInitScript(() => window.addEventListener("DOMContentLoaded", () => {
    window.offerInstall = () => {
      const event = new Event("beforeinstallprompt", { cancelable: true });
      event.prompt = async () => { window.didPrompt = true; };
      event.userChoice = Promise.resolve({ outcome: "accepted" });
      window.dispatchEvent(event);
    };
  }));
  await page.goto(base);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => navigator.serviceWorker.controller);
  await page.evaluate(() => window.offerInstall());
  await button(page, "Instalar GolpeZero").click();
  assert.equal(await page.evaluate(() => window.didPrompt), true);
  const manifest = await (await context.request.get(base + "/manifest.webmanifest")).json();
  assert.equal(manifest.display, "standalone");
  for (const icon of manifest.icons) assert.equal((await context.request.get(base + icon.src)).ok(), true);
  await context.setOffline(true);
  await visible(page.getByText("Você está sem internet. Conecte-se para fazer uma análise."));
  await page.reload();
  await visible(page.getByRole("heading", { name: "Você está sem internet" }));
  assert.deepEqual(await page.evaluate(async () => (await (await caches.open("golpezero-offline-v1")).keys()).map(item => new URL(item.url).pathname)), ["/offline.html"]);
}));

test("endpoint real valida entradas e não inventa resultado sem chave", async () => {
  const check = async (mode, content, status) => {
    const form = new FormData();
    form.set("mode", mode);
    form.set("content", content);
    const response = await fetch(base + "/api/analyze", { method: "POST", body: form });

    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(response.status, status);
    const data = await response.json();
    assert.equal(typeof data.error, "string");
    assert.equal(data.analysis, undefined);
  };
  await check("message", "", 400);
  await check("link", "ftp://invalid.example", 400);
  await check("image", new File(["text"], "false.png", { type: "image/png" }), 400);
  await check("image", new File([await (await import("node:fs/promises")).readFile(fixture)], "print.png", { type: "image/png" }), 503);
  await check("link", "https://exemplo.invalid", 503);
  await check("message", "Olá, tudo bem?", 503);
});


test("refluxo com ampliação de 200% e nomes na árvore de acessibilidade", () => pageFor({ viewport: { width: 640, height: 900 } }, async page => {
  await page.goto(base);
  await page.evaluate(() => { document.documentElement.style.zoom = "200%"; });
  await button(page, "Modo Fácil").click();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
  assert.equal(await page.getByRole("tab", { name: "Mensagem" }).getAttribute("aria-selected"), "true");
  const tree = await page.locator("main").ariaSnapshot();
  assert.match(tree, /heading "Recebeu uma mensagem suspeita\?"/);
  assert.match(tree, /textbox "Cole ou digite a mensagem"/);
  assert.match(tree, /button "Analisar possível golpe"/);
}));

test("envia mensagem, URL como texto e print pelo formulário", () => pageFor({ serviceWorkers: "block" }, async (page, context) => {
  const calls = [];
  await context.route("**/*", route => {
    const request = route.request();
    if (request.url() !== base + "/api/analyze") {
      assert.equal(new URL(request.url()).origin, base);
      return route.continue();
    }
    calls.push(request.postData());
    return route.fulfill({ json: { analysis: synthetic, demo: false } });
  });
  await page.goto(base);
  await page.getByLabel("Cole ou digite a mensagem").fill("Mensagem sintética.");
  await button(page, "Analisar possível golpe").click();
  await visible(page.getByRole("heading", { name: "Veja o que encontramos" }));
  assert.match(calls[0], /name="mode"\r\n\r\nmessage/);
  assert.match(calls[0], /Mensagem sintética/);
  await button(page, "Analisar outro conteúdo").click();
  await page.getByRole("tab", { name: "Link" }).click();
  await page.getByLabel("Cole o link", { exact: true }).fill("https://exemplo.invalid/revisar");
  await button(page, "Analisar possível golpe").click();
  await visible(page.getByRole("heading", { name: "Veja o que encontramos" }));
  assert.match(calls[1], /name="mode"\r\n\r\nlink/);
  assert.match(calls[1], /https:\/\/exemplo\.invalid\/revisar/);
  await button(page, "Analisar outro conteúdo").click();
  await page.getByRole("tab", { name: "Imagem" }).click();
  await page.locator('input[type="file"]').setInputFiles(decodeURIComponent(fixture.pathname).replace(/^\/([A-Za-z]:\/)/, "$1"));
  await visible(page.getByAltText("Prévia da imagem escolhida"));
  await button(page, "Analisar possível golpe").click();
  await visible(page.getByRole("heading", { name: "Veja o que encontramos" }));
  assert.match(calls[2], /name="mode"\r\n\r\nimage/);
  assert.match(calls[2], /filename="print\.png"/);
}));
