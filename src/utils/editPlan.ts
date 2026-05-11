import type { Course } from '../types'

export interface PlanCourse {
  code: string
  title: string
  credits: number
  category: string
}

export interface EditableSemester {
  year: number
  sem: 'A' | 'B' | 'Summer'
  courses: PlanCourse[]
  totalCredits: number
}

/** Required GE courses that are not part of Area 1-3 electives (includes discipline-specific English) */
export const REQUIRED_GE_CODES = ['GE1401', 'GE1501', 'GE1601', 'GE2401', 'GE2402', 'GE2410', 'GE2411', 'GE2412', 'GE2413']

/** Discipline-specific English courses */
export const DSE_CODES = ['GE2401', 'GE2402', 'GE2410', 'GE2411', 'GE2412', 'GE2413']

/** Get GE Area from code based on the 2nd digit after GE (index 3).
 *  GE1322 -> '3' -> Area 3
 *  GE1138 -> '1' -> Area 1
 *  GE2262 -> '2' -> Area 2
 *  GE24xx -> DSE (not an area elective)
 *  Ignores placeholders like GE-1, GE-ELECTIVE
 */
export function getGEArea(code: string): string | null {
  if (!/^GE\d{4}$/.test(code)) return null
  if (REQUIRED_GE_CODES.includes(code)) return null

  const digit = code[3]
  if (digit === '1') return 'Area 1'
  if (digit === '2') return 'Area 2'
  if (digit === '3') return 'Area 3'
  // digit '4' = DSE (discipline-specific English)
  return null
}

/** Check if a course is a required GE course */
export function isRequiredGE(code: string): boolean {
  return REQUIRED_GE_CODES.includes(code)
}

/** Check if a course is Discipline-specific English */
export function isDSE(code: string): boolean {
  return DSE_CODES.includes(code)
}

/** Check if a course can be added to a semester given prerequisite constraints */
export function canAddCourse(
  courseCode: string,
  target: { year: number; sem: 'A' | 'B' | 'Summer' },
  plan: EditableSemester[],
  courses: Record<string, Course>
): { ok: boolean; reason?: string } {
  const course = courses[courseCode]
  if (!course) return { ok: true }

  // Check if already in plan
  const alreadyInPlan = plan.some(s => s.courses.some(c => c.code === courseCode))
  if (alreadyInPlan) return { ok: false, reason: '该课程已在学习计划中' }

  // Check prerequisites
  if (course.prerequisites && course.prerequisites.length > 0) {
    const priorCodes = getPriorCourseCodes(target, plan)
    for (const prereq of course.prerequisites) {
      if (!priorCodes.has(prereq)) {
        return { ok: false, reason: `前置课程 ${prereq} 未修完` }
      }
    }
  }

  return { ok: true }
}

/** Get all course codes in semesters before the target semester */
function getPriorCourseCodes(
  target: { year: number; sem: 'A' | 'B' | 'Summer' },
  plan: EditableSemester[]
): Set<string> {
  const result = new Set<string>()
  const semOrder = { 'A': 0, 'B': 1, 'Summer': 2 }
  for (const s of plan) {
    if (s.year < target.year) {
      s.courses.forEach(c => result.add(c.code))
    } else if (s.year === target.year && semOrder[s.sem] < semOrder[target.sem]) {
      s.courses.forEach(c => result.add(c.code))
    }
  }
  return result
}

/** Recalculate total credits for a semester */
export function recalcCredits(sem: EditableSemester): number {
  return sem.courses.reduce((sum, c) => sum + (c.credits || 0), 0)
}

/** Build the course pool from major requirements + all available GE electives + minor courses */
export function buildCoursePool(
  major: any,
  courses: Record<string, Course>,
  minorCourses?: string[]
): PlanCourse[] {
  const result: PlanCourse[] = []
  const seen = new Set<string>()

  const add = (code: string, category?: string) => {
    if (seen.has(code)) return
    // Skip placeholder GE codes like GE-1, GE-ELECTIVE, GE
    if (code.startsWith('GE') && !/^GE\d{4}$/.test(code)) return
    seen.add(code)
    const c = courses[code] || courses[code.split(/[\s\/]/)[0]]
    if (c) {
      result.push({
        code: c.code,
        title: c.title,
        credits: c.credits || 0,
        category: category || getCategoryForCode(c.code, major)
      })
    } else if (minorCourses?.includes(code)) {
      // Minor course not in main courses database
      result.push({
        code,
        title: code,
        credits: 3,
        category: category || 'majorElective'
      })
    }
  }

  // Add all required courses from major
  const reqs = major.requirements || {}
  const addReqs = (reqArr: any[]) => {
    if (!Array.isArray(reqArr)) return
    for (const c of reqArr) {
      if (c?.code) add(c.code)
    }
  }
  addReqs(reqs.gatewayEducation?.courses)
  addReqs(reqs.college?.courses ?? reqs.collegeRequirement?.courses)
  addReqs(reqs.majorCore?.courses)
  addReqs(reqs.majorElectives?.courses ?? reqs.majorElective?.courses)

  // Add allCourses if flat structure
  if (major.allCourses && Array.isArray(major.allCourses)) {
    for (const code of major.allCourses) {
      if (typeof code === 'string') add(code)
    }
  }

  // Add all GE electives (Area 1-3)
  for (const [code, c] of Object.entries(courses)) {
    if (getGEArea(code)) {
      add(code)
    }
  }

  // Add required GE and DSE courses
  for (const code of [...REQUIRED_GE_CODES, ...DSE_CODES]) {
    add(code)
  }

  // Add minor courses
  if (minorCourses) {
    for (const code of minorCourses) {
      add(code, 'majorElective')
    }
  }

  return result
}

function getCategoryForCode(code: string, major: any): string {
  const reqs = major.requirements || {}
  const inReq = (arr: any[]) => arr?.some((c: any) => c?.code === code)
  if (inReq(reqs.gatewayEducation?.courses)) return 'ge'
  if (inReq(reqs.college?.courses) || inReq(reqs.collegeRequirement?.courses)) return 'college'
  if (inReq(reqs.majorCore?.courses)) return 'majorCore'
  if (inReq(reqs.majorElectives?.courses) || inReq(reqs.majorElective?.courses)) return 'majorElective'
  if (code.startsWith('GE')) return 'ge'
  return 'majorElective'
}
