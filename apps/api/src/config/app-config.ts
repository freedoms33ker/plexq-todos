import { Config, Context, Effect, Layer, type Redacted } from "effect"

export const deploymentEnvironments = ["local", "development", "qa", "staging", "production"] as const
export type DeploymentEnvironment = (typeof deploymentEnvironments)[number]

export interface AppConfigShape {
  env: DeploymentEnvironment
  port: number
  databaseUrl: Redacted.Redacted
  logLevel: string
}

export class AppConfig extends Context.Tag("AppConfig")<AppConfig, AppConfigShape>() {
  static fromEnvironment = Layer.effect(
    AppConfig,
    Effect.gen(function* () {
      return {
        env: yield* Config.literal(...deploymentEnvironments)("ENV").pipe(Config.withDefault("local" as const)),
        port: yield* Config.port("PORT").pipe(Config.withDefault(3000)),
        databaseUrl: yield* Config.redacted("DATABASE_URL"),
        logLevel: yield* Config.string("LOG_LEVEL").pipe(Config.withDefault("info"))
      }
    })
  )
}
