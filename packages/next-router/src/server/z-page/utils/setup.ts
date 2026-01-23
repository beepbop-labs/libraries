import { z } from "zod";
import { redirect } from "next/navigation";
import type { NextPageProps, OnZodError } from "./types";
import type { ZodObjectShape } from "../../../utils/types";
import { toZodObject } from "../../../utils/to-zod-object";

export const defaultOnError: OnZodError = (e) => {
  console.log(e);
  redirect("/404");
};

export function setup<RP extends ZodObjectShape, SP extends ZodObjectShape>(params: { routeParams?: RP; searchParams?: SP }, onError: OnZodError = defaultOnError) {
  const rpSchema = params.routeParams ? toZodObject(params.routeParams) : undefined;
  const spSchema = params.searchParams ? toZodObject(params.searchParams) : undefined;

  /** Creates validated promises from Next.js page props */
  function createValidatedPromises(props: NextPageProps) {
    return {
      routeParams: rpSchema ? props.params.then((raw) => rpSchema.parse(raw)) : undefined,
      searchParams: spSchema ? props.searchParams.then((raw) => spSchema.parse(raw)) : undefined,
    };
  }

  type Promises = ReturnType<typeof createValidatedPromises>;

  /** Awaits all params in parallel, handling errors */
  async function resolveParams(promises: Promises): Promise<Record<string, unknown>> {
    const result: Record<string, unknown> = {};

    try {
      const [rp, sp] = await Promise.all([promises.routeParams, promises.searchParams]);
      if (rpSchema) result.routeParams = rp;
      if (spSchema) result.searchParams = sp;
    } catch (e) {
      if (e instanceof z.ZodError) return onError(e), {};
      throw e;
    }

    return result;
  }

  return { createValidatedPromises, resolveParams };
}
