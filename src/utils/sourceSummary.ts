import { getStudyPlanSourceStatus, type SourceStatusInfo, type SourceStatusKind } from './sourceStatus.ts'
import type { Language } from '../i18n/language.ts'

export interface MajorSourceSummaryItem {
  code: string
  title: string
  college?: string
  department?: string
  source: SourceStatusInfo
}

export interface MajorSourceSummaryGroup {
  kind: SourceStatusKind
  label: string
  description: string
  count: number
  items: MajorSourceSummaryItem[]
}

export interface MajorSourceSummary {
  total: number
  counts: Record<SourceStatusKind, number>
  needsReviewCount: number
  groups: MajorSourceSummaryGroup[]
}

const SOURCE_ORDER: SourceStatusKind[] = ['official', 'structure', 'derived', 'diy']

function toItem(major: any, language: Language): MajorSourceSummaryItem {
  return {
    code: major.code,
    title: major.title,
    college: major.college,
    department: major.department,
    source: getStudyPlanSourceStatus(major, language),
  }
}

export function filterMajorsBySource(majors: any[], kind: SourceStatusKind | 'all', language: Language = 'zh'): MajorSourceSummaryItem[] {
  return majors
    .map(major => toItem(major, language))
    .filter((item) => kind === 'all' || item.source.kind === kind)
    .sort((a, b) => a.title.localeCompare(b.title))
}

export function summarizeMajorSourceStatuses(majors: any[], language: Language = 'zh'): MajorSourceSummary {
  const allItems = filterMajorsBySource(majors, 'all', language)
  const counts = {
    official: 0,
    structure: 0,
    derived: 0,
    diy: 0,
  } satisfies Record<SourceStatusKind, number>

  for (const item of allItems) {
    counts[item.source.kind] += 1
  }

  const groups = SOURCE_ORDER.map((kind) => {
    const items = allItems.filter((item) => item.source.kind === kind)
    const status = getStudyPlanSourceStatus({ studyPlanStatus: kind }, language)
    return {
      kind,
      label: status.label,
      description: status.description,
      count: items.length,
      items,
    }
  })

  return {
    total: majors.length,
    counts,
    needsReviewCount: counts.structure + counts.derived + counts.diy,
    groups,
  }
}
