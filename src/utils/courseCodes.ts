const GENERIC_CODE_PATTERNS = [
  /^GE(?!\d{4})/i,
  /^GE\d{4}\s*\/\s*EAP$/i,
  /^DR-\d+$/i,
  /^CS-E$/i,
  /^CE$/i,
  /^G-LEAP$/i,
  /^FREE/i,
  /^MINOR/i,
  /^SECOND-MAJOR$/i,
  /^COLLEGE/i,
  /^PIA-COLLEGE$/i,
  /^SCHOOL/i,
  /^STREAM/i,
  /^FLAGSHIP/i,
  /^MAJOR/i,
  /^COL-/i,
  /^CRM-/i,
  /-ELECT/i,
  /ELECTIVE/i,
  /-ELEC\d*$/i,
  /-CORE\d*$/i,
  /FOUND\d*$/i,
]

export function getCourseLookupCode(code: string): string {
  const trimmed = (code || '').trim()
  if (/\/\s*EAP$/i.test(trimmed)) return trimmed
  return trimmed.split(/[\s/]+/)[0]
}

export function isGenericCourseSlot(code: string): boolean {
  const trimmed = (code || '').trim()
  if (!trimmed) return true
  return GENERIC_CODE_PATTERNS.some((pattern) => pattern.test(trimmed))
}
