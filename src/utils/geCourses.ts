import { getGEArea, isRequiredGE } from './editPlan.ts'

export const GE_AREA_ORDER = ['Area 1', 'Area 2', 'Area 3', 'University Req.', '未标注']

export const GE_AREA_LABELS: Record<string, string> = {
  'Area 1': 'Arts and Humanities',
  'Area 2': 'Study of Societies, Social and Business Organisations',
  'Area 3': 'Science and Technology',
  'University Req.': 'University Requirements',
  '未标注': 'Area not confirmed',
}

export interface GECourseSummary {
  code: string
  title: string
  credits: number
  area: string
  offeringUnit: string
  level: string
  terms: string[]
  sourceUrl: string
  continuousPercent: number
  examPercent: number
  hasFinalExam: boolean
  hasAssessment: boolean
  course: any
}

export interface GEAreaGroup {
  area: string
  label: string
  count: number
  withExamCount: number
  noExamCount: number
}

export interface GEAreaSummary {
  total: number
  groups: GEAreaGroup[]
}

export interface GEFilters {
  query: string
  area: string
  exam: 'any' | 'has-exam' | 'no-exam'
}

function parsePercent(value: unknown): number {
  if (typeof value !== 'string') return 0
  const match = value.match(/(\d{1,3})\s*%/)
  if (!match) return 0
  const parsed = Number(match[1])
  return Number.isFinite(parsed) ? parsed : 0
}

function inferArea(course: any): string {
  const explicitArea = course?.geArea || course?.area
  if (explicitArea) return explicitArea

  const code = String(course?.code ?? '').toUpperCase()
  if (isRequiredGE(code)) return 'University Req.'
  return getGEArea(code) || '未标注'
}

function hasOfficialExamFlag(course: any): boolean {
  return String(course?.geWithExam ?? '').toLowerCase() === 'yes'
}

function normalizeTerms(course: any): string[] {
  if (Array.isArray(course?.geTerms)) return course.geTerms.filter(Boolean)
  if (course?.semester) return [course.semester]
  return []
}

function sortArea(a: string, b: string): number {
  const indexA = GE_AREA_ORDER.indexOf(a)
  const indexB = GE_AREA_ORDER.indexOf(b)
  if (indexA !== -1 || indexB !== -1) {
    return (indexA === -1 ? GE_AREA_ORDER.length : indexA) - (indexB === -1 ? GE_AREA_ORDER.length : indexB)
  }
  return a.localeCompare(b)
}

export function getGECourses(courses: Record<string, any>): GECourseSummary[] {
  return Object.values(courses)
    .filter((course: any) => /^GE\d{4}$/i.test(course?.code ?? ''))
    .map((course: any) => {
      const continuousPercent = parsePercent(course.assessment?.continuous)
      const examPercent = parsePercent(course.assessment?.exam)
      const hasFinalExam = examPercent > 0 || hasOfficialExamFlag(course)
      const offeringUnit = course.offeringUnit || course.department || ''
      return {
        code: course.code,
        title: course.title,
        credits: course.credits ?? 0,
        area: inferArea(course),
        offeringUnit,
        level: course.geLevel || '',
        terms: normalizeTerms(course),
        sourceUrl: course.geSourceUrl || course.courseUrl || '',
        continuousPercent,
        examPercent,
        hasFinalExam,
        hasAssessment: Boolean(continuousPercent || examPercent || hasFinalExam || course.assessment?.details),
        course,
      }
    })
    .sort((a, b) => a.code.localeCompare(b.code))
}

export function summarizeGEAreas(items: GECourseSummary[]): GEAreaSummary {
  const groups = new Map<string, GEAreaGroup>()
  for (const item of items) {
    const group = groups.get(item.area) ?? {
      area: item.area,
      label: GE_AREA_LABELS[item.area] || item.area,
      count: 0,
      withExamCount: 0,
      noExamCount: 0,
    }
    group.count += 1
    if (item.hasFinalExam) {
      group.withExamCount += 1
    } else {
      group.noExamCount += 1
    }
    groups.set(item.area, group)
  }

  return {
    total: items.length,
    groups: Array.from(groups.values()).sort((a, b) => sortArea(a.area, b.area)),
  }
}

export function filterGECourses(items: GECourseSummary[], filters: GEFilters): GECourseSummary[] {
  const query = filters.query.trim().toLowerCase()
  return items.filter((item) => {
    if (filters.area !== 'all' && item.area !== filters.area) return false
    if (filters.exam === 'has-exam' && !item.hasFinalExam) return false
    if (filters.exam === 'no-exam' && item.hasFinalExam) return false
    if (query && !`${item.code} ${item.title} ${item.offeringUnit} ${item.terms.join(' ')}`.toLowerCase().includes(query)) return false
    return true
  })
}
