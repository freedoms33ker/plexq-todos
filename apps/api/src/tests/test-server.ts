import { HttpServer } from "@effect/platform"
import type { SqlClient } from "@effect/sql"
import { Effect, Layer, ManagedRuntime } from "effect"
import { AppConfig } from "../config/app-config.ts"
import { ApplicationServicesLive, httpServerLayer, serveApi } from "../server.ts"
import { TodoRepository } from "../todo/todo.repository.ts"
import type { TodoService } from "../todo/todo.service.ts"

export type TestServices = HttpServer.HttpServer | TodoRepository | TodoService | SqlClient.SqlClient | AppConfig

export interface TestServer {
  baseUrl: string
  runtime: ManagedRuntime.ManagedRuntime<TestServices, never>
  dispose: () => Promise<void>
}

// The real HTTP stack — middleware, handlers, service, repository — on an ephemeral port against the test database.
export const startTestServer = async (): Promise<TestServer> => {
  const server = httpServerLayer(0)
  const runtime = ManagedRuntime.make(
    Layer.mergeAll(serveApi(server), server, TodoRepository.Default).pipe(Layer.provideMerge(testServicesLayer), Layer.orDie)
  )
  const address = await runtime.runPromise(Effect.map(HttpServer.HttpServer, httpServer => httpServer.address))
  return { baseUrl: `http://127.0.0.1:${portOf(address)}`, runtime, dispose: () => runtime.dispose() }
}

const testServicesLayer = ApplicationServicesLive.pipe(Layer.provideMerge(AppConfig.fromEnvironment))

const portOf = (address: HttpServer.Address): number => (address._tag === "TcpAddress" ? address.port : 0)
