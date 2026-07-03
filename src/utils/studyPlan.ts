import type { Major, Course } from '../types'
import { getCourseLookupCode, isGenericCourseSlot } from './courseCodes.ts'

export interface SemesterPlan {
  year: number
  sem: 'A' | 'B' | 'Summer'
  courses: { code: string; title: string; credits: number; category: string; semester: string }[]
  totalCredits: number
}

function getStudyPlanYears(studyPlan: unknown): { key: string; year: number }[] {
  if (!studyPlan || typeof studyPlan !== 'object') return []
  return Object.keys(studyPlan || {})
    .map(key => {
      const match = key.match(/^year(\d+)$/)
      return match ? { key, year: Number(match[1]) } : null
    })
    .filter((item): item is { key: string; year: number } => Boolean(item))
    .sort((a, b) => a.year - b.year)
}

export function getAllMajorCourses(major: Major, streamIndex?: number): { code: string; title: string; credits: number; category: string }[] {
  const result: { code: string; title: string; credits: number; category: string }[] = []
  const seen = new Set<string>()

  const addCourses = (courses: any[], category: string) => {
    if (!Array.isArray(courses)) return
    for (const c of courses) {
      if (c && c.code && !isGenericCourseSlot(c.code) && !seen.has(c.code)) {
        seen.add(c.code)
        result.push({ code: c.code, title: c.title || c.code, credits: c.credits ?? 0, category })
      }
    }
  }

  // Use stream-specific requirements if available
  const stream = streamIndex != null ? major.streams?.[streamIndex] : undefined
  const reqs = (stream?.requirements ?? major.requirements) as any || {}
  const geCourses = reqs.gatewayEducation?.courses
  const collegeCourses = [
    ...(reqs.college?.courses ?? []),
    ...(reqs.collegeRequirement?.courses ?? []),
  ]
  const coreCourses = reqs.majorCore?.courses
  const electiveCourses = reqs.majorElectives?.courses ?? reqs.majorElective?.courses

  const addCode = (code: string, title?: string, credits?: number) => {
    if (!code || isGenericCourseSlot(code)) return
    const lookupCode = getCourseLookupCode(code)
    if (!lookupCode || isGenericCourseSlot(lookupCode) || seen.has(lookupCode)) return
    seen.add(lookupCode)
    result.push({
      code: lookupCode,
      title: title || lookupCode,
      credits: credits ?? 0,
      category: getCategoryFromRequirements(lookupCode, reqs) ?? inferCategoryFromCode(lookupCode)
    })
  }

  addCourses(geCourses, 'ge')
  addCourses(collegeCourses, 'college')
  addCourses(coreCourses, 'majorCore')
  addCourses(electiveCourses, 'majorElective')

  // Merge allCourses and official studyPlan codes. Several majors keep
  // first-year/supporting courses only in the recommended plan, while elective
  // pools often live only in allCourses.
  const allCourseCodes = stream?.allCourses ?? major.allCourses
  if (Array.isArray(allCourseCodes)) {
    for (const code of allCourseCodes) addCode(code)
  }

  const studyPlan = stream?.studyPlan ?? major.studyPlan
  if (studyPlan) {
    for (const { key: year } of getStudyPlanYears(studyPlan)) {
      for (const sem of ['semA', 'semB', 'summer'] as const) {
        const semester = studyPlan[year]?.[sem]
        if (!semester?.courses) continue
        for (const course of semester.courses) addCode(course.code, course.title, course.credits)
      }
    }
  }

  return result
}

function isCourseInSection(code: string, section: any): boolean {
  if (!Array.isArray(section?.courses)) return false
  return section.courses.some((course: any) => {
    const itemCode = course?.code
    return itemCode === code || getCourseLookupCode(itemCode) === code
  })
}

