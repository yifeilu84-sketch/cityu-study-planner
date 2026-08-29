import { readFileSync } from 'node:fs'

const majors = JSON.parse(readFileSync(new URL('../src/data/all-majors.json', import.meta.url), 'utf8'))
const courses = JSON.parse(readFileSync(new URL('../src/data/courses.json', import.meta.url), 'utf8'))
const postgraduateProgrammes = JSON.parse(readFileSync(new URL('../src/data/postgraduate-programmes.json', import.meta.url), 'utf8'))
const postgraduateCourses = JSON.parse(readFileSync(new URL('../src/data/pg-courses.json', import.meta.url), 'utf8'))

const GENERIC_CODE_PATTERNS = [
  /^GE(?!\d{4})/i,
  /^FREE/i,
  /^MINOR/i,
  /^SECOND/i,
  /^COLLEGE/i,
  /^COL-/i,
  /^SCHOOL/i,
  /^STREAM/i,
  /^MAJOR/i,
  /^FLEXIBLE/i,
  /^LAW-/i,
  /^ART-/i,
  /^PIA-COLLEGE/i,
  /-ELECT/i,
  /ELECTIVE/i,
  /-ELEC\d*$/i,
  /-CORE\d*$/i,
  /FOUND/i,
]

function isGeneric(code) {
  return !code || GENERIC_CODE_PATTERNS.some((pattern) => pattern.test(String(code).trim()))
}

function lookupCode(code, courseMap) {
  const trimmed = String(code ?? '').trim()
  if (courseMap[trimmed]) return trimmed
  return trimmed.split(/\s+\/\s+|\s+or\s+|\//i)[0].trim()
}

function addOfferingTerms(terms, rawText) {
  const text = String(rawText ?? '').toLowerCase()
  if (!text || /not\s+offering/.test(text)) return false
  if (/semester\s*a|sem\s*a/.test(text)) terms.add('semA')
  if (/semester\s*b|sem\s*b/.test(text)) terms.add('semB')
  if (/semester\s*a\s*(?:&|and|\/|,)\s*b|sem\s*a\s*(?:&|and|\/|,)\s*b/.test(text)) terms.add('semB')
  if (/summer/.test(text)) terms.add('summer')
  return true
}

function offeringTerms(course) {
  const terms = new Set()
  let confirmed = false
  for (const term of course?.geTerms ?? []) confirmed = addOfferingTerms(terms, term) || confirmed
  confirmed = addOfferingTerms(terms, course?.semester) || confirmed
  return confirmed && terms.size ? terms : null
}

function collectConflicts(owner, studyPlan, label, courseMap) {
  const conflicts = []
  for (const [year, yearPlan] of Object.entries(studyPlan ?? {})) {
    for (const term of ['semA', 'semB', 'summer']) {
      for (const planned of yearPlan?.[term]?.courses ?? []) {
        const code = lookupCode(planned.code, courseMap)
        if (isGeneric(planned.code) || isGeneric(code)) continue
        const allowed = offeringTerms(courseMap[planned.code] ?? courseMap[code])
        if (!allowed || allowed.has(term)) continue
        conflicts.push({ programme: owner.code, plan: label, year, term, code: planned.code, allowed: [...allowed] })
      }
    }
  }
  return conflicts
}

const conflicts = []
for (const major of majors) {
  conflicts.push(...collectConflicts(major, major.studyPlan, 'major', courses))
  for (const stream of major.streams ?? []) {
    conflicts.push(...collectConflicts(major, stream.studyPlan, `stream:${stream.code}`, courses))
  }
}
for (const programme of postgraduateProgrammes) {
  conflicts.push(...collectConflicts(programme, programme.studyPlan, 'programme', postgraduateCourses))
  for (const variant of programme.studyPlanVariants ?? []) {
    conflicts.push(...collectConflicts(programme, variant.studyPlan, `variant:${variant.code}`, postgraduateCourses))
  }
}

console.log(`Offering-term audit found ${conflicts.length} advisory conflict(s); no study plan was modified.`)
for (const conflict of conflicts) {
  console.log(`[advisory] ${conflict.programme} ${conflict.plan} ${conflict.year}.${conflict.term} ${conflict.code} -> ${conflict.allowed.join('/')}`)
}
