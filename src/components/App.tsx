"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { MAX_LINK, MAX_TEXT, validLink, type Mode } from "../lib/input";
import { responseSchema } from "../lib/schema";
import { demos } from "../lib/demo";
import Icon from "./Icon";
import Upload from "./Upload";
import { NextSteps, RiskResult } from "./Result";

const modes = [
  { id: "message", label: "Mensagem" }, { id: "link", label: "Link" }, { id: "image", label: "Imagem" }
] as const;
const stages = ["Analisar", "Entender o resultado", "O que fazer agora"];
type Result = ReturnType<typeof responseSchema.parse>;
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export default function App({ demoMode, production }: { demoMode: boolean; production: boolean }) {
  const [screen, setScreen] = useState(0);
  const [easy, setEasy] = useState(false);
  const [mode, setMode] = useState<Mode>("message");
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState<{ demo?: string } | null>(null);
  const [offline, setOffline] = useState(false);
  const [install, setInstall] = useState<InstallEvent | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const analysisButton = useRef<HTMLButtonElement>(null);
  const cancellation = useRef<HTMLButtonElement>(null);
  const lastScreen = useRef(0);
  const request = useRef<AbortController | null>(null);

  useEffect(() => {
    try { setEasy(sessionStorage.getItem("golpezero-easy") === "true"); } catch {}
    const connection = () => setOffline(!navigator.onLine);
    const offer = (event: Event) => { event.preventDefault(); setInstall(event as InstallEvent); };
    const installed = () => setInstall(null);
    const abort = () => request.current?.abort();
    connection();
    window.addEventListener("online", connection);
    window.addEventListener("offline", connection);
    window.addEventListener("beforeinstallprompt", offer);
    window.addEventListener("appinstalled", installed);
    window.addEventListener("pagehide", abort);
    if (production && "serviceWorker" in navigator) void navigator.serviceWorker.register("/sw.js").catch(() => {});
    return () => {
      abort();
      window.removeEventListener("online", connection);
      window.removeEventListener("offline", connection);
      window.removeEventListener("beforeinstallprompt", offer);
      window.removeEventListener("appinstalled", installed);
      window.removeEventListener("pagehide", abort);
    };
  }, [production]);

  useEffect(() => {
    if (screen !== lastScreen.current) {
      heading.current?.focus();
      lastScreen.current = screen;
    }
  }, [screen]);

  useEffect(() => { if (busy) cancellation.current?.focus(); }, [busy]);

  function setTab(id: Mode) {
    setMode(id);
    setError("");
    setRetry(null);
  }

  function tabKey(event: KeyboardEvent<HTMLButtonElement>, current: number) {
    const target = { ArrowRight: (current + 1) % 3, ArrowLeft: (current + 2) % 3, Home: 0, End: 2 }[event.key];
    if (target === undefined) return;
    event.preventDefault();
    const id = modes[target].id;
    setTab(id);
    document.getElementById(`tab-${id}`)?.focus();
  }

  function clear() {
    if (mode === "message") setMessage("");
    if (mode === "link") setLink("");
    if (mode === "image") setFile(null);
    setError("");
    setRetry(null);
    const field = document.getElementById(mode === "image" ? "tab-image" : `field-${mode}`);
    field?.focus();
  }

  function restart() {
    setMessage(""); setLink(""); setFile(null); setMode("message"); setResult(null);
    setError(""); setRetry(null); setIndex(0); setScreen(0);
  }

  async function submit(demo?: string) {
    if (request.current) return;
    setError("");
    setRetry(null);
    if (offline) { setError("Você está sem internet. Conecte-se para fazer uma análise."); return; }
    const value = mode === "image" ? file : (mode === "message" ? message : link).trim();
    if (!demo && (!value || (mode === "link" && typeof value === "string" && !validLink(value)))) {
      setError(mode === "image" ? "Escolha uma imagem primeiro." : mode === "link" ? "Cole um link completo que comece com https:// ou http://." : "Digite ou cole uma mensagem primeiro.");
      document.getElementById(`field-${mode}`)?.focus();
      return;
    }
    const form = new FormData();
    form.set("mode", demo ? "demo" : mode);
    form.set("content", demo ?? value ?? "");
    const controller = new AbortController();
    request.current = controller;
    const timeout = AbortSignal.timeout(32_000);
    setBusy(true);
    try {
      const response = await fetch("/api/analyze", { method: "POST", body: form, signal: AbortSignal.any([controller.signal, timeout]), cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (controller.signal.aborted) return;
      if (!response.ok) {
        const fallback = response.status === 413 ? "Envie uma imagem de até 4 MB." : "Não conseguimos analisar agora. Tente novamente em instantes.";
        throw new Error(typeof payload?.error === "string" ? payload.error : fallback);
      }
      const parsed = responseSchema.safeParse(payload);
      if (!parsed.success || parsed.data.demo !== Boolean(demo)) throw new Error("Não recebemos uma resposta completa. Tente novamente.");
      setResult(parsed.data);
      setMessage(""); setLink(""); setFile(null);
      setScreen(1);
    } catch (problem) {
      if (!controller.signal.aborted) {
        setError(timeout.aborted ? "A análise demorou mais que o esperado. Tente novamente." :
          problem instanceof TypeError ? "Não foi possível conectar. Confira sua internet e tente novamente." :
          problem instanceof Error ? problem.message : "Não conseguimos analisar agora.");
        setRetry({ demo });
        analysisButton.current?.focus();
      }
    } finally {
      if (request.current === controller) {
        request.current = null;
        setBusy(false);
      }
    }
  }

  function handleForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit(retry?.demo);
  }

  function cancel() {
    request.current?.abort();
    request.current = null;
    setBusy(false);
    setError("Análise cancelada. Você pode ajustar o conteúdo e tentar de novo.");
    analysisButton.current?.focus();
  }

  return <div className={easy ? "site easy" : "site"}>
    <a className="skip" href="#main">Ir para o conteúdo</a>
    <header className="top">
      <div className="wrap flex items-center justify-between gap-3 top-inner">
        <div className="brand"><img src="/brand/shield.png" width="44" height="44" alt="" /><span>Golpe<span>Zero</span></span></div>
        <button className="mode-toggle" type="button" aria-label="Modo Fácil" aria-pressed={easy} onClick={() => {
          const next = !easy;
          setEasy(next);
          setIndex(0);
          try { sessionStorage.setItem("golpezero-easy", String(next)); } catch {}
        }}><span aria-hidden="true" className="aa">Aa</span><span>Modo Fácil</span><span aria-hidden="true" className="switch" /></button>
      </div>
    </header>
    <main className="wrap main" id="main" tabIndex={-1}>
      <nav aria-label="Etapas da análise">
        <ol className="progress">
          {stages.map((stage, i) => <li key={stage} aria-current={i === screen ? "step" : undefined} className={i < screen ? "done" : ""}>
            <span className="stage-number" aria-hidden="true">{i < screen ? "✓" : i + 1}</span><span>{stage}</span>
          </li>)}
        </ol>
      </nav>
      {offline && <p className="notice" role="status"><Icon name="alert" />Você está sem internet. Conecte-se para fazer uma análise.</p>}
      <div className={screen === 0 && !easy ? "workspace with-aside" : "workspace"}>
        <div className="flow">
          <h1 ref={heading} tabIndex={-1}>{screen === 0 ? "Recebeu uma mensagem suspeita?" : screen === 1 ? "Veja o que encontramos" : "O que fazer agora?"}</h1>
          {screen === 0 && <>
            <p className="intro">{easy ? "Envie a mensagem, o link ou a imagem. Vamos explicar os sinais de risco." : "Cole a mensagem, o link ou envie uma imagem. Vamos ajudar você a entender os sinais de risco."}</p>
            <form className="card form-card" onSubmit={handleForm} noValidate aria-busy={busy}>
              <fieldset disabled={busy}>
                <legend className="field-heading">O que você quer analisar?</legend>
                <div role="tablist" aria-label="Tipo de conteúdo" className="tabs">
                  {modes.map(({ id, label }, i) => <button key={id} id={`tab-${id}`} type="button" role="tab" aria-selected={mode === id} aria-controls={`panel-${id}`} tabIndex={mode === id ? 0 : -1} onKeyDown={event => tabKey(event, i)} onClick={() => setTab(id)}><Icon name={id} />{label}</button>)}
                </div>
                {modes.map(({ id }) => <div key={id} id={`panel-${id}`} role="tabpanel" aria-labelledby={`tab-${id}`} hidden={mode !== id}>
                  {mode === id && (id === "message" ? <>
                    <label htmlFor="field-message">Cole ou digite a mensagem</label>
                    <textarea id="field-message" maxLength={MAX_TEXT} value={message} onChange={event => { setMessage(event.target.value); setError(""); setRetry(null); }} placeholder="Ex.: Sua conta será bloqueada hoje. Clique aqui para regularizar." />
                    {message.length >= MAX_TEXT - 500 && <p className="muted small">{message.length} de {MAX_TEXT} caracteres</p>}
                  </> : id === "link" ? <>
                    <label htmlFor="field-link">Cole o link</label>
                    <input id="field-link" type="url" autoComplete="off" spellCheck={false} autoCapitalize="none" maxLength={MAX_LINK} aria-describedby="link-help" placeholder="https://exemplo.com" value={link} onChange={event => { setLink(event.target.value); setError(""); setRetry(null); }} />
                    <p className="muted small" id="link-help">Vamos ler o endereço sem abrir o site.</p>
                  </> : <Upload file={file} onFile={setFile} report={text => { setError(text); setRetry(null); }} />)}
                </div>)}
                {((mode === "message" && message) || (mode === "link" && link)) && <button type="button" className="text-button clear" onClick={clear}>Limpar {mode === "message" ? "mensagem" : "link"}</button>}
              </fieldset>
              <div className="feedback" role="alert">{error}</div>
              <div>{busy && <p className="loading">Estamos analisando. Isso pode levar alguns segundos.</p>}</div>
              <button ref={analysisButton} aria-disabled={busy || offline} className="primary" type="submit"><Icon name="search" />{retry ? "Tentar novamente" : "Analisar possível golpe"}<Icon name="arrow" /></button>
              {busy && <button ref={cancellation} className="text-button center" type="button" onClick={cancel}>Cancelar análise</button>}
              <p className="privacy-note"><Icon name="lock" size={17} /> <span>Evite enviar senhas, códigos e dados bancários.</span></p>
              {!demoMode && <p className="provider-note">O conteúdo será enviado à OpenAI para análise. <a href="#privacidade" onClick={() => {
                const notice = document.getElementById("privacidade") as HTMLDetailsElement | null;
                if (notice) { notice.open = true; notice.querySelector("summary")?.focus(); }
              }}>Veja como seus dados são usados</a>.</p>}
            </form><div className="sr-only" role="status">{busy ? "Estamos analisando. Isso pode levar alguns segundos." : ""}</div>
            {demoMode && <details className="card demo">
              <summary>Experimentar exemplos</summary>
              <p className="muted small">Demonstração com respostas prontas. A análise de conteúdo próprio ainda não está disponível.</p>
              <ul>
                {demos.map(demo => <li key={demo.id}><button type="button" className="secondary" disabled={busy || offline} onClick={() => void submit(demo.id)}>{demo.label}</button><span>{demo.sample}</span></li>)}
              </ul>
            </details>}
          </>}
          {screen === 1 && result && <RiskResult data={result.analysis} demo={result.demo} easy={easy} guide={() => { setIndex(0); setScreen(2); }} restart={restart} />}
          {screen === 2 && result && <NextSteps data={result.analysis} demo={result.demo} easy={easy} index={index} setIndex={setIndex} back={() => setScreen(1)} restart={restart} />}
        </div>
        {screen === 0 && !easy && <aside className="side">
          <div className="card side-card">
            <div className="side-icon"><Icon name="shield" size={30} /></div>
            <h2>Entenda os sinais de risco e saiba o que fazer agora.</h2>
            <p>Veja o que chamou atenção e encontre um próximo passo seguro.</p>
            <div className="divider" />
            <div className="side-row"><Icon name="link" /><div><strong>Links ficam fechados</strong><p>Lemos somente o endereço.</p></div></div>
            <div className="side-row"><Icon name="sound" /><div><strong>Ouça se preferir</strong><p>O resultado e as orientações podem ser lidos em voz alta.</p></div></div>
          </div>
        </aside>}
      </div>
    </main>
    <footer className="wrap bottom">
      <details id="privacidade" className="privacy">
        <summary><Icon name="lock" size={18} /> Privacidade</summary>
        <p>Na análise real, enviamos o conteúdo que você escolheu à OpenAI, que processa a mensagem, o endereço ou a imagem. O GolpeZero não tem conta nem histórico de análises. O provedor pode manter dados conforme suas regras de uso. Se possível, esconda CPF, senhas, códigos e dados bancários antes de enviar.</p>
      </details>
      {install && <button className="secondary" type="button" onClick={async () => {
        try { await install.prompt(); await install.userChoice; } finally { setInstall(null); }
      }}>Instalar GolpeZero</button>}
    </footer>
  </div>;
}
