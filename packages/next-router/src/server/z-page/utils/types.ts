import { z } from "zod";
/** Next.js page props type */
export type NextPageProps = {
  params: Promise<Record<string, string | string[]>>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Error handler type */
export type OnZodError = (error: z.ZodError) => never | void;
