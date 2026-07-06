import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'
import type { PlanRiskIssue, PlanRiskSummary } from '../utils/planRiskAudit'

interface PlanRiskPanelProps {
  summary: PlanRiskSummary
  compact?: boolean
}

const STATUS_COPY = {
  ok: {
    label: '未发现明显风险',
    icon: CheckCircle2,
    box: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    pill: 'bg-emerald-100 text-emerald-700',
  },
  warning: {
    label: '需要自行确认',
    icon: AlertTriangle,
    box: 'border-amber-200 bg-amber-50 text-amber-900',
    pill: 'bg-amber-100 text-amber-800',
  },
  danger: {
    label: '存在高优先级冲突',
    icon: XCircle,
    box: 'border-red-200 bg-red-50 text-red-900',
    pill: 'bg-red-100 text-red-700',
  },
} as const

const ISSUE_CLASSES = {
  danger: 'border-red-100 bg-red-50 text-red-800',
  warning: 'border-amber-100 bg-amber-50 text-amber-900',
  info: 'border-blue-100 bg-blue-50 text-blue-800',
} as const

const SEVERITY_RANK = {
  danger: 0,
  warning: 1,
  info: 2,
} as const

function sortIssues(issues: PlanRiskIssue[]) {
  return [...issues].sort((a, b) => {
    const severityDiff = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]
    if (severityDiff !== 0) return severityDiff
    return `${a.year ?? 0}-${a.sem ?? ''}-${a.code ?? ''}`.localeCompare(`${b.year ?? 0}-${b.sem ?? ''}-${b.code ?? ''}`)
  })
}

function issueIcon(issue: PlanRiskIssue) {
  if (issue.severity === 'danger') return XCircle
  if (issue.severity === 'warning') return AlertTriangle
  return Info
}

export default function PlanRiskPanel({ summary, compact = false }: PlanRiskPanelProps) {
  const tone = STATUS_COPY[summary.status]
  const HeaderIcon = tone.icon
  const visibleIssues = sortIssues(summary.issues).slice(0, compact ? 4 : 8)
  const hiddenCount = Math.max(0, summary.issues.length - visibleIssues.length)

  return (
    <section className={`rounded-xl border p-4 ${tone.box}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <HeaderIcon className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold">规划风险</h3>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${tone.pill}`}>
                {tone.label}
              </span>
            </div>
            <p className="mt-1 text-xs leading-relaxed sm:text-sm">
              自动检查开课学期、先修课链条、学分负载、GE 缺口、not offering 课程，以及 FYP / internship / thesis 等跨学期项目。
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-lg bg-white/70 px-2 py-1.5">
            <div className="font-bold text-red-700">{summary.counts.danger}</div>
            <div className="text-gray-500">高风险</div>
          </div>
          <div className="rounded-lg bg-white/70 px-2 py-1.5">
            <div className="font-bold text-amber-700">{summary.counts.warning}</div>
            <div className="text-gray-500">提醒</div>
          </div>
          <div className="rounded-lg bg-white/70 px-2 py-1.5">
            <div className="font-bold text-blue-700">{summary.counts.info}</div>
            <div className="text-gray-500">说明</div>
          </div>
        </div>
      </div>

      {visibleIssues.length > 0 ? (
        <div className="mt-3 space-y-2">
          {visibleIssues.map((issue, index) => {
            const IssueIcon = issueIcon(issue)
            return (
              <div key={`${issue.kind}-${issue.code ?? 'plan'}-${index}`} className={`rounded-lg border px-3 py-2 text-xs sm:text-sm ${ISSUE_CLASSES[issue.severity]}`}>
                <div className="flex items-start gap-2">
                  <IssueIcon className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="font-semibold">{issue.title}</div>
                    <div className="mt-1 leading-relaxed">{issue.message}</div>
                    <div className="mt-1 font-medium leading-relaxed">建议：{issue.suggestion}</div>
                  </div>
                </div>
              </div>
            )
          })}
          {hiddenCount > 0 ? (
            <div className="px-1 text-xs text-gray-500">
              还有 {hiddenCount} 条风险未显示，可先处理上方高优先级问题。
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-3 rounded-lg border border-emerald-100 bg-white/70 px-3 py-2 text-xs text-emerald-800 sm:text-sm">
          当前规划未发现明显风险；仍请以学院和 ARRO 的最终审批为准。
        </div>
      )}
    </section>
  )
}
