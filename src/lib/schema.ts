import { z } from "zod";
import { actionIds } from "./guidance.ts";

const line = (max: number) => z.string().trim().min(1).max(max)
  .refine(value => !/[\p{Cc}\p{Cf}]/u.test(value));
export const analysisSchema = z.strictObject({
  risk: z.enum(["baixo", "atencao", "alto"]),
  summary: line(240),
  signals: z.array(line(160)).max(5),
  explanation: line(280),
  next_steps: z.array(z.enum(actionIds)).min(1).max(3)
});
export type Analysis = z.infer<typeof analysisSchema>;
export const responseSchema = z.strictObject({ analysis: analysisSchema, demo: z.boolean() });
