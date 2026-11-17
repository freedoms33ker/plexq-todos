import { csrfHeaderName } from "@todo/contract"

export interface ApiResponse {
  status: number
  body: unknown
}

// A browser-like client: keeps the CSRF cookie and echoes the token header, exactly as the SPA does.
export class TestApiClient {
  cookie = ""
  token = ""

  constructor(public baseUrl: string) {}

  fetchCsrfToken = async (): Promise<string> => {
    const response = await fetch(`${this.baseUrl}/api/csrf`, { headers: { cookie: this.cookie } })
    this.cookie = (response.headers.get("set-cookie") ?? "").split(";")[0] ?? ""
    this.token = ((await response.json()) as { token: string }).token
    return this.token
  }

  get = async (path: string): Promise<ApiResponse> => this.send("GET", path, undefined, {})

  mutate = async (method: "POST" | "PATCH" | "DELETE", path: string, body?: unknown): Promise<ApiResponse> =>
    this.send(method, path, body, { cookie: this.cookie, [csrfHeaderName]: this.token })

  send = async (method: string, path: string, body: unknown, headers: Record<string, string>): Promise<ApiResponse> => {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: { ...headers, ...(body === undefined ? {} : { "content-type": "application/json" }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) })
    })
    const text = await response.text()
    return { status: response.status, body: text.length === 0 ? undefined : JSON.parse(text) }
  }
}
