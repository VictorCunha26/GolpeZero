import type { Analysis } from "./schema.ts";

type Demo = { id: string; label: string; sample: string; analysis: Analysis };
export const demos: Demo[] = [
  { id: "pix", label: "Pedido de Pix", sample: "Mãe, troquei de número. Faz um PIX pra mim?", analysis: {
    risk: "alto", summary: "A mensagem diz ser de alguém da família e já pede dinheiro.",
    signals: ["A pessoa diz que trocou de número.", "O pedido de Pix aparece sem confirmação de quem enviou."],
    explanation: "Quem enviou pode estar se passando por um familiar.",
    next_steps: ["no_pay", "known_contact"]
  }},
  { id: "bloqueio", label: "Aviso de bloqueio", sample: "Sua conta será bloqueada hoje. Clique aqui para regularizar.", analysis: {
    risk: "atencao", summary: "A mensagem pressiona você a agir hoje.",
    signals: ["A mensagem ameaça bloquear a conta hoje.", "O texto pede um clique sem identificar a empresa."],
    explanation: "A pressa pode fazer você clicar antes de confirmar a informação.",
    next_steps: ["no_click", "official"]
  }},
  { id: "premio", label: "Prêmio com taxa", sample: "Você ganhou R$ 5.000. Pague R$ 20 para liberar o prêmio.", analysis: {
    risk: "alto", summary: "A mensagem pede um pagamento para liberar um prêmio.",
    signals: ["Promete R$ 5.000.", "Pede R$ 20 antes de liberar o dinheiro."],
    explanation: "Cobrar adiantado por um prêmio é um sinal de risco.",
    next_steps: ["no_pay", "no_codes"]
  }},
  { id: "lembrete", label: "Lembrete comum", sample: "Oi! Nosso almoço de domingo continua às 12h. Até lá!", analysis: {
    risk: "baixo", summary: "O texto parece um lembrete comum de almoço.",
    signals: ["O texto apenas confirma um horário.", "A mensagem não pede dinheiro, dados nem cliques."],
    explanation: "Encontramos poucos sinais de risco neste texto.",
    next_steps: ["verify"]
  }}
];
