import type { Course, Major, MajorCourse, MajorRequirements } from '../types'
import { getCourseLookupCode, isGenericCourseSlot } from './courseCodes.ts'
import { DSE_CODES, getGEArea, isRequiredGE } from './editPlan.ts'
import { getStudyPlanSourceStatus, type SourceStatusKind } from './sourceStatus.ts'

type AuditSeverity = 'info' | 'warning' | 'danger'
type AuditStatus = 'ok' | 'warning' | 'danger'
type SectionConfidence = 'exact' | 'credit' | 'advisory'

export interface AuditPlanCourse {
  code: string
  title?: string
  credits: number
  category?: string
  semester?: string
}

export interface AuditSemester {
  year: number
  sem: 'A' | 'B' | 'Summer' | string
  courses: AuditPlanCourse[]
  totalCredits: number
}

export interface AuditWarning {
  kind:
    | 'source-confidence'
    | 'total-credits'
    | 'section-credits'
    | 'missing-course'
    | 'ge-required'
    | 'ge-area'
    | 'duplicate'
    | 'prerequisite'
    | 'semester-load'
    | 'offering-term'
  severity: AuditSeverity
  message: string
  codes: string[]
}

export interface AuditSection {
  key: string
  label: string
  plannedCredits: number
  requiredCredits: number
  missingCredits: number
  requiredCourseCodes: string[]
  missingCourseCodes: string[]
  confidence: SectionConfidence
}

export interface GraduationAudit {
  status: AuditStatus
  totalCredits: {
    planned: number
    required: number
    missing: number
  }
  source: {
    kind: SourceStatusKind
    label: string
    description: string
    advisory: boolean
  }
  sections: AuditSection[]
  ge: {
    plannedCredits: number
    requiredCredits: number
    missingCredits: number
    areaCredits: Record<'Area 1' | 'Area 2' | 'Area 3', number>
    missingAreas: string[]
    missingRequiredCodes: string[]
  }
  duplicates: { code: string; count: number }[]
  splitCourses: { code: string; count: number; plannedCredits: number; catalogueCredits: number }[]
  warnings: AuditWarning[]
}

const SECTION_DEFS = [
  { key: 'gatewayEducation', label: '通识教育', categories: ['ge'] },
  { key: 'college', label: '学院/学系要求', categories: ['college'] },
  { key: 'collegeRequirement', label: '学院指定课程', categories: ['college'] },
  { key: 'majorCore', label: '专业核心', categories: ['majorCore'] },
  { key: 'majorElectives', label: '专业选修', categories: ['majorElective'] },
  { key: 'freeElectives', label: '自由选修', categories: ['freeElective'] },
] as const

type SectionKey = typeof SECTION_DEFS[number]['key']

interface NormalizedPlannedCourse extends AuditPlanCourse {
  normalizedCode: string
  semesterIndex: number
  year: number
  sem: string
}

interface RequirementSection {
  credits: number
  courses: MajorCourse[]
  choose?: number
  chooseCredits?: number
  note?: string
}

function parseRequirementCredits(raw: unknown): number {
  if (typeof raw === 'number') return raw
  if (typeof raw === 'string') {
    const values = raw.match(/\d+(?:\.\d+)?/g)?.map(Number) ?? []
    return values.length > 0 ? Math.min(...values) : 0
  }
  return 0
}

function getActiveEntity(major: Major, streamIndex?: number): Major | NonNullable<Major['streams']>[number] {
  return streamIndex != null && major.streams?.[streamIndex] ? major.streams[streamIndex] : major
}

function getActiveRequirements(major: Major, streamIndex?: number): MajorRequirements {
  const stream = streamIndex != null ? major.streams?.[streamIndex] : undefined
  return stream?.requirements ?? major.requirements ?? {}
}

function getActiveTotalCredits(major: Major, reqs: MajorRequirements, streamIndex?: number): number {
  const stream = streamIndex != null ? major.streams?.[streamIndex] : undefined
  if (typeof stream?.totalCredits === 'number') return stream.totalCredits
  if (typeof major.totalCredits === 'number') return major.totalCredits
  return SECTION_DEFS.reduce((sum, section) => sum + getRequirementSection(reqs, section.key).credits, 0)
}

