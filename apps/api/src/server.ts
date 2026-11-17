import { createServer } from "node:http"
import { type Etag, HttpApiBuilder, HttpMiddleware, HttpServer } from "@effect/platform"
import type { HttpPlatform } from "@effect/platform/HttpPlatform"
import { type NodeContext, NodeHttpServer } from "@effect/platform-node"
import { TodoAppApi } from "@todo/contract"
import { Effect, flow, Layer } from "effect"
import { LoggerLive } from "./common/logger.ts"
import { AppConfig } from "./config/app-config.ts"
import { CsrfHandlersLive } from "./csrf/csrf.handlers.ts"
import { csrfProtection } from "./csrf/csrf.middleware.ts"
import { DatabaseLive } from "./datastore/core/database.ts"
import { HealthHandlersLive } from "./health/health.handlers.ts"
import { TodoHandlersLive } from "./todo/todo.handlers.ts"
import { TodoService } from "./todo/todo.service.ts"

export const ApiLive = HttpApiBuilder.api(TodoAppApi).pipe(Layer.provide([TodoHandlersLive, CsrfHandlersLive, HealthHandlersLive]))

export const httpServerLayer = (port: number): HttpServerLayer => NodeHttpServer.layer(createServer, { port }).pipe(Layer.orDie)

export type HttpServerLayer = Layer.Layer<HttpServer.HttpServer | HttpPlatform | Etag.Generator | NodeContext.NodeContext>

export const serveApi = (server: HttpServerLayer): Layer.Layer<never, never, AppConfig | TodoService> =>
  HttpApiBuilder.serve(flow(csrfProtection, HttpMiddleware.logger)).pipe(
    Layer.provide(ApiLive),
    HttpServer.withLogAddress,
    Layer.provide(server)
  )

export const ApplicationServicesLive = TodoService.Default.pipe(Layer.provideMerge(DatabaseLive), Layer.provideMerge(LoggerLive))

export const MainLive = Layer.unwrapEffect(Effect.map(AppConfig, config => serveApi(httpServerLayer(config.port)))).pipe(
  Layer.provide(ApplicationServicesLive),
  Layer.provide(AppConfig.fromEnvironment)
)
