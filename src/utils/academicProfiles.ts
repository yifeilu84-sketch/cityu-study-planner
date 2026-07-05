import type { AcademicProfile, Major, PostgraduateProgramme } from '../types'

export interface AcademicSearchableProfile extends Partial<AcademicProfile> {
  name: string
  department?: string
  college?: string
  searchText?: string
}

const STOP_WORDS = new Set([
  'and',
  'the',
  'of',
  'in',
  'for',
  'with',
  'department',
  'college',
  'school',
  'bachelor',
  'master',
  'science',
  'engineering',
  'programme',
  'program',
])

function normalise(value: unknown): string {
  return String(value ?? '').toLowerCase().replace(/\s+/g, ' ').trim()
}

function tokens(value: unknown): string[] {
  return normalise(value)
    .split(/[^a-z0-9]+/i)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token))
}

function includesEitherSide(a: string, b: string) {
  return Boolean(a && b && (a.includes(b) || b.includes(a)))
}

function sharedTokenScore(profileText: string, entityText: string) {
  const profileTokens = new Set(tokens(profileText))
  const entityTokens = tokens(entityText)
  let score = 0

  for (const token of entityTokens) {
    if (profileTokens.has(token)) score += 4
  }

  return Math.min(score, 36)
}

function sourceLinks(profile: AcademicProfile) {
  return [profile.url, profile.scholarUrl, profile.googleScholar].filter(Boolean).length
}

export function academicProfileSearchText(profile: AcademicSearchableProfile): string {
  return [
    profile.name,
    profile.nameCN,
    profile.title,
    profile.collegeName ?? profile.college,
    profile.collegeNameEn,
    profile.departmentName ?? profile.department,
    profile.departmentNameEn,
    ...(profile.interests ?? []),
    ...(profile.topPublications ?? []).flatMap((publication) => [publication.title, publication.journal]),
  ].filter(Boolean).join(' ')
}

export function scoreAcademicProfile(profile: AcademicSearchableProfile, query: string): number {
  const q = normalise(query)
  if (!q) return 0
  const name = normalise(`${profile.name} ${profile.nameCN ?? ''}`)
  const department = normalise(`${profile.departmentName ?? profile.department ?? ''} ${profile.departmentNameEn ?? ''}`)
  const text = normalise(profile.searchText || academicProfileSearchText(profile))

  if (name === q) return 120
  if (name.startsWith(q)) return 95
  if (department.includes(q)) return 80
  if (text.includes(q)) return 50

  const queryTokens = tokens(query)
  if (queryTokens.length && queryTokens.every((token) => text.includes(token))) {
    return 35 + Math.min(queryTokens.length * 5, 20)
  }

  return 0
}

export function searchAcademicProfiles(
  profiles: AcademicProfile[],
  query: string,
  options: { limit?: number; collegeId?: string; departmentId?: string; ugOnly?: boolean } = {},
): AcademicProfile[] {
  const limit = options.limit ?? 24
  const q = normalise(query)

  return profiles
    .filter((profile) => !options.collegeId || profile.collegeId === options.collegeId)
    .filter((profile) => !options.departmentId || profile.departmentId === options.departmentId)
    .filter((profile) => !options.ugOnly || profile.ugWelcome)
    .map((profile) => ({
      profile,
      score: q ? scoreAcademicProfile(profile, q) : 1,
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => (
      b.score - a.score ||
      b.profile.publicationCount - a.profile.publicationCount ||
      b.profile.studentCount - a.profile.studentCount ||
      a.profile.name.localeCompare(b.profile.name)
    ))
    .slice(0, limit)
    .map((entry) => entry.profile)
}

export function findRelatedAcademicProfiles(
  profiles: AcademicProfile[],
  entity: Partial<Major | PostgraduateProgramme> | null | undefined,
  options: { limit?: number } = {},
): AcademicProfile[] {
  if (!entity) return []

  const limit = options.limit ?? 6
  const entityCollege = normalise(entity.college)
  const entityDepartment = normalise(entity.department)
  const entityText = [
    entity.title,
    'degree' in entity ? entity.degree : '',
    'award' in entity ? entity.award : '',
    entity.college,
    entity.department,
    'researchAreas' in entity ? entity.researchAreas?.join(' ') : '',
  ].filter(Boolean).join(' ')

  return profiles
    .map((profile) => {
      const profileCollege = normalise(`${profile.collegeName} ${profile.collegeNameEn}`)
      const profileDepartment = normalise(`${profile.departmentName} ${profile.departmentNameEn}`)
      const profileText = normalise(profile.searchText || academicProfileSearchText(profile))
      let score = 0

      if (includesEitherSide(profileDepartment, entityDepartment)) score += 90
      if (includesEitherSide(profileCollege, entityCollege)) score += 45
      score += sharedTokenScore(profileDepartment, entityText)
      score += sharedTokenScore(profileText, entityText)
      if ('degree' in entity && profile.ugWelcome) score += 6
      if ('type' in entity && entity.type === 'research-degree' && profile.studentCount > 0) score += 4
      score += Math.min(profile.publicationCount, 3)
      score += Math.min(sourceLinks(profile), 3)

      return { profile, score }
    })
    .filter((entry) => entry.score >= 20)
    .sort((a, b) => (
      b.score - a.score ||
      b.profile.studentCount - a.profile.studentCount ||
      b.profile.publicationCount - a.profile.publicationCount ||
      a.profile.name.localeCompare(b.profile.name)
    ))
    .slice(0, limit)
    .map((entry) => entry.profile)
}
