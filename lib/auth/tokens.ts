const STORAGE_KEY = "line_auth_tokens"
const USER_STORAGE_KEY = "line_current_user"

export type AuthTokens = {
  accessToken: string
  refreshToken: string
  expiresAt: number
}

function isBrowser() {
  return typeof window !== "undefined"
}

export function readStoredTokens(): AuthTokens | null {
  if (!isBrowser()) return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as AuthTokens
    if (!parsed.accessToken || !parsed.refreshToken || !parsed.expiresAt)
      return null
    return parsed
  } catch {
    return null
  }
}

export function persistTokens(tokens: AuthTokens | null) {
  if (!isBrowser()) return
  if (!tokens) {
    localStorage.removeItem(STORAGE_KEY)
    return
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens))
}

export function readStoredUser<T>(): T | null {
  if (!isBrowser()) return null
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object") return null
    return parsed as T
  } catch {
    return null
  }
}

export function persistUser<T>(user: T | null) {
  if (!isBrowser()) return
  if (!user) {
    localStorage.removeItem(USER_STORAGE_KEY)
    return
  }
  try {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
  } catch {
    // ignore
  }
}

export function clearAll() {
  if (!isBrowser()) return
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem(USER_STORAGE_KEY)
}
