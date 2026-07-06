export const WELCOME_SESSION_KEY = 'cityu-welcome-seen'

type SessionStorageLike = Pick<Storage, 'getItem' | 'setItem'>

export function shouldShowWelcomeModal(storage: SessionStorageLike | undefined = globalThis.sessionStorage): boolean {
  if (!storage) return true

  try {
    if (storage.getItem(WELCOME_SESSION_KEY)) return false
    storage.setItem(WELCOME_SESSION_KEY, '1')
    return true
  } catch {
    return true
  }
}
