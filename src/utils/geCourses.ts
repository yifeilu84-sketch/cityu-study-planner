export interface GECourseSummary {
  code: string
  title: string
  credits: number
  area: string
  continuousPercent: number
  examPercent: number
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
  return course?.area || course?.geArea || '未标注'
}

export function getGECourses(courses: Record<string, any>): GECourseSummary[] {
  return Object.values(courses)
    .filter((course: any) => /^GE\d{4}$/i.test(course?.code ?? ''))
    .map((course: any) => {
      const continuousPercent = parsePercent(course.assessment?.continuous)
      const examPercent = parsePercent(course.assessment?.exam)
      return {
        code: course.code,
        title: course.title,
        credits: course.credits ?? 0,
        area: inferArea(course),
        continuousPercent,
        examPercent,
        hasAssessment: Boolean(continuousPercent || examPercent || course.assessment?.details),
        course,
      }
    })
    .sort((a, b) => a.code.localeCompare(b.code))
}

export function filterGECourses(items: GECourseSummary[], filters: GEFilters): GECourseSummary[] {
  const query = filters.query.trim().toLowerCase()
  return items.filter((item) => {
    if (filters.area !== 'all' && item.area !== filters.area) return false
    if (filters.exam === 'has-exam' && item.examPercent <= 0) return false
    if (filters.exam === 'no-exam' && item.examPercent > 0) return false
    if (query && !`${item.code} ${item.title}`.toLowerCase().includes(query)) return false
    return true
  })
}
