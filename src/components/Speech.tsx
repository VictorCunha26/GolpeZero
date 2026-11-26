"use client";
import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";

export default function Speech({ text, label }: { text: string; label: string }) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [state, setState] = useState<"idle" | "playing" | "paused">("idle");
  const [error, setError] = useState(false);
  const current = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    setSupported("speechSynthesis" in window && "SpeechSynthesisUtterance" in window);
    return () => { if (current.current) { current.current = null; window.speechSynthesis.cancel(); } };
  }, []);

  function stop() {
    current.current = null;
    window.speechSynthesis.cancel();
    setState("idle");
  }

  function play() {
    setError(false);
    const voice = new SpeechSynthesisUtterance(text);
    voice.lang = "pt-BR";
    voice.rate = 0.93;
    voice.voice = speechSynthesis.getVoices().find(item => item.lang.toLowerCase() === "pt-br") ?? null;
    current.current = voice;
    voice.onend = () => { if (current.current === voice) stop(); };
    voice.onerror = () => {
      if (current.current === voice) { stop(); setError(true); }
    };
    setState("playing");
    try { speechSynthesis.speak(voice); }
    catch { stop(); setError(true); }
  }

  return <div className="speech">
    {supported === false && <p className="muted small">A leitura em voz alta não está disponível neste navegador.</p>}
    {supported && <div className="actions">
      <button className="secondary" type="button" onClick={() => {
        if (state === "playing") { speechSynthesis.pause(); setState("paused"); }
        else if (state === "paused") { speechSynthesis.resume(); setState("playing"); }
        else play();
      }}><Icon name="sound" />{state === "playing" ? "Pausar áudio" : state === "paused" ? "Continuar áudio" : label}</button>
      {state !== "idle" && <button className="text-button" type="button" onClick={event => {
        const playButton = event.currentTarget.previousElementSibling;
        stop();
        if (playButton instanceof HTMLElement) playButton.focus();
      }}>Parar áudio</button>}
    </div>}
    {error && <p role="alert" className="muted small">Não foi possível reproduzir o áudio. Você pode ler as orientações na tela.</p>}
  </div>;
}
