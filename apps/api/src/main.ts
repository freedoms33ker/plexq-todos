import { NodeRuntime } from "@effect/platform-node"
import { Layer } from "effect"
import { MainLive } from "./server.ts"

NodeRuntime.runMain(Layer.launch(MainLive), { disablePrettyLogger: true })
