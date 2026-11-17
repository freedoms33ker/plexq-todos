import { randomBytes, timingSafeEqual } from "node:crypto"

export const stateChangingMethods: ReadonlySet<string> = new Set(["POST", "PUT", "PATCH", "DELETE"])

export const requiresCsrfToken = (method: string): boolean => stateChangingMethods.has(method.toUpperCase())

export const generateCsrfToken = (): string => randomBytes(32).toString("base64url")

export const isWellFormedCsrfToken = (token: string | undefined): token is string =>
  token !== undefined && /^[A-Za-z0-9_-]{43}$/.test(token)

export const csrfTokensMatch = (cookieToken: string | undefined, headerToken: string | undefined): boolean =>
  isWellFormedCsrfToken(cookieToken) &&
  isWellFormedCsrfToken(headerToken) &&
  timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken))
