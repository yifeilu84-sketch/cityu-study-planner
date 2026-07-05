import { getCourseLookupCode, isGenericCourseSlot } from './courseCodes.ts'
import { getStudyPlanSourceStatus, type SourceStatusKind } from './sourceStatus.ts'

export interface RequirementRow {
  key: string
  label: string
  credits: number
}

export interface MajorCompareItem {
  code: string
  title: string
  degree: string
  college: string
  department: string
  totalCredits: number
  sourceKind: SourceStatusKind
  sourceLabel: string
  sourceDescription: string
  sourceUrl?: string
  requirementRows: RequirementRow[]
  concreteCourseCount: number
  hasProject: boolean
  hasInternship: boolean
}

export interface MajorOverlap {
  code: string
  majorCodes: string[]
}

export interface MajorComparison {
  items: MajorCompareItem[]
  overlaps: MajorOverlap[]
  sourceCounts: Record<SourceStatusKind, number>
}

export interface CompareCandidate {
  code: string
  title: string
  college?: string
  department?: string
  sourceKind: SourceStatusKind
  totalCredits?: number
}

const REQUIREMENT_DEFS = [
  { key: 'gatewayEducation', label: 'GE', keys: ['gatewayEducation'] },
  { key: 'college', label: 'College / School', keys: ['college'] },
  { key: 'collegeRequirement', label: 'College Specified', keys: ['collegeRequirement'] },
  { key: 'majorCore', label: 'Major Core', keys: ['majorCore'] },
  { key: 'majorElectives', label: 'Major Electives', keys: ['majorElectives', 'majorElective'] },
  { key: 'freeElectives', label: 'Free Electives', keys: ['freeElectives', 'freeElective'] },
] as const

function readRequirementSection(reqs: any, keys: readonly string[]): { credits: number; courses: any[] } {
  for (const key of keys) {
    const raw = reqs?.[key]
    if (typeof raw === 'number') return { credits: raw, courses: [] }
    if (raw && typeof raw === 'object') {
      return {
        credits: raw.credits ?? 0,
        courses: Array.isArray(raw.courses) ? raw.courses : [],
      }
    }
  }
  return { credits: 0, courses: [] }
}

function addConcreteCode(target: Set<string>, rawCode: unknown) {
  if (typeof rawCode !== 'string') return
  const lookupCode = getCourseLookupCode(rawCode)
  if (!lookupCode || isGenericCourseSlot(lookupCode) || isGenericCourseSlot(rawCode)) return
  target.add(lookupCode)
}

function collectStudyPlanCourses(entity: any): any[] {
  const result: any[] = []
  for (const year of Object.values(entity?.studyPlan ?? {})) {
    for (const semester of Object.values(year as Record<string, any>)) {
      if (Array.isArray(semester?.courses)) result.push(...semester.courses)
    }
  }
  return result
}

function collectCourseFacts(major: any): { codes: Set<string>; text: string } {
  const codes = new Set<string>()
  const textParts: string[] = []

  const includeCourse = (course: any) => {
    if (!course) return
    addConcreteCode(codes, course.code)
    textParts.push(course.code, course.title, course.remarks)
  }

  for (const def of REQUIREMENT_DEFS) {
    const section = readRequirementSection(major.requirements, def.keys)
    for (const course of section.courses) includeCourse(course)
  }

  for (const code of major.allCourses ?? []) addConcreteCode(codes, code)
  for (const course of collectStudyPlanCourses(major)) includeCourse(course)

  for (const stream of major.streams ?? []) {
    for (const def of REQUIREMENT_DEFS) {
      const section = readRequirementSection(stream.requirements, def.keys)
      for (const course of section.courses) includeCourse(course)
    }
    for (const code of stream.allCourses ?? []) addConcreteCode(codes, code)
    for (const course of collectStudyPlanCourses(stream)) includeCourse(course)
  }

  return { codes, text: textParts.filter(Boolean).join(' ') }
}

function buildRequirementRows(major: any): RequirementRow[] {
  return REQUIREMENT_DEFS
    .map(def => {
      const section = readRequirementSection(major.requirements, def.keys)
      return { key: def.key, label: def.label, credits: section.credits }
    })
    .filter(row => row.credits > 0)
}

function toCompareItem(major: any): { item: MajorCompareItem; codes: Set<string> } {
  const source = getStudyPlanSourceStatus(major)
  const facts = collectCourseFacts(major)
  const factText = facts.text.toLowerCase()
  const hasProject = /final year project|\bfyp\b|capstone|\bproject\b/i.test(factText) || [...facts.codes].some(code => /(?:4996|4997|4998|4999)$/.test(code))
  const hasInternship = /internship|industrial attachment|training|placement/i.test(factText)

  return {
    item: {
      code: major.code,
      title: major.title,
      degree: major.degree,
      college: major.college,
      department: major.department,
      totalCredits: major.totalCredits ?? 0,
      sourceKind: source.kind,
      sourceLabel: source.label,
      sourceDescription: source.description,
      sourceUrl: source.sourceUrl,
      requirementRows: buildRequirementRows(major),
      concreteCourseCount: facts.codes.size,
      hasProject,
      hasInternship,
    },
    codes: facts.codes,
  }
}

function buildOverlaps(selected: { item: MajorCompareItem; codes: Set<string> }[]): MajorOverlap[] {
  const byCode = new Map<string, string[]>()
  for (const entry of selected) {
    for (const code of entry.codes) {
      if (/^GE\d{4}$/i.test(code)) continue
      const owners = byCode.get(code) ?? []
      owners.push(entry.item.code)
      byCode.set(code, owners)
    }
  }

  return [...byCode.entries()]
    .filter(([, majorCodes]) => majorCodes.length > 1)
    .map(([code, majorCodes]) => ({ code, majorCodes }))
    .sort((a, b) => b.majorCodes.length - a.majorCodes.length || a.code.localeCompare(b.code))
}

export function buildMajorComparison(majors: any[], codes: string[]): MajorComparison {
  const selectedCodes = [...new Set(codes)].slice(0, 3)
  const selected = selectedCodes
    .map(code => majors.find(major => major.code === code))
    .filter(Boolean)
    .map(toCompareItem)

  const sourceCounts: Record<SourceStatusKind, number> = {
    official: 0,
    structure: 0,
    derived: 0,
    diy: 0,
  }

  for (const entry of selected) {
    sourceCounts[entry.item.sourceKind] += 1
  }

  return {
    items: selected.map(entry => entry.item),
    overlaps: buildOverlaps(selected),
    sourceCounts,
  }
}

export function findCompareCandidates(
  majors: any[],
  query: string,
  selectedCodes: string[] = [],
  limit = 8
): CompareCandidate[] {
  const selected = new Set(selectedCodes)
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return []

  return majors
    .filter(major => !selected.has(major.code))
    .map(major => {
      const source = getStudyPlanSourceStatus(major)
      return {
        major,
        source,
        haystack: [major.code, major.title, major.degree, major.college, major.department].filter(Boolean).join(' ').toLowerCase(),
      }
    })
    .filter(entry => entry.haystack.includes(normalizedQuery))
    .sort((a, b) => {
      const aCode = a.major.code.toLowerCase() === normalizedQuery ? 0 : 1
      const bCode = b.major.code.toLowerCase() === normalizedQuery ? 0 : 1
      return aCode - bCode || a.major.title.localeCompare(b.major.title)
    })
    .slice(0, limit)
    .map(({ major, source }) => ({
      code: major.code,
      title: major.title,
      college: major.college,
      department: major.department,
      sourceKind: source.kind,
      totalCredits: major.totalCredits,
    }))
}
