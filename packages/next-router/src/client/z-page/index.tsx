"use client";

import { useEffect, useRef, useMemo } from "react";
import { useParams, useSearchParams as useNextSearchParams, useRouter } from "next/navigation";
import type { InferZodObjectShapeOutput, T_DataError, ZodObjectShape } from "../../utils/types";
import { toZodObject } from "../../utils/to-zod-object";
import type { OnZodError } from "../../server/z-page/utils/types";
import { z } from "zod";

type HookOptions<T> = {
  onSuccess?: (data: T) => void;
  onError?: OnZodError;
};

const defaultOnError = (error: z.ZodError, router: ReturnType<typeof useRouter>) => {
  console.log(error);
  router.push("/404");
};

export function useRouteParams<T extends ZodObjectShape>(schema: T, options?: HookOptions<InferZodObjectShapeOutput<T>>): T_DataError<InferZodObjectShapeOutput<T>> {
  const rawParams = useParams();
  const router = useRouter();
  const calledRef = useRef(false);
  const zodSchema = useMemo(() => toZodObject(schema), [schema]);

  const result = useMemo(() => {
    const parsed = zodSchema.safeParse(rawParams);
    return parsed.success ? { data: parsed.data as InferZodObjectShapeOutput<T>, error: null } : { data: null, error: parsed.error };
  }, [rawParams, zodSchema]);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    if (result.error) {
      options?.onError ? options.onError(result.error) : defaultOnError(result.error, router);
    } else if (result.data) {
      options?.onSuccess?.(result.data);
    }
  }, [result, options, router]);

  return result.error ? { data: null, error: result.error.message } : { data: result.data, error: null };
}

export function useSearchParams<T extends ZodObjectShape>(schema: T, options?: HookOptions<InferZodObjectShapeOutput<T>>): T_DataError<InferZodObjectShapeOutput<T>> {
  const nextSearchParams = useNextSearchParams();
  const router = useRouter();
  const calledRef = useRef(false);
  const zodSchema = useMemo(() => toZodObject(schema), [schema]);

  const result = useMemo(() => {
    const raw: Record<string, string | string[]> = {};
    nextSearchParams.forEach((v, k) => {
      const existing = raw[k];
      raw[k] = existing ? (Array.isArray(existing) ? [...existing, v] : [existing, v]) : v;
    });

    const parsed = zodSchema.safeParse(raw);
    return parsed.success ? { data: parsed.data as InferZodObjectShapeOutput<T>, error: null } : { data: null, error: parsed.error };
  }, [nextSearchParams, zodSchema]);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    if (result.error) {
      options?.onError ? options.onError(result.error) : defaultOnError(result.error, router);
    } else if (result.data) {
      options?.onSuccess?.(result.data);
    }
  }, [result, options, router]);

  return result.error ? { data: null, error: result.error.message } : { data: result.data, error: null };
}
