export const DESKTOP_AUTH_PROTOCOL_VERSION = '1'
export const DESKTOP_AUTH_CLIENT = 'desktop'
export const DESKTOP_AUTH_REDIRECT_URI = 'dawnchat://auth/callback'
/** Official Android / iOS host deep link callback (must match app manifest / Info.plist). */
export const MOBILE_AUTH_REDIRECT_URI = 'com.dawnchat.app://auth/callback'
export const DESKTOP_AUTH_DEFAULT_NEXT = '/app/workbench'
export const DESKTOP_AUTH_DEFAULT_BRIDGE_PATH = '/desktop-auth/bridge'
export const DESKTOP_AUTH_DEFAULT_BRIDGE_BASE_URL = `https://dawnchat.com${DESKTOP_AUTH_DEFAULT_BRIDGE_PATH}`
export const DESKTOP_AUTH_PENDING_KEY = 'dawnchat_desktop_auth_pending'

export type OAuthProvider = 'google' | 'github'

export interface DesktopAuthBridgeQuery {
  client: string
  state: string
  device_id: string
  redirect_uri: string
  next: string
  protocol_version: string
  provider?: OAuthProvider
}

export interface DesktopAuthPendingState {
  state: string
  deviceId: string
  createdAt: number
}

export interface DesktopAuthCallbackParams {
  ticket: string | null
  state: string | null
  error: string | null
}

export interface DesktopTicketExchangeRequest {
  desktop_ticket: string
  state: string
  device_id: string
  protocol_version: string
}

export interface DesktopTicketExchangeResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_at?: number
  expires_in?: number
}

const randomString = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '')
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`
}

export const isSafeNextPath = (value: unknown): value is string => {
  if (typeof value !== 'string') return false
  if (!value.startsWith('/') || value.startsWith('//')) return false
  return /^\/(app|fullscreen)(\/|$)/.test(value)
}

export const normalizeNextPath = (value: unknown, fallback = DESKTOP_AUTH_DEFAULT_NEXT): string => {
  return isSafeNextPath(value) ? value : fallback
}

export const normalizeProvider = (value: unknown): OAuthProvider | undefined => {
  if (value === 'google' || value === 'github') {
    return value
  }
  return undefined
}

/** Allowed OAuth return targets for the desktop-auth bridge (desktop deep link, mobile deep link, or https). */
export const isSafeDesktopRedirectUri = (value: unknown): value is string => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return false
  }
  try {
    const parsed = new URL(value)
    return (
      parsed.protocol === 'dawnchat:' ||
      parsed.protocol === 'com.dawnchat.app:' ||
      parsed.protocol === 'http:' ||
      parsed.protocol === 'https:'
    )
  } catch {
    return false
  }
}

export const normalizeDesktopAuthRedirectUri = (
  value: unknown,
  fallback = DESKTOP_AUTH_REDIRECT_URI
): string => {
  return isSafeDesktopRedirectUri(value) ? value : fallback
}

export const generateDesktopAuthState = (): string => {
  return `dc_${randomString()}`
}

export const buildDesktopAuthBridgeUrl = (
  baseUrl: string,
  query: Omit<DesktopAuthBridgeQuery, 'client' | 'protocol_version'>
): string => {
  const base = new URL(baseUrl)
  if (!base.pathname || base.pathname === '/') {
    base.pathname = DESKTOP_AUTH_DEFAULT_BRIDGE_PATH
  }

  base.searchParams.set('client', DESKTOP_AUTH_CLIENT)
  base.searchParams.set('state', query.state)
  base.searchParams.set('device_id', query.device_id)
  base.searchParams.set('redirect_uri', query.redirect_uri)
  base.searchParams.set('next', normalizeNextPath(query.next))
  base.searchParams.set('protocol_version', DESKTOP_AUTH_PROTOCOL_VERSION)

  const provider = normalizeProvider(query.provider)
  if (provider) {
    base.searchParams.set('provider', provider)
  } else {
    base.searchParams.delete('provider')
  }

  return base.toString()
}

export const parseDesktopAuthCallback = (url: string): DesktopAuthCallbackParams => {
  const parsed = new URL(url)
  return {
    ticket: parsed.searchParams.get('ticket'),
    state: parsed.searchParams.get('state'),
    error: parsed.searchParams.get('error_description') || parsed.searchParams.get('error')
  }
}

export const parseDesktopBridgeQuery = (value: URL | string): DesktopAuthBridgeQuery => {
  const parsed = typeof value === 'string' ? new URL(value, window.location.origin) : value
  return {
    client: parsed.searchParams.get('client') || '',
    state: parsed.searchParams.get('state') || '',
    device_id: parsed.searchParams.get('device_id') || '',
    redirect_uri: parsed.searchParams.get('redirect_uri') || DESKTOP_AUTH_REDIRECT_URI,
    next: normalizeNextPath(parsed.searchParams.get('next')),
    protocol_version: parsed.searchParams.get('protocol_version') || DESKTOP_AUTH_PROTOCOL_VERSION,
    provider: normalizeProvider(parsed.searchParams.get('provider'))
  }
}
