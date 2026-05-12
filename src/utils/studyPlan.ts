import type { Major, Course } from '../types'

export interface SemesterPlan {
  year: number
  sem: 'A' | 'B' | 'Summer'
  courses: { code: string; title: string; credits: number; category: string; semester: string }[]
  totalCredits: number
}

export function getAllMajorCourses(major: Major, streamIndex?: number): { code: string; title: string; credits: number; category: string }[] {
  const result: { code: string; title: string; credits: number; category: string }[] = []
  const seen = new Set<string>()

  const addCourses = (courses: any[], category: string) => {
    if (!Array.isArray(courses)) return
    for (const c of courses) {
      if (c && c.code && !seen.has(c.code)) {
        seen.add(c.code)
        result.push({ code: c.code, title: c.title || c.code, credits: c.credits || 0, category })
      }
    }
  }

  // Use stream-specific requirements if available
  const stream = streamIndex != null ? major.streams?.[streamIndex] : undefined
  const reqs = (stream?.requirements ?? major.requirements) as any || {}
  const geCourses = reqs.gatewayEducation?.courses
  const collegeCourses = reqs.college?.courses ?? reqs.collegeRequirement?.courses
  const coreCourses = reqs.majorCore?.courses
  const electiveCourses = reqs.majorElectives?.courses ?? reqs.majorElective?.courses

  addCourses(geCourses, 'ge')
  addCourses(collegeCourses, 'college')
  addCourses(coreCourses, 'majorCore')
  addCourses(electiveCourses, 'majorElective')

  // Fallback: if no courses found but allCourses exists, use studyPlan or allCourses
  if (result.length === 0 && Array.isArray(major.allCourses) && major.allCourses.length > 0) {
    const allCourseCodes = stream?.allCourses ?? major.allCourses
    for (const code of allCourseCodes) {
      if (!seen.has(code)) {
        seen.add(code)
        let category = 'majorCore'
        if (/^GE/.test(code)) category = 'ge'
        else if (/^CB|^AC|^EF|^MKT|^IS/.test(code)) category = 'college'
        else if (/^MA|^EN|^LC|^PHY|^CHEM/.test(code)) category = 'ge'
        result.push({ code, title: code, credits: 0, category })
      }
    }
  }

  return result
}

function getCategoryForCode(code: string, major: Major, streamIndex?: number): string {
  const all = getAllMajorCourses(major, streamIndex)
  const found = all.find(c => c.code === code || code.startsWith(c.code.split(' ')[0]))
  if (found) return found.category
  if (/^GE/.test(code)) return 'ge'
  if (/^CA1167$|^SEE1003$|^SEE3002$|^SEE1000$|^SEE2000$|^SEE4000$/.test(code)) return 'college'
  if (/^ELECTIVE$|^MAJOR-ELECTIVE/.test(code)) return 'majorElective'
  if (/^MINOR/.test(code)) return 'college'
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

    const processSemester = (year: number, sem: 'A' | 'B', data: { courses: { code: string; title: string; credits: number }[]; credits: number }) => {
      const semCourses = data.courses.map(c => {
        const course = courses[c.code] || courses[c.code.split(' ')[0]]
        return {
          code: c.code,
          title: c.title || course?.title || c.code,
          credits: c.credits || course?.credits || 0,
          category: getCategoryForCode(c.code, major, streamIndex),
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

    if (plan.year1?.semA) processSemester(1, 'A', plan.year1.semA)
    if (plan.year1?.semB) processSemester(1, 'B', plan.year1.semB)
    if (plan.year2?.semA) processSemester(2, 'A', plan.year2.semA)
    if (plan.year2?.semB) processSemester(2, 'B', plan.year2.semB)
    if (plan.year3?.semA) processSemester(3, 'A', plan.year3.semA)
    if (plan.year3?.semB) processSemester(3, 'B', plan.year3.semB)
    if (plan.year4?.semA) processSemester(4, 'A', plan.year4.semA)
    if (plan.year4?.semB) processSemester(4, 'B', plan.year4.semB)

    // Add empty Summer semesters for each year that has courses
    for (let year = 1; year <= 4; year++) {
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
      credits: course.credits || courseInfo.credits || 0,
      category: courseInfo.category,
      semester: course.semester || ''
    })
    target.totalCredits += course.credits || courseInfo.credits || 0
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
    default: return 'bg-gray-50 border-gray-200 text-gray-800'
  }
}

export function getCategoryLabel(category: string): string {
  switch (category) {
    case 'ge': return '通识教育'
    case 'college': return '学院/学系要求'
    case 'majorCore': return '专业核心'
    case 'majorElective': return '专业选修'
    default: return '其他'
  }
}
