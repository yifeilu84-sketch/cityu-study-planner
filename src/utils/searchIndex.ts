import { getCourseLookupCode, isGenericCourseSlot } from './courseCodes.ts'
import { getStudyPlanSourceStatus, type SourceStatusKind } from './sourceStatus.ts'
import { academicProfileSearchText, scoreAcademicProfile, type AcademicSearchableProfile } from './academicProfiles.ts'

type AcademicProfileIndexInput = AcademicSearchableProfile & {
  id: string
  collegeName?: string
  collegeNameEn?: string
  departmentName?: string
  departmentNameEn?: string
}

type AcademicProfileIndexData = AcademicProfileIndexInput[] | { profiles?: AcademicProfileIndexInput[] }

export interface SearchMajorItem {
  type: 'major'
  code: string
  title: string
  college: string
  department?: string
  url?: string
  sourceKind: SourceStatusKind
  searchText: string
}

export interface SearchCourseItem {
  type: 'course'
  code: string
  title: string
  credits: number
  department?: string
  relatedMajorCount: number
  searchText: string
}

export interface SearchPostgraduateProgrammeItem {
  type: 'postgraduate-programme'
  code: string
  title: string
  award: string
  programmeType: string
  college: string
  department: string
  sourceKind: string
  searchText: string
}

export interface SearchPostgraduateCourseItem {
  type: 'pg-course'
  code: string
  title: string
  credits: number
  department?: string
  detailStatus?: string
  searchText: string
}

export interface SearchAcademicProfileItem {
  type: 'academic-profile'
  id: string
  name: string
  nameCN?: string
  title?: string
  college: string
  department: string
  ugWelcome: boolean
  studentCount: number
  publicationCount: number
  interests: string[]
  searchText: string
}

export interface SearchIndex {
  majors: SearchMajorItem[]
  courses: SearchCourseItem[]
  postgraduateProgrammes: SearchPostgraduateProgrammeItem[]
  pgCourses: SearchPostgraduateCourseItem[]
  academicProfiles: SearchAcademicProfileItem[]
}

export interface SearchResults {
  majors: SearchMajorItem[]
  courses: SearchCourseItem[]
  postgraduateProgrammes: SearchPostgraduateProgrammeItem[]
  pgCourses: SearchPostgraduateCourseItem[]
  academicProfiles: SearchAcademicProfileItem[]
}

function normalise(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim()
}

function collectMajorCodes(major: any): Set<string> {
  const codes = new Set<string>()
  const add = (code: unknown) => {
    if (typeof code !== 'string') return
    const lookupCode = getCourseLookupCode(code)
    if (!lookupCode || isGenericCourseSlot(lookupCode)) return
    codes.add(lookupCode)
  }

  for (const code of major?.allCourses ?? []) add(code)
  for (const section of Object.values(major?.requirements ?? {})) {
    for (const course of (section as any)?.courses ?? []) add(course?.code)
  }
  for (const year of Object.values(major?.studyPlan ?? {})) {
    for (const semester of Object.values(year as any)) {
      for (const course of (semester as any)?.courses ?? []) add(course?.code)
    }
  }
  for (const stream of major?.streams ?? []) {
    for (const code of stream?.allCourses ?? []) add(code)
    for (const section of Object.values(stream?.requirements ?? {})) {
      for (const course of (section as any)?.courses ?? []) add(course?.code)
    }
    for (const year of Object.values(stream?.studyPlan ?? {})) {
      for (const semester of Object.values(year as any)) {
        for (const course of (semester as any)?.courses ?? []) add(course?.code)
      }
    }
  }

  return codes
}

function score(searchText: string, query: string, code?: string): number {
  if (!query) return 0
  const lowerCode = code?.toLowerCase() ?? ''
  if (lowerCode === query) return 100
  if (lowerCode.startsWith(query)) return 80
  if (searchText.includes(query)) return 40
  return 0
}