function getCategoryFromRequirements(code: string, reqs: any): string | null {
  if (isCourseInSection(code, reqs.gatewayEducation)) return 'ge'
  if (isCourseInSection(code, reqs.college) || isCourseInSection(code, reqs.collegeRequirement)) return 'college'
  if (isCourseInSection(code, reqs.majorCore)) return 'majorCore'
  if (isCourseInSection(code, reqs.majorElectives) || isCourseInSection(code, reqs.majorElective)) return 'majorElective'
  return null
}

function inferCategoryFromCode(code: string, title = ''): string {
  if (/college elective/i.test(title)) return 'college'
  if (/free elective|minor/i.test(title)) return 'freeElective'
  if (/(major|stream|finance|marketing|law|crime science|AC|EVE)\s+elective/i.test(title)) return 'majorElective'
  if (/^GE|^DR-\d+/i.test(code)) return 'ge'
  if (/^COLLEGE|^COL-|^CE$|^PIA-COLLEGE$/i.test(code)) return 'college'
  if (/^FREE|^MINOR|^SECOND-MAJOR$/i.test(code)) return 'freeElective'
  if (
    /^ELECTIVE$/i.test(code) ||
    /^MAJOR[-_]?ELECT/i.test(code) ||
    /^STREAM[-_]?ELECT/i.test(code) ||
    /^STREAM-COURSE$/i.test(code) ||
    /^CS-E$/i.test(code) ||
    /-ELECT/i.test(code) ||
    /ELECTIVE/i.test(code) ||
    /-ELEC\d*$/i.test(code)
  ) {
    return 'majorElective'
  }
  if (/^CB|^AC|^EF|^MKT|^IS|^MS|^LW/.test(code)) return 'college'
  if (/^MA|^PHY|^CHEM|^CS1302|^CS1315/.test(code)) return 'college'
  return 'majorCore'
}

function getCategoryForCode(code: string, major: Major, streamIndex?: number): string {
  const stream = streamIndex != null ? major.streams?.[streamIndex] : undefined
  const reqs = (stream?.requirements ?? major.requirements) as any || {}
  const lookupCode = getCourseLookupCode(code)
  const fromReqs = getCategoryFromRequirements(lookupCode, reqs)
  if (fromReqs) return fromReqs
  const inferred = inferCategoryFromCode(code)
  if (inferred) return inferred
  if (/^CA1167$|^SEE1003$|^SEE3002$|^SEE1000$|^SEE2000$|^SEE4000$/.test(code)) return 'college'
  return 'majorCore'
}

