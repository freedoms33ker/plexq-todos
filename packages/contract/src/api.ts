import { HttpApi } from "@effect/platform"
import { CsrfApiGroup } from "./csrf/csrf.api.ts"
import { HealthApiGroup } from "./health/health.api.ts"
import { TodosApiGroup } from "./todo/todo.api.ts"

export class TodoAppApi extends HttpApi.make("todo-app").add(TodosApiGroup).add(CsrfApiGroup).add(HealthApiGroup).prefix("/api") {}
