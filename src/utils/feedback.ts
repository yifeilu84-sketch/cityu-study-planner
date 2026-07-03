export interface IssueReportInput {
  entityType: 'major' | 'course'
  code: string
  title: string
  pageUrl: string
  sourceKind?: string
}

export interface IssueReport {
  title: string
  body: string
  githubUrl: string
  mailtoUrl: string
}

const ISSUE_BASE = 'https://github.com/yifeilu84-sketch/cityu-study-planner/issues/new'

export function buildIssueReport(input: IssueReportInput): IssueReport {
  const entityLabel = input.entityType === 'major' ? 'Major' : 'Course'
  const title = `[Data issue] ${entityLabel} ${input.code}`
  const body = [
    `Entity type: ${input.entityType}`,
    `Code: ${input.code}`,
    `Title: ${input.title}`,
    `Page: ${input.pageUrl}`,
    `Source status: ${input.sourceKind || 'unknown'}`,
    '',
    'What looks wrong?',
    '',
    'Please attach official evidence, such as a CityU catalogue page, official study plan PDF, programme handbook, course PDF, or GE course page.',
  ].join('\n')

  const params = new URLSearchParams({ title, body })
  const mailParams = new URLSearchParams({
    subject: title,
    body,
  })

  return {
    title,
    body,
    githubUrl: `${ISSUE_BASE}?${params.toString()}`,
    mailtoUrl: `mailto:?${mailParams.toString()}`,
  }
}