export function generateStudyPlan(major: Major, courses: Record<string, Course>, streamIndex?: number): SemesterPlan[] {
  // Use stream-specific study plan if available, otherwise fall back to major's study plan
  const stream = streamIndex != null ? major.streams?.[streamIndex] : undefined
  const studyPlan = stream?.studyPlan ?? major.studyPlan

  // Use official study plan if available
  if (studyPlan) {
    const semesters: SemesterPlan[] = []
    const plan = studyPlan

    const processSemester = (year: number, sem: 'A' | 'B' | 'Summer', data: { courses: { code: string; title: string; credits: number }[]; credits: number }) => {
      const semCourses = data.courses.map(c => {
        const lookupCode = getCourseLookupCode(c.code)
        const course = courses[c.code] || courses[lookupCode]
        return {
          code: c.code,
          title: c.title || course?.title || c.code,
          credits: c.credits ?? course?.credits ?? 0,
          category: getCategoryFromRequirements(lookupCode, (stream?.requirements ?? major.requirements) as any || {})
            ?? inferCategoryFromCode(c.code, c.title || course?.title || ''),
          semester: course?.semester || ''
        }
      })
      semesters.push({
        year,
        sem,
        courses: semCourses,
        totalCredits: data.credits
      })
    }

    for (const { key, year } of getStudyPlanYears(plan)) {
      if (plan[key]?.semA) processSemester(year, 'A', plan[key].semA)
      if (plan[key]?.semB) processSemester(year, 'B', plan[key].semB)
      if (plan[key]?.summer) processSemester(year, 'Summer', plan[key].summer)
    }

    // Add empty Summer semesters for each year that has courses
    const yearNumbers = getStudyPlanYears(plan).map(item => item.year)
    for (const year of yearNumbers) {
      const hasAny = semesters.some(s => s.year === year)
      if (hasAny && !semesters.some(s => s.year === year && s.sem === 'Summer')) {
        semesters.push({ year, sem: 'Summer', courses: [], totalCredits: 0 })
      }
    }

    // Sort: A, B, Summer
    const semOrder = { 'A': 0, 'B': 1, 'Summer': 2 }
    semesters.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year
      return semOrder[a.sem] - semOrder[b.sem]
    })

    return semesters
  }

  // Fallback heuristic
  const semesters: SemesterPlan[] = []

  for (let year = 1; year <= 4; year++) {
    semesters.push({ year, sem: 'A', courses: [], totalCredits: 0 })
    semesters.push({ year, sem: 'B', courses: [], totalCredits: 0 })
    semesters.push({ year, sem: 'Summer', courses: [], totalCredits: 0 })
  }

  const allCourses = getAllMajorCourses(major)

  for (const courseInfo of allCourses) {
    const course = courses[courseInfo.code]
    if (!course) continue

    const levelMatch = courseInfo.code.match(/\d(\d)/)
    let year = levelMatch ? parseInt(levelMatch[1]) : 1
    if (year < 1) year = 1
    if (year > 4) year = 4

    let sem: 'A' | 'B' = 'A'
    const semText = course.semester?.toLowerCase() || ''
    if (semText.includes('semester b') && !semText.includes('semester a')) {
      sem = 'B'
    } else if (semText.includes('semester a') && !semText.includes('semester b')) {
      sem = 'A'
    } else {
      const semA = semesters.find(s => s.year === year && s.sem === 'A')!
      const semB = semesters.find(s => s.year === year && s.sem === 'B')!
      sem = semA.totalCredits <= semB.totalCredits ? 'A' : 'B'
    }

    const target = semesters.find(s => s.year === year && s.sem === sem)!
    target.courses.push({
      code: courseInfo.code,
      title: course.title || courseInfo.title || courseInfo.code,
      credits: course.credits ?? courseInfo.credits ?? 0,
      category: courseInfo.category,
      semester: course.semester || ''
    })
    target.totalCredits += course.credits ?? courseInfo.credits ?? 0
  }

  return semesters.filter(s => s.courses.length > 0)
}

export function getCreditStatus(totalCredits: number): { status: 'ok' | 'warning' | 'danger'; message: string } {
  if (totalCredits > 21) {
    return { status: 'danger', message: '超出最高学分限制（21 CU）' }
  }
  if (totalCredits > 18) {
    return { status: 'warning', message: '超出正常限制，需申请ARRO批准（上限21 CU）' }
  }
  return { status: 'ok', message: '学分在正常范围内（≤18 CU）' }
}

export function getCategoryColor(category: string): string {
  switch (category) {
    case 'ge': return 'bg-blue-50 border-blue-200 text-blue-800'
    case 'college': return 'bg-purple-50 border-purple-200 text-purple-800'
    case 'majorCore': return 'bg-emerald-50 border-emerald-200 text-emerald-800'
    case 'majorElective': return 'bg-amber-50 border-amber-200 text-amber-800'
    case 'freeElective': return 'bg-slate-50 border-slate-200 text-slate-700'
    default: return 'bg-gray-50 border-gray-200 text-gray-800'
  }
}

export function getCategoryLabel(category: string): string {
  switch (category) {
    case 'ge': return '通识教育'
    case 'college': return '学院/学系要求'
    case 'majorCore': return '专业核心'
    case 'majorElective': return '专业选修'
    case 'freeElective': return '自由选修'
    default: return '其他'
  }
}