function getRequirementSection(reqs: MajorRequirements, key: SectionKey): RequirementSection {
  const alternateKey =
    key === 'majorElectives' ? 'majorElective' :
      key === 'freeElectives' ? 'freeElective' :
        null
  const raw = reqs[key as keyof MajorRequirements] ?? (alternateKey ? (reqs as any)[alternateKey] : undefined)
  if (typeof raw === 'number' || typeof raw === 'string') return { credits: parseRequirementCredits(raw), courses: [] }
  if (raw && typeof raw === 'object') {
    return {
      credits: parseRequirementCredits(raw.credits),
      courses: 'courses' in raw && Array.isArray(raw.courses) ? raw.courses : [],
      choose: 'choose' in raw ? raw.choose : undefined,
      chooseCredits: 'chooseCredits' in raw ? raw.chooseCredits : undefined,
      note: 'note' in raw ? raw.note : undefined,
    }
  }
  return { credits: 0, courses: [] }
}

function normalizeCode(code: string, courses: Record<string, Course>): string {
  const lookupCode = getCourseLookupCode(code)
  if (!lookupCode) return ''
  if (courses[lookupCode]) return lookupCode
  const withoutGradeSuffix = lookupCode.replace(/^([A-Z]{2,}\d{4})[A-Z]$/, '$1')
  if (courses[withoutGradeSuffix]) return withoutGradeSuffix
  return lookupCode
}

function isConcreteCourseCode(code: string): boolean {
  return Boolean(code) && !isGenericCourseSlot(code)
}

function courseCredits(course: AuditPlanCourse, courses: Record<string, Course>): number {
  const normalizedCode = normalizeCode(course.code, courses)
  return course.credits ?? courses[normalizedCode]?.credits ?? 0
}

function flattenPlan(plan: AuditSemester[], courses: Record<string, Course>): NormalizedPlannedCourse[] {
  const semRank: Record<string, number> = { A: 0, B: 1, Summer: 2 }
  return [...plan]
    .sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year
      return (semRank[a.sem] ?? 9) - (semRank[b.sem] ?? 9)
    })
    .flatMap((semester, semesterIndex) =>
      semester.courses.map(course => ({
        ...course,
        credits: courseCredits(course, courses),
        normalizedCode: normalizeCode(course.code, courses),
        semesterIndex,
        year: semester.year,
        sem: semester.sem,
      }))
    )
}

function getSectionCourseCodes(section: RequirementSection, courses: Record<string, Course>): string[] {
  const seen = new Set<string>()
  for (const course of section.courses) {
    const normalizedCode = normalizeCode(course.code, courses)
    if (isConcreteCourseCode(normalizedCode)) seen.add(normalizedCode)
  }
  return [...seen]
}

function sectionHasCourse(section: RequirementSection, code: string, courses: Record<string, Course>): boolean {
  return getSectionCourseCodes(section, courses).includes(code)
}

function hasRequirementContent(section: RequirementSection): boolean {
  return section.credits > 0 || section.courses.length > 0 || Boolean(section.choose || section.chooseCredits)
}

function getCollegeSectionFallback(reqs: MajorRequirements): SectionKey | null {
  const college = getRequirementSection(reqs, 'college')
  const collegeRequirement = getRequirementSection(reqs, 'collegeRequirement')
  if (hasRequirementContent(college) && !hasRequirementContent(collegeRequirement)) return 'college'
  if (hasRequirementContent(collegeRequirement) && !hasRequirementContent(college)) return 'collegeRequirement'
  if (hasRequirementContent(college)) return 'college'
  if (hasRequirementContent(collegeRequirement)) return 'collegeRequirement'
  return null
}

function getPlannedSectionKey(
  course: NormalizedPlannedCourse,
  reqs: MajorRequirements,
  courses: Record<string, Course>
): SectionKey | null {
  const code = course.normalizedCode
  for (const section of SECTION_DEFS) {
    if (sectionHasCourse(getRequirementSection(reqs, section.key), code, courses)) return section.key
  }
  if (/^GE/.test(code) || /^GE/.test(course.code) || course.category === 'ge') return 'gatewayEducation'
  if (/^COLLEGE|^COL-/i.test(course.code) || course.category === 'college') return getCollegeSectionFallback(reqs)
  if (/^FREE|^MINOR|^SECOND-MAJOR$/i.test(course.code) || course.category === 'freeElective') return 'freeElectives'
  if (
    /^MAJOR|^STREAM[-_]?ELECT|^STREAM-COURSE$|^CS-E$|-ELECT|ELECTIVE|-ELEC\d*$/i.test(course.code) ||
    course.category === 'majorElective'
  ) {
    return 'majorElectives'
  }
  if (course.category === 'majorCore') return 'majorCore'
  return null
}

