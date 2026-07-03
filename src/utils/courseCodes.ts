const GENERIC_CODE_PATTERNS = [
  /^GE(?!\d{4})/i,
  /^DR-\d+$/i,
  /^CS-E$/i,
  /^CE$/i,
  /^FREE/i,
  /^MINOR/i,
  /^COLLEGE/i,
  /^SCHOOL/i,
  /^STREAM/i,
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
  return (code || '').trim().split(/[\s/]+/)[0]
}

export function isGenericCourseSlot(code: string): boolean {
  const trimmed = (code || '').trim()
  if (!trimmed) return true
  return GENERIC_CODE_PATTERNS.some((pattern) => pattern.test(trimmed))
}
