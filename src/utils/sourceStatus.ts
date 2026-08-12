import type { Language } from '../i18n/language.ts'

export type SourceStatusKind = 'official' | 'structure' | 'derived' | 'diy'

export interface SourceStatusInfo {
  kind: SourceStatusKind
  label: string
  description: string
  tone: 'blue' | 'indigo' | 'amber' | 'slate'
  sourceTitle?: string
  sourceUrl?: string
  lastVerified?: string
}

function textFromEntity(entity: any): string {
  return [
    entity?.studyPlanSourceType,
    entity?.studyPlanSourceTitle,
    entity?.title,
    entity?.name,
    ...(Array.isArray(entity?.notes) ? entity.notes : []),
  ].filter(Boolean).join(' ').toLowerCase()
}

export function getStudyPlanSourceStatus(entity: any, language: Language = 'zh'): SourceStatusInfo {
  const explicit = entity?.studyPlanStatus as SourceStatusKind | undefined
  const text = textFromEntity(entity)

  let kind: SourceStatusKind = 'official'
  if (explicit === 'derived' || explicit === 'diy' || explicit === 'official' || explicit === 'structure') {
    kind = explicit
  } else if (/flowchart|programme structure|program(?:me)? structure|structure and flowchart|structure based/.test(text)) {
    kind = 'structure'
  }

  const shared = {
    sourceTitle: entity?.studyPlanSourceTitle,
    sourceUrl: entity?.studyPlanSourceUrl ?? entity?.url,
    lastVerified: entity?.lastVerified,
  }

  switch (kind) {
    case 'derived':
      return {
        kind,
        label: language === 'en' ? 'Graduation-requirement reference plan' : '非官网精确学习计划',
        description: language === 'en'
          ? 'This semester layout is a reference assembled from official graduation, curriculum, and credit requirements. Adjust it for actual offerings and prerequisites.'
          : '当前学期安排是按官方毕业要求、课程结构和学分要求整理出的参考排课表，请结合实际开课和先修要求自行调整。',
        tone: 'amber',
        ...shared,
      }
    case 'diy':
      return {
        kind,
        label: language === 'en' ? 'No official semester-by-semester plan' : '官网未给出明确学期规划',
        description: language === 'en'
          ? 'The page provides the graduation course pool and blank semesters so you can build a plan around exchange, internships, and your preferred credit load.'
          : '这里提供毕业所需课程池和空白学期表，适合按个人交换、实习和学分负荷自行 DIY。',
        tone: 'slate',
        ...shared,
      }
    case 'structure':
      return {
        kind,
        label: language === 'en' ? 'Parsed from official structure / flowchart' : '官方 Structure / Flowchart 解析',
        description: language === 'en'
          ? 'This study plan was transcribed from an official programme structure, major structure, or flowchart.'
          : '当前学习计划由官网 programme structure、major structure 或 flowchart 图表解析整理。',
        tone: 'indigo',
        ...shared,
      }
    default:
      return {
        kind,
        label: language === 'en' ? 'Official recommended study plan' : '官方推荐学习计划',
        description: language === 'en'
          ? 'This plan comes from an official CityU recommended study plan, sample study plan, model study path, or equivalent semester schedule.'
          : '当前学习计划来自 CityU 官方 recommended study plan、sample study plan、model study path 或同等官方学期规划。',
        tone: 'blue',
        ...shared,
      }
  }
}
