import { Effect, Layer, Logger, type LogLevel } from "effect"
import winston from "winston"
import { AppConfig, type AppConfigShape } from "../config/app-config.ts"

export const LoggerLive = Layer.unwrapEffect(
  Effect.map(AppConfig, config => Logger.replace(Logger.defaultLogger, effectLoggerFor(makeWinstonLogger(config))))
)

export const makeWinstonLogger = (
  config: AppConfigShape,
  transports: winston.transport[] = [new winston.transports.Console()]
): winston.Logger =>
  winston.createLogger({
    level: config.logLevel,
    format: winston.format.combine(winston.format.timestamp(), winston.format.errors({ stack: true }), winston.format.json()),
    defaultMeta: { env: config.env, service: "todo-api" },
    transports
  })

export const effectLoggerFor = (target: winston.Logger): Logger.Logger<unknown, void> =>
  Logger.make(({ logLevel, message, annotations, cause }) => {
    target.log(winstonLevels[logLevel._tag], messageText(message), { ...Object.fromEntries(annotations), ...causeMeta(cause) })
  })

const winstonLevels: Record<LogLevel.LogLevel["_tag"], string> = {
  All: "silly",
  Trace: "silly",
  Debug: "debug",
  Info: "info",
  Warning: "warn",
  Error: "error",
  Fatal: "error",
  None: "silly"
}

const messageText = (message: unknown): string => (Array.isArray(message) ? message.map(String).join(" ") : String(message))

const causeMeta = (cause: Parameters<Parameters<typeof Logger.make>[0]>[0]["cause"]): Record<string, string> =>
  cause._tag === "Empty" ? {} : { cause: String(cause) }
