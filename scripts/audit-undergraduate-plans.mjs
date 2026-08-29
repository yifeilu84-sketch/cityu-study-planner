import { readFileSync } from 'node:fs'
import { undergraduatePlanSources } from './undergraduate-plan-sources.mjs'

const majors = JSON.parse(readFileSync(new URL('../src/data/all-majors.json', import.meta.url), 'utf8'))
const courses = JSON.parse(readFileSync(new URL('../src/data/courses.json', import.meta.url), 'utf8'))

const supportedStatuses = new Set(['official', 'structure', 'derived', 'diy'])
const genericPatterns = [
  /^GE(?!\d{4})/i,
  /^FREE/i,
  /^MINOR/i,
  /^SECOND/i,
  /^COLLEGE/i,
  /^COL-/i,
  /^SCHOOL/i,
  /^STREAM/i,
  /^FLAGSHIP/i,
  /^MAJOR/i,
  /^FLEXIBLE/i,
  /^DR-/i,
  /^G-LEAP$/i,
  /^CS-E$/i,
  /^LAW-/i,
  /^ART-/i,
  /^PIA-COLLEGE/i,
  /^ELECTIVE/i,
  /^MJR-ELEC/i,
  /-ELECT/i,
  /ELECTIVE/i,
  /-ELEC\d*$/i,
  /FOUND/i,
]

function totalCredits(studyPlan) {
  return Object.values(studyPlan ?? {})
    .flatMap((year) => Object.values(year))
    .reduce((total, term) => total + (Number(term.credits) || 0), 0)
}

function plannedCourses(studyPlan) {
  return Object.values(studyPlan ?? {})
    .flatMap((year) => Object.values(year))
    .flatMap((term) => term.courses ?? [])
}

function isGeneric(code) {
  const value = String(code ?? '').trim()
  return !value || genericPatterns.some((pattern) => pattern.test(value))
}

