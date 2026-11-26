export const guidance = {
  bank: "Se você já enviou dinheiro ou dados, fale agora com seu banco ou com o serviço afetado. Use o aplicativo oficial ou um número que você já conhece.",
  no_click: "Não abra o link da mensagem.",
  no_pay: "Não envie dinheiro. Confirme o pedido antes de pagar.",
  no_codes: "Não compartilhe senhas, códigos ou dados pessoais.",
  official: "Confirme a informação pelo aplicativo ou telefone oficial da empresa.",
  known_contact: "Fale com a pessoa pelo número que você já tinha salvo.",
  verify: "Em caso de dúvida, confirme a mensagem com quem enviou, por um canal que você já conhece.",
  clearer_image: "Se o texto estiver difícil de ler, envie uma imagem mais nítida ou cole a mensagem."
} as const;

export const actionIds = ["bank", "no_click", "no_pay", "no_codes", "official", "known_contact", "verify", "clearer_image"] as const;
export type Action = typeof actionIds[number];

export function safeSteps(actions: Action[]) {
  const unique = [...new Set(actions)];
  return unique.sort((a, b) => Number(b === "bank") - Number(a === "bank")).map(action => guidance[action]);
}