function getPlannedCreditsForSection(
  key: SectionKey,
  plannedCourses: NormalizedPlannedCourse[],
  reqs: MajorRequirements,
  courses: Record<string, Course>
): number {
  return plannedCourses.reduce((sum, course) => {
    const sectionKey = getPlannedSectionKey(course, reqs, courses)
    return sectionKey === key ? sum + course.credits : sum
  }, 0)
}

function isElectiveRequirementSection(key: SectionKey, section: RequirementSection): boolean {
  return key === 'majorElectives' || Boolean(section.choose || section.chooseCredits)
}

function buildSectionAudit(
  reqs: MajorRequirements,
  plannedCourses: NormalizedPlannedCourse[],
  plannedCodes: Set<string>,
  courses: Record<string, Course>
): AuditSection[] {
  return SECTION_DEFS
    .map(sectionDef => {
      const req = getRequirementSection(reqs, sectionDef.key)
      const requiredCourseCodes = isElectiveRequirementSection(sectionDef.key, req)
        ? []
        : getSectionCourseCodes(req, courses)
      const missingCourseCodes = requiredCourseCodes.filter(code => !plannedCodes.has(code))
      const plannedCredits = getPlannedCreditsForSection(sectionDef.key, plannedCourses, reqs, courses)
      const missingCredits = Math.max(0, req.credits - plannedCredits)
      const hasExactRequirements = requiredCourseCodes.length > 0 && !isElectiveRequirementSection(sectionDef.key, req)
      const confidence: SectionConfidence = hasExactRequirements ? 'exact' : req.credits > 0 ? 'credit' : 'advisory'
      return {
        key: sectionDef.key,
        label: sectionDef.label,
        plannedCredits,
        requiredCredits: req.credits,
        missingCredits,
        requiredCourseCodes,
        missingCourseCodes,
        confidence,
      }
    })
    .filter(section => section.requiredCredits > 0 || section.requiredCourseCodes.length > 0)
}

function buildGEAudit(
  reqs: MajorRequirements,
  plannedCourses: NormalizedPlannedCourse[],
  plannedCodes: Set<string>,
  courses: Record<string, Course>
): GraduationAudit['ge'] {
  const geReq = getRequirementSection(reqs, 'gatewayEducation')
  const geRequiredCodes = getSectionCourseCodes(geReq, courses).filter(code => isRequiredGE(code) || DSE_CODES.includes(code))
  const missingRequiredCodes = geRequiredCodes.filter(code => !plannedCodes.has(code))
  const areaCredits: GraduationAudit['ge']['areaCredits'] = { 'Area 1': 0, 'Area 2': 0, 'Area 3': 0 }
  let plannedCredits = 0

  for (const course of plannedCourses) {
    const isGE = /^GE/.test(course.code) || /^GE/.test(course.normalizedCode) || course.category === 'ge'
    if (!isGE) continue
    plannedCredits += course.credits
    const area = getPlannedGEArea(course)
    if (area === 'Area 1' || area === 'Area 2' || area === 'Area 3') {
      areaCredits[area] += course.credits
    }
  }

  const hasDistributionRequirement = geReq.courses.some(course => /^GE-?DR$/i.test(course.code) || /distribution/i.test(course.title ?? ''))
  const missingAreas = hasDistributionRequirement
    ? (['Area 1', 'Area 2', 'Area 3'] as const).filter(area => areaCredits[area] <= 0)
    : []

  return {
    plannedCredits,
    requiredCredits: geReq.credits,
    missingCredits: Math.max(0, geReq.credits - plannedCredits),
    areaCredits,
    missingAreas,
    missingRequiredCodes,
  }
}

