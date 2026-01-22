import { z, ZodType } from "zod";

type EnvSchema = Record<string, ZodType<unknown>>;

type InferEnv<T extends EnvSchema> = {
  [K in keyof T]: z.infer<T[K]>;
};

export function zEnv<T extends EnvSchema>(env: NodeJS.ProcessEnv, schema: T): InferEnv<T> {
  const result = {} as InferEnv<T>;
  const errors: string[] = [];

  for (const key of Object.keys(schema)) {
    const value = env[key];
    const zodSchema = schema[key];

    const parsed = zodSchema.safeParse(value);

    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => i.message).join(", ");
      errors.push(`${key}: ${issues}`);
    } else {
      result[key as keyof T] = parsed.data as InferEnv<T>[keyof T];
    }
  }

  if (errors.length > 0) {
    throw new Error(`Environment validation failed:\n${errors.join("\n")}`);
  }

  return result;
}
