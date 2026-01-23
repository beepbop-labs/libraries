import type { ZodObjectShape, InferZodObjectShapeOutput } from "../../../utils/types";
import { toZodObject } from "../../../utils/to-zod-object";

export function zServerAction<P extends ZodObjectShape, R>(cfg: {
  params: P;
  handler: (inputs: InferZodObjectShapeOutput<P>) => Promise<R>;
}) {
  const schema = toZodObject(cfg.params);

  return async (inputs: InferZodObjectShapeOutput<P>): Promise<R> => {
    const parsed = schema.parse(inputs) as InferZodObjectShapeOutput<P>;
    return cfg.handler(parsed);
  };
}
