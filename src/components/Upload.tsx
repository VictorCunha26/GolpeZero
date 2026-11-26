"use client";
import { useEffect, useRef, useState } from "react";
import { imageError, imageTypes } from "../lib/input";
import Icon from "./Icon";

export default function Upload({ file, onFile, report }: { file: File | null; onFile: (file: File | null) => void; report: (message: string) => void }) {
  const [preview, setPreview] = useState("");
  const picker = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return <div className="upload">
    <input ref={picker} hidden type="file" accept={Object.keys(imageTypes).join(",")} onChange={event => {
      const next = event.target.files?.[0];
      event.target.value = "";
      if (!next) return;
      const error = imageError(next);
      report(error);
      if (!error) onFile(next);
    }} />
    {file && preview && <img className="preview" src={preview} alt="Prévia da imagem escolhida" onError={() => {
      onFile(null);
      report("Não foi possível abrir a prévia. Escolha outra imagem.");
    }} />}
    <p className="muted small" role="status">{file ? `Imagem escolhida: ${file.name}` : ""}</p>
    <div className="actions">
      <button ref={trigger} className="secondary" type="button" onClick={() => picker.current?.click()} aria-describedby="upload-help"><Icon name="upload" />{file ? "Trocar imagem" : "Enviar imagem"}</button>
      {file && <button className="text-button" type="button" onClick={() => { onFile(null); report(""); trigger.current?.focus(); }}>Remover imagem</button>}
    </div>
    <p className="muted small" id="upload-help">JPG, PNG ou WebP, até 4 MB. Se possível, esconda CPF, senhas, códigos e dados bancários.</p>
  </div>;
}
