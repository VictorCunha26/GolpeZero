import { safeSteps } from "../lib/guidance";
import type { Analysis } from "../lib/schema";
import Icon from "./Icon";
import Speech from "./Speech";

const riskLabels = { baixo: "RISCO BAIXO", atencao: "ATENÇÃO", alto: "RISCO ALTO" };
const uncertainty = "Esta análise não confirma com certeza se é golpe.";

export function RiskResult({ data, demo, easy, guide, restart }: { data: Analysis; demo: boolean; easy: boolean; guide: () => void; restart: () => void }) {
  const spoken = [riskLabels[data.risk], data.summary, ...data.signals, ...(easy ? [] : [data.explanation]), uncertainty].join(" ");
  return <div className="card result-card">
    {demo && <p className="demo-label">Resultado de demonstração</p>}
    <span className={`risk ${data.risk}`}><Icon name={data.risk === "baixo" ? "shield" : "alert"} />{riskLabels[data.risk]}</span>
    <p className="result-summary">{data.summary}</p>
    <div className="divider" />
    <h2>Por que apareceu esse resultado?</h2>
    {data.signals.length > 0 ? <ul className="signals">{data.signals.map((signal, i) => <li key={i}>{signal}</li>)}</ul> : <p>Nenhum sinal claro foi identificado no conteúdo enviado.</p>}
    {!easy && <p className="muted">{data.explanation}</p>}
    <p className="notice"><Icon name="shield" /><span>{uncertainty}</span></p>
    <Speech key={String(easy)} label="Ouvir resultado" text={demo ? "Resultado de demonstração. " + spoken : spoken} />
    <button className="primary" type="button" onClick={guide}>O que fazer agora? <Icon name="arrow" /></button>
    <button className="text-button center" type="button" onClick={restart}>Analisar outro conteúdo</button>
  </div>;
}

export function NextSteps({ data, easy, index, setIndex, back, restart, demo }: {
  data: Analysis; easy: boolean; index: number; setIndex: (index: number) => void;
  back: () => void; restart: () => void; demo: boolean;
}) {
  const steps = safeSteps(data.next_steps);
  const shown = easy ? [[steps[index], index] as const] : steps.map((step, i) => [step, i] as const);
  return <div className="card result-card">
    {demo && <p className="demo-label">Orientações de demonstração</p>}
    {easy && <p className="muted small" aria-live="polite">Passo {index + 1} de {steps.length}<span className="sr-only">. {steps[index]}</span></p>}
    <ol className="step-list" aria-label="Orientações">
      {shown.map(([step, i]) => <li key={i} value={i + 1}><span aria-hidden="true">{i + 1}</span><p>{step}</p></li>)}
    </ol>
    {easy && steps.length > 1 && <div className="actions">
      <button type="button" className="secondary" aria-disabled={index === 0} onClick={() => { if (index > 0) setIndex(index - 1); }}>Passo anterior</button>
      <button type="button" className="secondary" aria-disabled={index === steps.length - 1} onClick={() => { if (index < steps.length - 1) setIndex(index + 1); }}>Próximo passo</button>
    </div>}
    <Speech key={easy ? index : "all"} label="Ouvir orientações" text={(demo ? "Orientações de demonstração. " : "") + shown.map(([step, i]) => `Passo ${i + 1}. ${step}`).join(" ")} />
    <button className="primary" type="button" onClick={restart}>Fazer outra análise <Icon name="arrow" /></button>
    <button className="text-button center" type="button" onClick={back}>Voltar ao resultado</button>
  </div>;
}
