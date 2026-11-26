export const MAX_TEXT = 5000;
export const MAX_LINK = 2048;
export const MAX_IMAGE = 4 * 1024 * 1024;
export const MAX_PIXELS = 20_000_000;
export const imageTypes = { "image/jpeg": "jpeg", "image/png": "png", "image/webp": "webp" } as const;
export type Mode = "message" | "link" | "image";

export function validLink(value: string) {
  if (value.length > MAX_LINK || !/^https?:\/\/[^/]/i.test(value) || /[\s\\]/u.test(value)) return false;
  try {
    const url = new URL(value);
    return !!url.hostname && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function imageError(file: { size: number; type: string }) {
  if (!Object.hasOwn(imageTypes, file.type)) return "Escolha uma imagem JPG, PNG ou WebP.";
  if (file.size > MAX_IMAGE) return "A imagem passa de 4 MB. Escolha uma menor.";
  if (!file.size) return "A imagem está vazia. Escolha outra.";
  return "";
}
