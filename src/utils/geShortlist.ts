const GE_CODE_PATTERN = /^GE\d{4}$/

function normalizeGECode(code: string): string | null {
  const normalized = String(code ?? '').trim().toUpperCase()
  return GE_CODE_PATTERN.test(normalized) ? normalized : null
}

export function toggleGEShortlist(current: string[], code: string): string[] {
  const normalized = normalizeGECode(code)
  if (!normalized) return current
  const existing = current.map(item => item.toUpperCase())
  if (existing.includes(normalized)) {
    return current.filter(item => item.toUpperCase() !== normalized)
  }
  return [...current, normalized]
}

export function serializeGEShortlist(codes: string[]): string {
  const normalized = [...new Set(codes.map(normalizeGECode).filter((code): code is string => Boolean(code)))]
  return JSON.stringify(normalized)
}

export function parseGEShortlist(value: string | null): string[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    if (!Array.isArray(parsed)) return []
    return [...new Set(parsed.map(normalizeGECode).filter((code): code is string => Boolean(code)))]
  } catch {
    return []
  }
}
