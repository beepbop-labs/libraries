import React, { Suspense } from "react";
import { setup } from "../utils/setup";
import type { NextPageProps, OnZodError } from "../utils/types";
import type { InferZodObjectShapeOutput, ZodObjectShape } from "../../../utils/types";

/** Return type for zPage */
type ZPageReturn = (props: NextPageProps) => React.ReactNode | Promise<React.ReactNode>;
type InferOutput<T extends ZodObjectShape> = InferZodObjectShapeOutput<T>;

// ------------- OVERLOADS -------------

// ------------- Resolved -------------

// Both params, resolved
export function zPage<RP extends ZodObjectShape, SP extends ZodObjectShape>(cfg: {
  params: { routeParams: RP; searchParams: SP };
  resolve?: true;
  onError?: OnZodError;
  loadingHandler?: React.ReactNode;
  handler: (inputs: { routeParams: InferOutput<RP>; searchParams: InferOutput<SP> }) => React.ReactNode | Promise<React.ReactNode>;
}): ZPageReturn;

// Route only, resolved
export function zPage<RP extends ZodObjectShape>(cfg: {
  params: { routeParams: RP; searchParams?: undefined };
  resolve?: true;
  onError?: OnZodError;
  loadingHandler?: React.ReactNode;
  handler: (inputs: { routeParams: InferOutput<RP> }) => React.ReactNode | Promise<React.ReactNode>;
}): ZPageReturn;

// Search only, resolved
export function zPage<SP extends ZodObjectShape>(cfg: {
  params: { routeParams?: undefined; searchParams: SP };
  resolve?: true;
  onError?: OnZodError;
  loadingHandler?: React.ReactNode;
  handler: (inputs: { searchParams: InferOutput<SP> }) => React.ReactNode | Promise<React.ReactNode>;
}): ZPageReturn;

// ------------- Promise -------------

// Both params, promise
export function zPage<RP extends ZodObjectShape, SP extends ZodObjectShape>(cfg: {
  params: { routeParams: RP; searchParams: SP };
  resolve: false;
  onError?: never;
  loadingHandler?: never;
  handler: (inputs: { routeParams: Promise<InferOutput<RP>>; searchParams: Promise<InferOutput<SP>> }) => React.ReactNode | Promise<React.ReactNode>;
}): ZPageReturn;

// Route only, promise
export function zPage<RP extends ZodObjectShape>(cfg: {
  params: { routeParams: RP; searchParams?: undefined };
  resolve: false;
  onError?: never;
  loadingHandler?: never;
  handler: (inputs: { routeParams: Promise<InferOutput<RP>> }) => React.ReactNode | Promise<React.ReactNode>;
}): ZPageReturn;

// Search only, promise
export function zPage<SP extends ZodObjectShape>(cfg: {
  params: { routeParams?: undefined; searchParams: SP };
  resolve: false;
  onError?: never;
  loadingHandler?: never;
  handler: (inputs: { searchParams: Promise<InferOutput<SP>> }) => React.ReactNode | Promise<React.ReactNode>;
}): ZPageReturn;

// ------------- IMPLEMENTATION -------------

export function zPage<RP extends ZodObjectShape, SP extends ZodObjectShape>(cfg: {
  params: {
    routeParams?: RP;
    searchParams?: SP;
  };
  resolve?: boolean;
  onError?: OnZodError;
  loadingHandler?: React.ReactNode;
  handler: (inputs: any) => React.ReactNode | Promise<React.ReactNode>;
}): ZPageReturn {
  const shouldResolve = cfg.resolve !== false;
  const { createValidatedPromises, resolveParams } = setup(cfg.params, shouldResolve ? cfg.onError : undefined);

  if (!shouldResolve) {
    return async (props: NextPageProps) => cfg.handler(createValidatedPromises(props));
  }

  async function Inner({ promises }: { promises: ReturnType<typeof createValidatedPromises> }) {
    const inputs = await resolveParams(promises);
    if (!Object.keys(inputs).length) return null;
    return cfg.handler(inputs);
  }

  return (props: NextPageProps) => (
    <Suspense fallback={cfg.loadingHandler ?? null}>
      <Inner promises={createValidatedPromises(props)} />
    </Suspense>
  );
}