function getPlannedGEArea(course: NormalizedPlannedCourse): 'Area 1' | 'Area 2' | 'Area 3' | null {
  const directArea = getGEArea(course.normalizedCode)
  if (directArea === 'Area 1' || directArea === 'Area 2' || directArea === 'Area 3') return directArea

  const text = `${course.code} ${course.title ?? ''}`
  if (/GE-?DR1\b|DR-?1\b|Area\s*1\b/i.test(text)) return 'Area 1'
  if (/GE-?DR2\b|DR-?2\b|Area\s*2\b/i.test(text)) return 'Area 2'
  if (/GE-?DR3\b|DR-?3\b|Area\s*3\b/i.test(text)) return 'Area 3'
  return null
}

function getRequirementCreditsForCode(
  code: string,
  courses: Record<string, Course>,
  reqs: MajorRequirements
): number {
  let maxCredits = 0
  for (const section of SECTION_DEFS) {
    for (const course of getRequirementSection(reqs, section.key).courses) {
      if (normalizeCode(course.code, courses) === code) {
        maxCredits = Math.max(maxCredits, course.credits ?? 0)
      }
    }
  }
  return maxCredits
}

function summarizeRepeatedCourses(plannedCourses: NormalizedPlannedCourse[]): Map<string, { count: number; credits: number }> {
  const plannedByCode = new Map<string, { count: number; credits: number }>()
  for (const course of plannedCourses) {
    if (!isConcreteCourseCode(course.normalizedCode)) continue
    const item = plannedByCode.get(course.normalizedCode) ?? { count: 0, credits: 0 }
    item.count += 1
    item.credits += course.credits
    plannedByCode.set(course.normalizedCode, item)
  }
  return plannedByCode
}

function buildDuplicateAudit(
  plannedCourses: NormalizedPlannedCourse[],
  courses: Record<string, Course>,
  reqs: MajorRequirements
): { code: string; count: number }[] {
  const plannedByCode = summarizeRepeatedCourses(plannedCourses)
  return [...plannedByCode.entries()]
    .filter(([code, item]) => {
      if (item.count <= 1) return false
      const catalogueCredits = courses[code]?.credits ?? getRequirementCreditsForCode(code, courses, reqs)
      return catalogueCredits <= 0 ? item.credits > 0 : item.credits > catalogueCredits
    })
    .map(([code, item]) => ({ code, count: item.count }))
}

function buildSplitCourseAudit(
  plannedCourses: NormalizedPlannedCourse[],
  courses: Record<string, Course>,
  reqs: MajorRequirements
): GraduationAudit['splitCourses'] {
  const plannedByCode = summarizeRepeatedCourses(plannedCourses)
  return [...plannedByCode.entries()]
    .filter(([code, item]) => {
      if (item.count <= 1) return false
      const catalogueCredits = courses[code]?.credits ?? getRequirementCreditsForCode(code, courses, reqs)
      return catalogueCredits > 0 && item.credits > 0 && item.credits <= catalogueCredits
    })
    .map(([code, item]) => ({
      code,
      count: item.count,
      plannedCredits: item.credits,
      catalogueCredits: courses[code]?.credits ?? getRequirementCreditsForCode(code, courses, reqs),
    }))
}

function buildPriorCodeSets(plannedCourses: NormalizedPlannedCourse[]): Map<number, Set<string>> {
  const result = new Map<number, Set<string>>()
  const seen = new Set<string>()
  const ordered = [...plannedCourses].sort((a, b) => a.semesterIndex - b.semesterIndex)
  for (const course of ordered) {
    if (!result.has(course.semesterIndex)) result.set(course.semesterIndex, new Set(seen))
    if (isConcreteCourseCode(course.normalizedCode)) seen.add(course.normalizedCode)
  }
  return result
}

const PREREQUISITE_EQUIVALENTS: Record<string, string[]> = {
  MA1200: ['MA1300'],
  MA1300: ['MA1200'],
  MA1201: ['MA1301'],
  MA1301: ['MA1201'],
}

function hasPriorPrerequisite(code: string, priorCodes: Set<string>): boolean {
  if (priorCodes.has(code)) return true
  return (PREREQUISITE_EQUIVALENTS[code] ?? []).some(equivalentCode => priorCodes.has(equivalentCode))
}

