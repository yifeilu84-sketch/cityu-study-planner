import type { Course, StudyPlan } from '../types'
import { getCourseLookupCode, isGenericCourseSlot } from './courseCodes.ts'

export type PlanRiskSeverity = 'info' | 'warning' | 'danger'
export type PlanRiskStatus = 'ok' | 'warning' | 'danger'

export type PlanRiskKind =
  | 'offering-term'
  | 'not-offering'
  | 'prerequisite'
  | 'semester-load'
  | 'ge-area'
  | 'ge-credits'
  | 'cross-term-project'

export interface PlanRiskCourse {
  code: string
  title?: string
  credits: number
  category?: string
  semester?: string
}

export interface PlanRiskSemester {
  year: number
  sem: 'A' | 'B' | 'Summer' | string
  courses: PlanRiskCourse[]
  totalCredits?: number
}

export interface PlanRiskIssue {
  kind: PlanRiskKind
  severity: PlanRiskSeverity
  code?: string
  codes: string[]
  year?: number
  sem?: string
  title: string
  message: string
  suggestion: string
}

export interface PlanRiskSummary {
  status: PlanRiskStatus
  counts: Record<PlanRiskSeverity, number>
  issues: PlanRiskIssue[]
}

export interface PlanRiskInput {
  plan: PlanRiskSemester[]
  courses: Record<string, Course>
  ge?: {
    missingAreas?: string[]
    missingCredits?: number
    missingRequiredCodes?: string[]
  }
  splitCourses?: { code: string; count: number; plannedCredits: number; catalogueCredits: number }[]
}

interface PlannedCourse extends PlanRiskCourse {
  normalizedCode: string
  year: number
  sem: string
  termKey: 'semA' | 'semB' | 'summer' | null
  semesterIndex: number
  courseDetail?: Course
}

const TERM_LABELS = {
  semA: 'Semester A',
  semB: 'Semester B',
  summer: 'Summer Term',
} as const

const LOAD_LIMITS = {
  regularWarning: 18,
  regularDanger: 21,
  summerWarning: 9,
  summerDanger: 12,
}

const PREREQUISITE_EQUIVALENTS: Record<string, string[]> = {
  MA1200: ['MA1300'],
  MA1300: ['MA1200'],
  MA1201: ['MA1301'],
  MA1301: ['MA1201'],
  BCH1200: ['CHEM1200'],
  CHEM1200: ['BCH1200'],
}

function normalizeCode(code: string, courses: Record<string, Course>): string {
  const lookupCode = getCourseLookupCode(code)
  if (!lookupCode) return ''
  if (courses[lookupCode]) return lookupCode
  const withoutStatusSuffix = lookupCode.replace(/^([A-Z]{2,}\d{4})[A-Z]$/, '$1')
  if (courses[withoutStatusSuffix]) return withoutStatusSuffix
  return lookupCode
}

function isConcreteCode(code: string): boolean {
  return Boolean(code) && !isGenericCourseSlot(code)
}

function termKeyFromSemester(sem: string): PlannedCourse['termKey'] {
  const text = String(sem).toLowerCase()
  if (text === 'a' || text === 'sema' || text.includes('semester a')) return 'semA'
  if (text === 'b' || text === 'semb' || text.includes('semester b')) return 'semB'
  if (text === 'summer' || text.includes('summer')) return 'summer'
  return null
}

function addTermsFromText(terms: Set<'semA' | 'semB' | 'summer'>, rawText: unknown): boolean {
  const text = String(rawText ?? '').toLowerCase()
  if (!text || /not\s+offering/.test(text)) return false
  if (/semester\s*a|sem\s*a/.test(text)) terms.add('semA')
  if (/semester\s*b|sem\s*b/.test(text)) terms.add('semB')
  if (/semester\s*a\s*(?:&|and|\/)\s*b|sem\s*a\s*(?:&|and|\/)\s*b/.test(text)) terms.add('semB')
  if (/summer/.test(text)) terms.add('summer')
  return true
}

function getOfferingTerms(course?: Course): Set<'semA' | 'semB' | 'summer'> | null {
  const terms = new Set<'semA' | 'semB' | 'summer'>()
  let hasSource = false
  for (const term of course?.geTerms ?? []) {
    hasSource = addTermsFromText(terms, term) || hasSource
  }
  hasSource = addTermsFromText(terms, course?.semester) || hasSource
  return hasSource && terms.size > 0 ? terms : null
}

function isNotOffering(course?: Course): boolean {
  return /not\s+offering/i.test(course?.semester ?? '')
}

function termList(terms: Set<'semA' | 'semB' | 'summer'>): string {
  return [...terms].map(term => TERM_LABELS[term]).join(' / ')
}

function flattenPlan(plan: PlanRiskSemester[], courses: Record<string, Course>): PlannedCourse[] {
  const semRank: Record<string, number> = { A: 0, B: 1, Summer: 2 }
  return [...plan]
    .sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year
      return (semRank[a.sem] ?? 9) - (semRank[b.sem] ?? 9)
    })
    .flatMap((semester, semesterIndex) =>
      semester.courses.map(course => {
        const normalizedCode = normalizeCode(course.code, courses)
        return {
          ...course,
          credits: course.credits ?? courses[normalizedCode]?.credits ?? 0,
          normalizedCode,
          year: semester.year,
          sem: semester.sem,
          termKey: termKeyFromSemester(semester.sem),
          semesterIndex,
          courseDetail: courses[course.code] ?? courses[normalizedCode],
        }
      })
    )
}

