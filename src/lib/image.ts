import sharp from "sharp";
import { imageError, imageTypes, MAX_PIXELS } from "./input.ts";

export async function prepareImage(file: File) {
  const error = imageError(file);
  if (error) throw new Error(error);
  try {
    const image = sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: MAX_PIXELS, failOn: "warning" });
    const metadata = await image.metadata();
    if (metadata.format !== imageTypes[file.type as keyof typeof imageTypes] || (metadata.pages ?? 1) > 1 ||
        !metadata.width || !metadata.height || metadata.width * metadata.height > MAX_PIXELS) {
      throw new Error();
    }
    // Decode the pixels and discard metadata before sending them to the provider.
    return await image.rotate().resize({ width: 2048, height: 2048, fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" }).jpeg({ quality: 90 }).toBuffer();
  } catch {
    throw new Error("Não foi possível ler a imagem. Escolha outra imagem de até 20 megapixels.");
  }
}
