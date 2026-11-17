import { Writable } from "node:stream"
import { ConfigProvider, Effect, Layer, Logger } from "effect"
import { describe, expect, it } from "vitest"
import winston from "winston"
import { AppConfig } from "../config/app-config.ts"
import { effectLoggerFor, makeWinstonLogger } from "./logger.ts"

const captureLines = (): { lines: string[]; stream: Writable } => {
  const lines: string[] = []
  const stream = new Writable({
    write: (chunk: Buffer, _encoding: string, done: () => void): void => {
      lines.push(chunk.toString().trim())
      done()
    }
  })
  return { lines, stream }
}

const configFromEnv = (env: Record<string, string>): Promise<typeof AppConfig.Service> =>
  Effect.runPromise(
    AppConfig.pipe(Effect.provide(AppConfig.fromEnvironment.pipe(Layer.provide(Layer.setConfigProvider(ConfigProvider.fromJson(env))))))
  )

describe("logger", () => {
  it("writes JSON lines carrying the env value read from ENV, plus log annotations (AC-09)", async () => {
    const { lines, stream } = captureLines()
    const config = await configFromEnv({ ENV: "qa", DATABASE_URL: "postgres://unused" })
    const logger = makeWinstonLogger(config, [new winston.transports.Stream({ stream })])

    await Effect.runPromise(
      Effect.logInfo("Created TODO item").pipe(
        Effect.annotateLogs({ todoId: "abc" }),
        Effect.provide(Logger.replace(Logger.defaultLogger, effectLoggerFor(logger)))
      )
    )
    await new Promise(resolve => setImmediate(resolve))

    expect(lines).toHaveLength(1)
    expect(JSON.parse(lines[0] ?? "")).toMatchObject({
      level: "info",
      message: "Created TODO item",
      env: "qa",
      todoId: "abc",
      service: "todo-api"
    })
  })

  it("defaults env to local when ENV is unset, and rejects an unknown ENV value (AC-09)", async () => {
    expect((await configFromEnv({ DATABASE_URL: "postgres://unused" })).env).toBe("local")
    await expect(configFromEnv({ ENV: "prod", DATABASE_URL: "postgres://unused" })).rejects.toThrow()
  })

  it("maps Effect warnings and errors to winston levels", async () => {
    const { lines, stream } = captureLines()
    const config = await configFromEnv({ ENV: "local", DATABASE_URL: "postgres://unused" })
    const logger = makeWinstonLogger(config, [new winston.transports.Stream({ stream })])

    await Effect.runPromise(
      Effect.all([Effect.logWarning("careful"), Effect.logError("broken")]).pipe(
        Effect.provide(Logger.replace(Logger.defaultLogger, effectLoggerFor(logger)))
      )
    )
    await new Promise(resolve => setImmediate(resolve))

    expect(lines.map(line => JSON.parse(line).level)).toEqual(["warn", "error"])
  })
})
