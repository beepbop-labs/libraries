import { z, type ZodRawShape } from "zod";
import type { ZodObjectShape } from "./types";

/** Wrap a raw shape in z.object() if it's not already a ZodObject */
export function toZodObject(schema: ZodObjectShape): z.ZodObject<ZodRawShape> {
  if (schema instanceof z.ZodObject) return schema;
  return z.object(schema as ZodRawShape);
}
