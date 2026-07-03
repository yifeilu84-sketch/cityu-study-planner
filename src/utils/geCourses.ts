import { getGEArea, isRequiredGE } from './editPlan.ts'

export interface GECourseSummary {
  code: string
  title: string
  credits: number
  area: string
  continuousPercent: number
  examPercent: number
  hasFinalExam: boolean
  hasAssessment: boolean
  course: any
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

export function getGECourses(courses: Record<string, any>): GECourseSummary[] {
  return Object.values(courses)
    .filter((course: any) => /^GE\d{4}$/i.test(course?.code ?? ''))
    .map((course: any) => {
      const continuousPercent = parsePercent(course.assessment?.continuous)
      const examPercent = parsePercent(course.assessment?.exam)
      const hasFinalExam = examPercent > 0 || hasOfficialExamFlag(course)
      return {
        code: course.code,
        title: course.title,
        credits: course.credits ?? 0,
        area: inferArea(course),
        continuousPercent,
        examPercent,
        hasFinalExam,
        hasAssessment: Boolean(continuousPercent || examPercent || hasFinalExam || course.assessment?.details),
        course,
      }
    })
    .sort((a, b) => a.code.localeCompare(b.code))
}

export function filterGECourses(items: GECourseSummary[], filters: GEFilters): GECourseSummary[] {
  const query = filters.query.trim().toLowerCase()
  return items.filter((item) => {
    if (filters.area !== 'all' && item.area !== filters.area) return false
    if (filters.exam === 'has-exam' && !item.hasFinalExam) return false
    if (filters.exam === 'no-exam' && item.hasFinalExam) return false
    if (query && !`${item.code} ${item.title}`.toLowerCase().includes(query)) return false
    return true
  })
}
