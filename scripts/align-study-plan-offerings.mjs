import { readFileSync, writeFileSync } from 'node:fs'

const majorsPath = new URL('../src/data/all-majors.json', import.meta.url)
const coursesPath = new URL('../src/data/courses.json', import.meta.url)
const postgraduateProgrammesPath = new URL('../src/data/postgraduate-programmes.json', import.meta.url)
const postgraduateCoursesPath = new URL('../src/data/pg-courses.json', import.meta.url)

const majors = JSON.parse(readFileSync(majorsPath, 'utf8'))
const courses = JSON.parse(readFileSync(coursesPath, 'utf8'))
const postgraduateProgrammes = JSON.parse(readFileSync(postgraduateProgrammesPath, 'utf8'))
const postgraduateCourses = JSON.parse(readFileSync(postgraduateCoursesPath, 'utf8'))

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
  /^MAJOR/i,
  /^COL-/i,
  /^CRM-/i,
  /-ELECT/i,
  /ELECTIVE/i,
  /-ELEC\d*$/i,
  /-CORE\d*$/i,
  /FOUND\d*$/i,
]

function getCourseLookupCode(code) {
  const trimmed = (code || '').trim()
  if (/\/\s*EAP$/i.test(trimmed)) return trimmed
  return trimmed.split(/[\s/]+/)[0]
}

function isGenericCourseSlot(code) {
  const trimmed = (code || '').trim()
  if (!trimmed) return true
  return GENERIC_CODE_PATTERNS.some((pattern) => pattern.test(trimmed))
}

function addOfferingTermsFromText(terms, rawText) {
  const text = String(rawText ?? '').toLowerCase()
  if (!text || /not\s+offering/.test(text)) return false
  if (/semester\s*a|sem\s*a/.test(text)) terms.add('semA')
  if (/semester\s*b|sem\s*b/.test(text)) terms.add('semB')
  if (/semester\s*a\s*(?:&|and|\/)\s*b|sem\s*a\s*(?:&|and|\/)\s*b/.test(text)) terms.add('semB')
  if (/summer/.test(text)) terms.add('summer')
  return true
}

function getConfirmedOfferingTerms(course) {
  const terms = new Set()
  let hasConfirmedSource = false
  for (const term of course?.geTerms ?? []) {
    hasConfirmedSource = addOfferingTermsFromText(terms, term) || hasConfirmedSource
  }
  hasConfirmedSource = addOfferingTermsFromText(terms, course?.semester) || hasConfirmedSource
  return hasConfirmedSource && terms.size > 0 ? terms : null
}

function chooseTargetSemester(allowedTerms) {
  for (const semKey of ['semA', 'semB', 'summer']) {
    if (allowedTerms.has(semKey)) return semKey
  }
  return null
}

function ensureSemester(year, semKey) {
  if (!year[semKey]) year[semKey] = { courses: [], credits: 0 }
  if (!Array.isArray(year[semKey].courses)) year[semKey].courses = []
  year[semKey].credits = year[semKey].courses.reduce((sum, course) => sum + (Number(course.credits) || 0), 0)
  return year[semKey]
}

function recalculateCredits(plan) {
  for (const year of Object.values(plan ?? {})) {
    for (const semKey of ['semA', 'semB', 'summer']) {
      if (!year?.[semKey]) continue
      year[semKey].credits = (year[semKey].courses ?? []).reduce((sum, course) => sum + (Number(course.credits) || 0), 0)
    }
  }
}

function alignPlan(owner, plan, label, courseMap, moves) {
  if (!plan) return

  for (const [yearKey, year] of Object.entries(plan)) {
    for (const semKey of ['semA', 'semB', 'summer']) {
      const semester = year?.[semKey]
      if (!Array.isArray(semester?.courses)) continue

      for (let index = semester.courses.length - 1; index >= 0; index -= 1) {
        const plannedCourse = semester.courses[index]
        const lookupCode = getCourseLookupCode(plannedCourse.code)
        if (!lookupCode || isGenericCourseSlot(plannedCourse.code) || isGenericCourseSlot(lookupCode)) continue

        const course = courseMap[plannedCourse.code] ?? courseMap[lookupCode]
        const allowedTerms = getConfirmedOfferingTerms(course)
        if (!allowedTerms || allowedTerms.has(semKey)) continue

        const targetSemKey = chooseTargetSemester(allowedTerms)
        if (!targetSemKey) continue

        semester.courses.splice(index, 1)
        ensureSemester(year, targetSemKey).courses.push(plannedCourse)
        moves.push({
          programme: owner.code,
          plan: label,
          year: yearKey,
          from: semKey,
          to: targetSemKey,
          code: plannedCourse.code,
          offering: course.semester,
        })
      }
    }
  }

  recalculateCredits(plan)
}

const moves = []

for (const major of majors) {
  alignPlan(major, major.studyPlan, 'major', courses, moves)
  for (const stream of major.streams ?? []) {
    alignPlan(major, stream.studyPlan, `stream:${stream.code ?? stream.title ?? 'unnamed'}`, courses, moves)
  }
}

for (const programme of postgraduateProgrammes) {
  alignPlan(programme, programme.studyPlan, 'programme', postgraduateCourses, moves)
  for (const variant of programme.studyPlanVariants ?? []) {
    alignPlan(programme, variant.studyPlan, `variant:${variant.code ?? 'unnamed'}`, postgraduateCourses, moves)
  }
}

writeFileSync(majorsPath, `${JSON.stringify(majors, null, 2)}\n`)
writeFileSync(postgraduateProgrammesPath, `${JSON.stringify(postgraduateProgrammes, null, 2)}\n`)

console.log(`Aligned ${moves.length} study-plan course placements with confirmed offering semesters.`)
for (const move of moves) {
  console.log(`${move.programme} ${move.plan} ${move.year}: ${move.code} ${move.from} -> ${move.to}`)
}