function buildPrerequisiteWarnings(
  plannedCourses: NormalizedPlannedCourse[],
  courses: Record<string, Course>
): AuditWarning[] {
  const warnings: AuditWarning[] = []
  const priorBySemester = buildPriorCodeSets(plannedCourses)

  for (const course of plannedCourses) {
    if (!isConcreteCourseCode(course.normalizedCode)) continue
    const detail = courses[course.normalizedCode]
    const prerequisites = (detail?.prerequisites ?? [])
      .map(code => normalizeCode(code, courses))
      .filter(code => isConcreteCourseCode(code) && code !== course.normalizedCode)

    if (prerequisites.length === 0) continue
    const priorCodes = priorBySemester.get(course.semesterIndex) ?? new Set<string>()
    const hasAtLeastOnePriorPrerequisite = prerequisites.some(code => hasPriorPrerequisite(code, priorCodes))
    if (!hasAtLeastOnePriorPrerequisite) {
      warnings.push({
        kind: 'prerequisite',
        severity: 'danger',
        message: `${course.code} 可能缺少前置课程：${prerequisites.join(', ')}`,
        codes: [course.normalizedCode, ...prerequisites],
      })
    }
  }

  return warnings
}

function buildSemesterLoadWarnings(plan: AuditSemester[]): AuditWarning[] {
  const warnings: AuditWarning[] = []
  for (const semester of plan) {
    const totalCredits = semester.courses.reduce((sum, course) => sum + (course.credits || 0), 0)
    if (totalCredits > 21) {
      warnings.push({
        kind: 'semester-load',
        severity: 'danger',
        message: `Year ${semester.year} Sem ${semester.sem} 为 ${totalCredits} CU，超过 21 CU 上限。`,
        codes: semester.courses.map(course => course.code),
      })
    } else if (totalCredits > 18) {
      warnings.push({
        kind: 'semester-load',
        severity: 'warning',
        message: `Year ${semester.year} Sem ${semester.sem} 为 ${totalCredits} CU，通常需要 ARRO 批准。`,
        codes: semester.courses.map(course => course.code),
      })
    }
  }
  return warnings
}

function buildOfferingTermWarnings(
  plannedCourses: NormalizedPlannedCourse[],
  courses: Record<string, Course>
): AuditWarning[] {
  const warnings: AuditWarning[] = []
  for (const course of plannedCourses) {
    if (course.sem === 'Summer' || !isConcreteCourseCode(course.normalizedCode)) continue
    const semesterText = (course.semester || courses[course.normalizedCode]?.semester || '').toLowerCase()
    if (!semesterText) continue
    const offered = getOfferedSemesterFlags(semesterText)
    const semAOnly = offered.a && !offered.b
    const semBOnly = offered.b && !offered.a
    if ((course.sem === 'A' && semBOnly) || (course.sem === 'B' && semAOnly)) {
      warnings.push({
        kind: 'offering-term',
        severity: 'warning',
        message: `${course.code} 的开课学期可能与 Year ${course.year} Sem ${course.sem} 不一致。`,
        codes: [course.normalizedCode],
      })
    }
  }
  return warnings
}

function getOfferedSemesterFlags(semesterText: string): { a: boolean; b: boolean } {
  const text = semesterText.replace(/\s+/g, ' ')
  const combinedAB = /semester\s*a\s*(?:&|and|\/|,)\s*b|\bsem\s*a\s*(?:&|and|\/|,)\s*b/i.test(text)
  const combinedBA = /semester\s*b\s*(?:&|and|\/|,)\s*a|\bsem\s*b\s*(?:&|and|\/|,)\s*a/i.test(text)
  return {
    a: combinedAB || combinedBA || /semester\s*a\b|\bsem\s*a\b/i.test(text),
    b: combinedAB || combinedBA || /semester\s*b\b|\bsem\s*b\b/i.test(text),
  }
}

function sourceConfidenceWarning(kind: SourceStatusKind): AuditWarning | null {
  if (kind === 'diy') {
    return {
      kind: 'source-confidence',
      severity: 'info',
      message: 'DIY 路径没有官网明确 study plan；这里只按毕业要求列出课程池，请自行安排学期并向学院确认。',
      codes: [],
    }
  }
  if (kind === 'derived') {
    return {
      kind: 'source-confidence',
      severity: 'info',
      message: '当前学期安排不是官网明确 study plan，而是按毕业要求整理的参考排课。',
      codes: [],
    }
  }
  if (kind === 'structure') {
    return {
      kind: 'source-confidence',
      severity: 'info',
      message: '当前安排来自官网 structure/flowchart 解析，请结合实际开课和先修要求检查。',
      codes: [],
    }
  }
  return null
}