function lookupCode(code) {
  const value = String(code ?? '').trim()
  if (courses[value]) return value
  return value.split(/\s+\/\s+|\s+or\s+|\//i)[0].trim()
}

function validateTermCredits(owner, studyPlan, errors) {
  for (const [year, yearPlan] of Object.entries(studyPlan ?? {})) {
    for (const [term, value] of Object.entries(yearPlan)) {
      const calculated = (value.courses ?? []).reduce((total, course) => total + (Number(course.credits) || 0), 0)
      if (calculated !== value.credits) errors.push(`${owner} ${year}.${term}: stored ${value.credits} CU, calculated ${calculated} CU`)
    }
  }
}

function validateCourseRecords(owner, studyPlan, errors) {
  for (const planned of plannedCourses(studyPlan)) {
    const code = lookupCode(planned.code)
    if (!code || isGeneric(planned.code) || isGeneric(code)) continue
    if (!courses[planned.code] && !courses[code]) errors.push(`${owner}: missing official course record for ${planned.code}`)
  }
}

function validateDuplicates(owner, studyPlan, errors) {
  const repeated = new Map()
  for (const planned of plannedCourses(studyPlan)) {
    if (String(planned.code).includes('/') || isGeneric(planned.code)) continue
    const code = lookupCode(planned.code)
    if (!courses[code]) continue
    const current = repeated.get(code) ?? { count: 0, credits: 0 }
    current.count += 1
    current.credits += Number(planned.credits) || 0
    repeated.set(code, current)
  }
  for (const [code, value] of repeated) {
    if (value.count <= 1 || value.credits <= (Number(courses[code]?.credits) || 0)) continue
    errors.push(`${owner}: ${code} is repeated ${value.count} times for ${value.credits} CU but catalogue credit is ${courses[code]?.credits ?? 0}`)
  }
}

const errors = []
const dataCodes = new Set(majors.map((item) => item.code))
const manifestCodes = new Set(Object.keys(undergraduatePlanSources))
if (dataCodes.size !== 63) errors.push(`Expected 63 undergraduate programmes, found ${dataCodes.size}`)
for (const code of dataCodes) if (!manifestCodes.has(code)) errors.push(`${code}: missing source manifest entry`)
for (const code of manifestCodes) if (!dataCodes.has(code)) errors.push(`${code}: source manifest entry has no programme`)

const statusCounts = { official: 0, structure: 0, derived: 0, diy: 0 }
for (const item of majors) {
  const source = undergraduatePlanSources[item.code]
  if (!source) continue
  if (!/^https:\/\/(?:[a-z0-9-]+\.)*cityu\.edu\.hk(?:\/|$)/i.test(source.sourceUrl ?? '')) errors.push(`${item.code}: source manifest must contain an explicit official CityUHK URL`)
  if (!supportedStatuses.has(item.studyPlanStatus)) errors.push(`${item.code}: unsupported or missing studyPlanStatus`)
  else statusCounts[item.studyPlanStatus] += 1
  if (item.studyPlanStatus !== source.status) errors.push(`${item.code}: data status ${item.studyPlanStatus} differs from manifest ${source.status}`)
  if (!item.studyPlanSourceTitle?.trim()) errors.push(`${item.code}: missing source title`)
  if (!/^https:\/\/(?:[a-z0-9-]+\.)*cityu\.edu\.hk(?:\/|$)/i.test(item.studyPlanSourceUrl ?? '')) errors.push(`${item.code}: source URL is not an official CityUHK URL`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(item.lastVerified ?? '')) errors.push(`${item.code}: missing verification date`)

  const mainTotal = totalCredits(item.studyPlan)
  if (mainTotal !== source.expectedPlanCredits) errors.push(`${item.code}: main plan ${mainTotal} CU, expected ${source.expectedPlanCredits}`)
  if (item.studyPlanStatus === 'diy' && plannedCourses(item.studyPlan).length) errors.push(`${item.code}: DIY plan must be blank`)
  if ((item.allCourses ?? []).length === 0) errors.push(`${item.code}: course pool is empty`)
  validateTermCredits(item.code, item.studyPlan, errors)
  validateCourseRecords(item.code, item.studyPlan, errors)
  validateDuplicates(item.code, item.studyPlan, errors)

  for (const [streamCode, expected] of Object.entries(source.streamCredits ?? {})) {
    const stream = item.streams?.find((candidate) => candidate.code === streamCode)
    if (!stream) {
      errors.push(`${item.code}: missing stream ${streamCode}`)
      continue
    }
    const owner = `${item.code}/${streamCode}`
    const streamTotal = totalCredits(stream.studyPlan)
    if (streamTotal !== expected) errors.push(`${owner}: ${streamTotal} CU, expected ${expected}`)
    if (expected === 0 && plannedCourses(stream.studyPlan).length) errors.push(`${owner}: DIY stream must be blank`)
    if ((stream.allCourses ?? []).length === 0) errors.push(`${owner}: course pool is empty`)
    validateTermCredits(owner, stream.studyPlan, errors)
    validateCourseRecords(owner, stream.studyPlan, errors)
    validateDuplicates(owner, stream.studyPlan, errors)
  }

  console.log(`[pass] ${item.code} ${item.studyPlanStatus} ${mainTotal} CU${item.streams?.length ? `, ${item.streams.length} stream(s)` : ''}`)
}

console.log(`Audited ${majors.length} undergraduate programmes: ${statusCounts.official} official, ${statusCounts.structure} structure/flowchart, ${statusCounts.derived} derived reference, ${statusCounts.diy} DIY.`)
if (errors.length) {
  console.error(`Undergraduate audit failed with ${errors.length} issue(s):`)
  for (const error of errors) console.error(`- ${error}`)
  process.exitCode = 1
} else {
  console.log('Undergraduate source, semester-credit, stream, DIY and course-record checks all passed.')
}
