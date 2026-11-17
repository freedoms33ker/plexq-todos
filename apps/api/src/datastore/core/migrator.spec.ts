import { randomUUID } from "node:crypto"
import { NodeContext } from "@effect/platform-node"
import { SqlClient } from "@effect/sql"
import { PgClient } from "@effect/sql-pg"
import { Effect, Layer, Redacted } from "effect"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { runMigrations } from "./migrator.ts"

// Migrations are proven on a brand-new database, never on the shared test database, which is already migrated.
const testDatabaseUrl = new URL(process.env.DATABASE_URL ?? "postgres://todo:todo@localhost:5432/todo_test")
const scratchName = `todo_migration_${randomUUID().replaceAll("-", "").slice(0, 12)}`
const scratchUrl = new URL(testDatabaseUrl)
scratchUrl.pathname = `/${scratchName}`

const clientLayer = (url: URL): Layer.Layer<SqlClient.SqlClient | PgClient.PgClient> =>
  PgClient.layer({ url: Redacted.make(url.toString()) }).pipe(Layer.orDie)

const onTestDatabase = <A>(effect: Effect.Effect<A, unknown, SqlClient.SqlClient>): Promise<A> =>
  Effect.runPromise(effect.pipe(Effect.orDie, Effect.provide(clientLayer(testDatabaseUrl))))

const onScratchDatabase = <A>(
  effect: Effect.Effect<A, unknown, SqlClient.SqlClient | PgClient.PgClient | NodeContext.NodeContext>
): Promise<A> => Effect.runPromise(effect.pipe(Effect.orDie, Effect.provide(Layer.merge(clientLayer(scratchUrl), NodeContext.layer))))

interface ColumnRow {
  columnName: string
  dataType: string
  isNullable: string
  columnDefault: string | null
}

beforeAll(async () => {
  await onTestDatabase(Effect.flatMap(SqlClient.SqlClient, sql => sql.unsafe(`create database ${scratchName}`)))
})

afterAll(async () => {
  await onTestDatabase(Effect.flatMap(SqlClient.SqlClient, sql => sql.unsafe(`drop database if exists ${scratchName} with (force)`)))
})

describe("database migrations on a fresh PostgreSQL 18 database", () => {
  it("creates todo_item with the standard entity columns, and a second run applies nothing (AC-05)", async () => {
    const firstRun = await onScratchDatabase(runMigrations)
    const secondRun = await onScratchDatabase(runMigrations)
    const columns = await onScratchDatabase(
      Effect.flatMap(
        SqlClient.SqlClient,
        sql => sql<ColumnRow>`
          select column_name as "columnName", data_type as "dataType", is_nullable as "isNullable", column_default as "columnDefault"
          from information_schema.columns where table_name = 'todo_item' order by ordinal_position`
      )
    )

    expect(firstRun.map(([id, name]) => `${id}_${name}`)).toEqual(["1_create_todo_item"])
    expect(secondRun).toEqual([])
    expect(columns).toEqual([
      { columnName: "id", dataType: "uuid", isNullable: "NO", columnDefault: "uuidv7()" },
      { columnName: "title", dataType: "text", isNullable: "NO", columnDefault: null },
      { columnName: "notes", dataType: "text", isNullable: "YES", columnDefault: null },
      { columnName: "is_completed", dataType: "boolean", isNullable: "NO", columnDefault: "false" },
      { columnName: "is_test_data", dataType: "boolean", isNullable: "NO", columnDefault: "false" },
      { columnName: "created_timestamp", dataType: "timestamp with time zone", isNullable: "NO", columnDefault: "now()" },
      { columnName: "updated_timestamp", dataType: "timestamp with time zone", isNullable: "NO", columnDefault: "now()" },
      {
        columnName: "deleted_timestamp",
        dataType: "timestamp with time zone",
        isNullable: "YES",
        columnDefault: null
      }
    ])
  })

  it("generates version-7 UUIDs and rejects blank titles at the database level (AC-05)", async () => {
    const [row] = await onScratchDatabase(
      Effect.flatMap(SqlClient.SqlClient, sql => sql<{ id: string }>`insert into todo_item (title) values ('Check') returning id`)
    )
    const blankInsert = onScratchDatabase(Effect.flatMap(SqlClient.SqlClient, sql => sql`insert into todo_item (title) values ('   ')`))

    expect(row?.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    await expect(blankInsert).rejects.toThrow()
  })

  it("runs on PostgreSQL 18 or later (AC-04)", async () => {
    const [row] = await onScratchDatabase(
      Effect.flatMap(SqlClient.SqlClient, sql => sql<{ version: string }>`select current_setting('server_version_num') as version`)
    )

    expect(Number(row?.version)).toBeGreaterThanOrEqual(180000)
  })
})