function buildPriorCodeSets(plannedCourses: PlannedCourse[]): Map<number, Set<string>> {
  const result = new Map<number, Set<string>>()
  const seen = new Set<string>()
  for (const course of [...plannedCourses].sort((a, b) => a.semesterIndex - b.semesterIndex)) {
    if (!result.has(course.semesterIndex)) result.set(course.semesterIndex, new Set(seen))
    if (isConcreteCode(course.normalizedCode)) seen.add(course.normalizedCode)
  }
  return result
}

function hasPriorCode(code: string, priorCodes: Set<string>): boolean {
  if (priorCodes.has(code)) return true
  return (PREREQUISITE_EQUIVALENTS[code] ?? []).some(equivalent => priorCodes.has(equivalent))
}

function buildOfferingIssues(plannedCourses: PlannedCourse[]): PlanRiskIssue[] {
  const issues: PlanRiskIssue[] = []

  for (const course of plannedCourses) {
    if (!isConcreteCode(course.normalizedCode) || !course.termKey) continue
    if (isNotOffering(course.courseDetail)) {
      issues.push({
        kind: 'not-offering',
        severity: 'warning',
        code: course.normalizedCode,
        codes: [course.normalizedCode],
        year: course.year,
        sem: course.sem,
        title: `${course.code} is not currently offered`,
        message: `${course.code} is listed as not offering in the current academic year.`,
        suggestion: 'Keep it as a requirement reference only, or confirm an alternative / replacement course with the department.',
      })
      continue
    }

    const offeringTerms = getOfferingTerms(course.courseDetail)
    if (!offeringTerms || offeringTerms.has(course.termKey)) continue
    issues.push({
      kind: 'offering-term',
      severity: 'danger',
      code: course.normalizedCode,
      codes: [course.normalizedCode],
      year: course.year,
      sem: course.sem,
      title: `${course.code} is placed in the wrong semester`,
      message: `${course.code} is placed in Year ${course.year} ${TERM_LABELS[course.termKey]}, but the catalogue shows ${termList(offeringTerms)}.`,
      suggestion: `Move ${course.code} to ${termList(offeringTerms)}, or confirm a special offering with the department.`,
    })
  }

  return issues
}

function buildPrerequisiteIssues(plannedCourses: PlannedCourse[], courses: Record<string, Course>): PlanRiskIssue[] {
  const issues: PlanRiskIssue[] = []
  const priorBySemester = buildPriorCodeSets(plannedCourses)

  for (const course of plannedCourses) {
    if (!isConcreteCode(course.normalizedCode)) continue
    const prerequisites = (course.courseDetail?.prerequisites ?? [])
      .map(code => normalizeCode(code, courses))
      .filter(code => isConcreteCode(code) && code !== course.normalizedCode)
    if (prerequisites.length === 0) continue

    const priorCodes = priorBySemester.get(course.semesterIndex) ?? new Set<string>()
    const hasOnePrior = prerequisites.some(code => hasPriorCode(code, priorCodes))
    if (hasOnePrior) continue

    issues.push({
      kind: 'prerequisite',
      severity: 'warning',
      code: course.normalizedCode,
      codes: [course.normalizedCode, ...prerequisites],
      year: course.year,
      sem: course.sem,
      title: `${course.code} may be missing prerequisite preparation`,
      message: `${course.code} lists prerequisite / pre-cursor course(s): ${prerequisites.join(', ')}, but none appears before Year ${course.year} Semester ${course.sem}.`,
      suggestion: `Move at least one prerequisite before ${course.code}, or confirm waiver / equivalent preparation with the department.`,
    })
  }

  return issues
}

function buildLoadIssues(plan: PlanRiskSemester[]): PlanRiskIssue[] {
  const issues: PlanRiskIssue[] = []
  for (const semester of plan) {
    const totalCredits = semester.courses.reduce((sum, course) => sum + (Number(course.credits) || 0), 0)
    const isSummer = termKeyFromSemester(semester.sem) === 'summer'
    const warningLimit = isSummer ? LOAD_LIMITS.summerWarning : LOAD_LIMITS.regularWarning
    const dangerLimit = isSummer ? LOAD_LIMITS.summerDanger : LOAD_LIMITS.regularDanger
    if (totalCredits <= warningLimit) continue

    const severity: PlanRiskSeverity = totalCredits > dangerLimit ? 'danger' : 'warning'
    issues.push({
      kind: 'semester-load',
      severity,
      codes: semester.courses.map(course => course.code),
      year: semester.year,
      sem: semester.sem,
      title: `Year ${semester.year} Semester ${semester.sem} has a heavy load`,
      message: `Year ${semester.year} Semester ${semester.sem} currently has ${totalCredits} CU.`,
      suggestion: severity === 'danger'
        ? `Reduce this semester below ${dangerLimit + 1} CU or confirm overload approval requirements.`
        : 'Consider moving one course to another semester if you want a lighter workload.',
    })
  }
  return issues
}

