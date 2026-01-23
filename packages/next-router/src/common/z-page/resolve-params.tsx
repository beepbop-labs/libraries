import { z } from "zod";
import { defaultOnError } from "../../server/z-page/utils/setup";
import type { OnZodError } from "../../server/z-page/utils/types";

type ResolveZPageParamsInput<RP, SP> = {
  routeParams?: Promise<RP>;
  searchParams?: Promise<SP>;
};

type ResolveZPageParamsResult<RP, SP> = {
  routeParams: RP;
  searchParams: SP;
};

type ResolveZPageParamsOptions = {
  onError?: OnZodError;
};

export async function resolveZPageParams<RP, SP>(paramsPromise: ResolveZPageParamsInput<RP, SP>, options: ResolveZPageParamsOptions = {}): Promise<ResolveZPageParamsResult<RP, SP>> {
  const result = {} as ResolveZPageParamsResult<RP, SP>;
  const onError = options.onError ?? defaultOnError;

  if (paramsPromise.routeParams) {
    try {
      result.routeParams = await paramsPromise.routeParams;
    } catch (e) {
      if (e instanceof z.ZodError) {
        onError(e);
        return result;
      }
      throw e;
    }
  }

  if (paramsPromise.searchParams) {
    try {
      result.searchParams = await paramsPromise.searchParams;
    } catch (e) {
      if (e instanceof z.ZodError) {
        onError(e);
        return result;
      }
      throw e;
    }
  }

  return result;
}