function getAuditStatus(warnings: AuditWarning[]): AuditStatus {
  if (warnings.some(warning => warning.severity === 'danger')) return 'danger'
  if (warnings.length > 0) return 'warning'
  return 'ok'
}

export function auditGraduationPlan(
  major: Major,
  courses: Record<string, Course>,
  plan: AuditSemester[],
  streamIndex?: number
): GraduationAudit {
  const activeEntity = getActiveEntity(major, streamIndex)
  const sourceStatus = getStudyPlanSourceStatus(activeEntity)
  const reqs = getActiveRequirements(major, streamIndex)
  const requiredTotalCredits = getActiveTotalCredits(major, reqs, streamIndex)
  const plannedCourses = flattenPlan(plan, courses)
  const plannedCodes = new Set(
    plannedCourses
      .map(course => course.normalizedCode)
      .filter(isConcreteCourseCode)
  )
  const plannedTotalCredits = plannedCourses.reduce((sum, course) => sum + course.credits, 0)
  const sections = buildSectionAudit(reqs, plannedCourses, plannedCodes, courses)
  const ge = buildGEAudit(reqs, plannedCourses, plannedCodes, courses)
  const duplicates = buildDuplicateAudit(plannedCourses, courses, reqs)
  const splitCourses = buildSplitCourseAudit(plannedCourses, courses, reqs)
  const warnings: AuditWarning[] = []

  const sourceWarning = sourceConfidenceWarning(sourceStatus.kind)
  if (sourceWarning) warnings.push(sourceWarning)

  const totalMissing = Math.max(0, requiredTotalCredits - plannedTotalCredits)
  if (totalMissing > 0) {
    warnings.push({
      kind: 'total-credits',
      severity: 'danger',
      message: `当前规划共 ${plannedTotalCredits} CU，距离毕业要求 ${requiredTotalCredits} CU 还差 ${totalMissing} CU。`,
      codes: [],
    })
  }

  for (const section of sections) {
    if (section.missingCourseCodes.length > 0) {
      warnings.push({
        kind: 'missing-course',
        severity: 'danger',
        message: `${section.label} 缺少必修课：${section.missingCourseCodes.join(', ')}`,
        codes: section.missingCourseCodes,
      })
    }
    if (section.missingCredits > 0) {
      warnings.push({
        kind: 'section-credits',
        severity: 'warning',
        message: `${section.label} 当前 ${section.plannedCredits}/${section.requiredCredits} CU，还差 ${section.missingCredits} CU。`,
        codes: [],
      })
    }
  }

  if (ge.missingRequiredCodes.length > 0) {
    warnings.push({
      kind: 'ge-required',
      severity: 'danger',
      message: `GE 必修课缺少：${ge.missingRequiredCodes.join(', ')}`,
      codes: ge.missingRequiredCodes,
    })
  }
  if (ge.missingAreas.length > 0) {
    warnings.push({
      kind: 'ge-area',
      severity: 'warning',
      message: `GE Distributional Requirements 还需要具体选择：${ge.missingAreas.join(', ')}。`,
      codes: [],
    })
  }

  for (const duplicate of duplicates) {
    warnings.push({
      kind: 'duplicate',
      severity: 'danger',
      message: `${duplicate.code} 在规划中出现 ${duplicate.count} 次。`,
      codes: [duplicate.code],
    })
  }

  warnings.push(...buildPrerequisiteWarnings(plannedCourses, courses))
  warnings.push(...buildSemesterLoadWarnings(plan))
  warnings.push(...buildOfferingTermWarnings(plannedCourses, courses))

  return {
    status: getAuditStatus(warnings),
    totalCredits: {
      planned: plannedTotalCredits,
      required: requiredTotalCredits,
      missing: totalMissing,
    },
    source: {
      kind: sourceStatus.kind,
      label: sourceStatus.label,
      description: sourceStatus.description,
      advisory: sourceStatus.kind === 'derived' || sourceStatus.kind === 'diy',
    },
    sections,
    ge,
    duplicates,
    splitCourses,
    warnings,
  }
}
