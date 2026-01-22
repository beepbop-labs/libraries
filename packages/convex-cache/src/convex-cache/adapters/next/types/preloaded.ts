import type { ArgsAndOptions } from "convex/server";
import type { PQ_Query } from "../../../core/types/types/paginated-query";
import type { Q_Query } from "../../../core/types/types/query";
import type { NextjsOptions } from "convex/nextjs";

export type Q_ArgsPreloaded<Q extends Q_Query> = ArgsAndOptions<Q, NextjsOptions>[0];
export type PQ_ArgsPreloaded<Q extends PQ_Query> = ArgsAndOptions<Q, NextjsOptions>[0];

export type Q_OptionsPreloaded<Q extends Q_Query> = ArgsAndOptions<Q, NextjsOptions>[1];
export type PQ_OptionsPreloaded<Q extends PQ_Query> = ArgsAndOptions<Q, NextjsOptions>[1];