export function buildSearchIndex(
  majors: any[],
  courses: Record<string, any>,
  postgraduateProgrammes: any[] = [],
  pgCourses: Record<string, any> = {},
  academicProfilesData: AcademicProfileIndexData = { profiles: [] },
): SearchIndex {
  const majorItems: SearchMajorItem[] = majors.map((major) => ({
    type: 'major',
    code: major.code,
    title: major.title,
    college: major.college,
    department: major.department,
    url: major.url,
    sourceKind: getStudyPlanSourceStatus(major).kind,
    searchText: normalise([major.code, major.title, major.college, major.department, major.degree].filter(Boolean).join(' ')),
  }))

  const related = new Map<string, { code: string; title: string }[]>()
  for (const major of majors) {
    for (const code of collectMajorCodes(major)) {
      if (!related.has(code)) related.set(code, [])
      const list = related.get(code)!
      if (!list.some((item) => item.code === major.code)) {
        list.push({ code: major.code, title: major.title })
      }
    }
  }

  const courseItems: SearchCourseItem[] = Object.values(courses)
    .filter((course: any) => course?.code && !isGenericCourseSlot(course.code))
    .map((course: any) => ({
      type: 'course',
      code: course.code,
      title: course.title,
      credits: course.credits ?? 0,
      department: course.department,
      relatedMajorCount: related.get(course.code)?.length ?? 0,
      searchText: normalise([course.code, course.title, course.department].filter(Boolean).join(' ')),
    }))

  const postgraduateProgrammeItems: SearchPostgraduateProgrammeItem[] = postgraduateProgrammes.map((programme) => {
    const requirementCourseText = (programme.requirements?.sections ?? [])
      .flatMap((section: any) => (section.courses ?? []).flatMap((course: any) => [course.code, course.title]))

    return {
      type: 'postgraduate-programme',
      code: programme.code,
      title: programme.title,
      award: programme.award,
      programmeType: programme.type,
      college: programme.college,
      department: programme.department,
      sourceKind: programme.sourceStatus?.kind ?? 'unknown',
      searchText: normalise([
        programme.code,
        programme.title,
        programme.award,
        programme.type,
        programme.college,
        programme.department,
        ...(programme.researchAreas ?? []),
        ...(programme.allCourses ?? []),
        ...requirementCourseText,
      ].filter(Boolean).join(' ')),
    }
  })

  const postgraduateCourseItems: SearchPostgraduateCourseItem[] = Object.values(pgCourses)
    .filter((course: any) => course?.code && !isGenericCourseSlot(course.code))
    .map((course: any) => ({
      type: 'pg-course',
      code: course.code,
      title: course.title,
      credits: course.credits ?? 0,
      department: course.department,
      detailStatus: course.detailStatus,
      searchText: normalise([course.code, course.title, course.department].filter(Boolean).join(' ')),
    }))

  const academicProfiles = Array.isArray(academicProfilesData)
    ? academicProfilesData
    : (academicProfilesData?.profiles ?? [])

  const academicProfileItems: SearchAcademicProfileItem[] = academicProfiles
    .filter((profile) => profile?.id && profile?.name)
    .map((profile) => ({
      type: 'academic-profile',
      id: profile.id,
      name: profile.name,
      nameCN: profile.nameCN,
      title: profile.title,
      college: profile.collegeNameEn || profile.collegeName || '',
      department: profile.departmentNameEn || profile.departmentName || '',
      ugWelcome: Boolean(profile.ugWelcome),
      studentCount: profile.studentCount ?? 0,
      publicationCount: profile.publicationCount ?? 0,
      interests: (profile.interests ?? []).slice(0, 4),
      searchText: normalise(academicProfileSearchText(profile)),
    }))

  return {
    majors: majorItems,
    courses: courseItems,
    postgraduateProgrammes: postgraduateProgrammeItems,
    pgCourses: postgraduateCourseItems,
    academicProfiles: academicProfileItems,
  }
}

export function searchPlanner(index: SearchIndex, query: string, options: { limit?: number; sourceKind?: SourceStatusKind | 'all' } = {}): SearchResults {
  const q = normalise(query)
  const limit = options.limit ?? 8
  if (!q || isGenericCourseSlot(q)) return { majors: [], courses: [], postgraduateProgrammes: [], pgCourses: [], academicProfiles: [] }

  const majors = index.majors
    .filter((item) => !options.sourceKind || options.sourceKind === 'all' || item.sourceKind === options.sourceKind)
    .map((item) => ({ item, score: score(item.searchText, q, item.code) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title))
    .slice(0, limit)
    .map((entry) => entry.item)

  const courses = index.courses
    .map((item) => ({ item, score: score(item.searchText, q, item.code) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.item.code.localeCompare(b.item.code))
    .slice(0, limit)
    .map((entry) => entry.item)

  const postgraduateProgrammes = (index.postgraduateProgrammes ?? [])
    .map((item) => ({ item, score: score(item.searchText, q, item.code) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title))
    .slice(0, limit)
    .map((entry) => entry.item)

  const pgCourses = (index.pgCourses ?? [])
    .map((item) => ({ item, score: score(item.searchText, q, item.code) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.item.code.localeCompare(b.item.code))
    .slice(0, limit)
    .map((entry) => entry.item)

  const academicProfiles = (index.academicProfiles ?? [])
    .map((item) => ({ item, score: scoreAcademicProfile(item, q) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name))
    .slice(0, limit)
    .map((entry) => entry.item)

  return { majors, courses, postgraduateProgrammes, pgCourses, academicProfiles }
}