function isCrossTermProject(course: PlannedCourse): boolean {
  const text = `${course.code} ${course.title ?? ''} ${course.courseDetail?.title ?? ''}`.toLowerCase()
  return (
    /final\s*year\s*project|fyp|thesis|dissertation|internship|placement|capstone|project/.test(text) ||
    /\b\d?499\d\b/.test(course.code)
  )
}

function buildCrossTermIssues(
  plannedCourses: PlannedCourse[],
  splitCourses: PlanRiskInput['splitCourses']
): PlanRiskIssue[] {
  const issues: PlanRiskIssue[] = []
  const byCode = new Map<string, PlannedCourse[]>()
  for (const course of plannedCourses) {
    if (!isConcreteCode(course.normalizedCode)) continue
    byCode.set(course.normalizedCode, [...(byCode.get(course.normalizedCode) ?? []), course])
  }

  const splitCourseCodes = new Set((splitCourses ?? []).map(item => item.code))
  for (const [code, occurrences] of byCode.entries()) {
    if (occurrences.length <= 1) continue
    const plannedCredits = occurrences.reduce((sum, course) => sum + (Number(course.credits) || 0), 0)
    const catalogueCredits = Math.max(...occurrences.map(course => course.courseDetail?.credits ?? 0))
    const recognized = splitCourseCodes.has(code) || occurrences.some(isCrossTermProject) || (catalogueCredits > 0 && plannedCredits <= catalogueCredits)
    if (!recognized) continue
    issues.push({
      kind: 'cross-term-project',
      severity: 'info',
      code,
      codes: [code],
      title: `${code} is treated as a cross-term project`,
      message: `${code} appears in ${occurrences.length} semesters with ${plannedCredits}/${catalogueCredits || plannedCredits} CU planned.`,
      suggestion: 'This looks like a project / internship / thesis style course split across semesters; it is not treated as a duplicate-course conflict.',
    })
  }

  return issues
}

function buildGERisks(ge: PlanRiskInput['ge']): PlanRiskIssue[] {
  const issues: PlanRiskIssue[] = []
  if (!ge) return issues

  if ((ge.missingAreas ?? []).length > 0) {
    issues.push({
      kind: 'ge-area',
      severity: 'warning',
      codes: [],
      title: 'GE Area is still incomplete',
      message: `GE Distributional Requirements still need: ${(ge.missingAreas ?? []).join(', ')}.`,
      suggestion: 'Use the GE helper to choose courses that cover the missing area(s).',
    })
  }
  if ((ge.missingCredits ?? 0) > 0) {
    issues.push({
      kind: 'ge-credits',
      severity: 'warning',
      codes: ge.missingRequiredCodes ?? [],
      title: 'GE credits are still incomplete',
      message: `GE currently has a ${ge.missingCredits} CU gap${ge.missingRequiredCodes?.length ? `; missing required course(s): ${ge.missingRequiredCodes.join(', ')}` : ''}.`,
      suggestion: 'Add required GE courses or distributional GE courses until the requirement is satisfied.',
    })
  }

  return issues
}

function summarizeStatus(issues: PlanRiskIssue[]): PlanRiskStatus {
  if (issues.some(issue => issue.severity === 'danger')) return 'danger'
  if (issues.some(issue => issue.severity === 'warning')) return 'warning'
  return 'ok'
}

export function auditPlanRisks(input: PlanRiskInput): PlanRiskSummary {
  const plannedCourses = flattenPlan(input.plan, input.courses)
  const issues = [
    ...buildOfferingIssues(plannedCourses),
    ...buildPrerequisiteIssues(plannedCourses, input.courses),
    ...buildLoadIssues(input.plan),
    ...buildGERisks(input.ge),
    ...buildCrossTermIssues(plannedCourses, input.splitCourses),
  ]

  return {
    status: summarizeStatus(issues),
    counts: {
      danger: issues.filter(issue => issue.severity === 'danger').length,
      warning: issues.filter(issue => issue.severity === 'warning').length,
      info: issues.filter(issue => issue.severity === 'info').length,
    },
    issues,
  }
}

export function studyPlanToRiskSemesters(studyPlan?: StudyPlan | null): PlanRiskSemester[] {
  if (!studyPlan) return []
  const semesters: PlanRiskSemester[] = []
  const semesterDefs = [
    ['semA', 'A'],
    ['semB', 'B'],
    ['summer', 'Summer'],
  ] as const

  for (const [yearKey, year] of Object.entries(studyPlan)) {
    const yearNumber = Number(yearKey.replace(/^year/, '')) || 0
    for (const [semKey, sem] of semesterDefs) {
      const semester = year?.[semKey]
      if (!semester) continue
      semesters.push({
        year: yearNumber,
        sem,
        courses: semester.courses ?? [],
        totalCredits: semester.credits ?? (semester.courses ?? []).reduce((sum, course) => sum + (Number(course.credits) || 0), 0),
      })
    }
  }

  return semesters
}
