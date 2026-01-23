import { defineTable, type TableDefinition, type GenericTableIndexes } from "convex/server";
import type { GenericValidator, ObjectType, VObject } from "convex/values";

type SchemaDefinition = Record<string, GenericValidator>;

type IndexDefinition<T extends SchemaDefinition> = {
  name: string;
  fields: [keyof T & string, ...(keyof T & string)[]];
};

type CreateTableOptions<T extends SchemaDefinition> = {
  schema: T;
  indexes?: IndexDefinition<T>[];
};

/**
 * Helper to define a Convex table with a declarative syntax.
 *
 * @example
 * const usersTable = createTable({
 *   schema: UserSchema,
 *   indexes: [
 *     { name: "by_email", fields: ["email"] },
 *     { name: "by_role", fields: ["role", "createdAt"] },
 *   ],
 * });
 */
export function createTable<T extends SchemaDefinition>({
  schema,
  indexes = [],
}: CreateTableOptions<T>): TableDefinition<VObject<ObjectType<T>, T>, GenericTableIndexes> {
  let table: TableDefinition = defineTable(schema);

  for (const index of indexes) {
    table = table.index(index.name, index.fields);
  }

  return table as TableDefinition<VObject<ObjectType<T>, T>, GenericTableIndexes>;
}
