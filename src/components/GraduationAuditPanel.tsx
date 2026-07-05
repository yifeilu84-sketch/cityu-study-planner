import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'
import type { GraduationAudit, AuditWarning } from '../utils/graduationAudit'

interface Props {
  audit: GraduationAudit
  compact?: boolean
}

const STATUS_COPY = {
  ok: {
    label: '看起来完整',
    icon: CheckCircle2,
    box: 'border-emerald-200 bg-emerald-50',
    text: 'text-emerald-800',
    pill: 'bg-emerald-100 text-emerald-700',
  },
  warning: {
    label: '需要自行确认',
    icon: AlertTriangle,
    box: 'border-amber-200 bg-amber-50',
    text: 'text-amber-900',
    pill: 'bg-amber-100 text-amber-800',
  },
  danger: {
    label: '存在缺口',
    icon: XCircle,
    box: 'border-red-200 bg-red-50',
    text: 'text-red-800',
    pill: 'bg-red-100 text-red-700',
  },
} as const

function warningClasses(warning: AuditWarning): string {
  if (warning.severity === 'danger') return 'text-red-700 bg-red-50 border-red-100'
  if (warning.severity === 'warning') return 'text-amber-800 bg-amber-50 border-amber-100'
  return 'text-slate-700 bg-slate-50 border-slate-100'
}

function ProgressBar({ planned, required }: { planned: number; required: number }) {
  const percent = required > 0 ? Math.min(100, Math.round((planned / required) * 100)) : 100
  return (
    <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
      <div
        className={`h-full rounded-full ${percent >= 100 ? 'bg-emerald-500' : 'bg-amber-500'}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}

export default function GraduationAuditPanel({ audit, compact = false }: Props) {
  const tone = STATUS_COPY[audit.status]
  const Icon = tone.icon
  const visibleWarnings = audit.warnings.slice(0, compact ? 4 : 6)
  const hasHiddenWarnings = audit.warnings.length > visibleWarnings.length
  const shownSections = compact ? audit.sections.filter(section => section.missingCredits > 0 || section.missingCourseCodes.length > 0) : audit.sections

  return (
    <section className={`rounded-xl border p-4 sm:p-5 ${tone.box}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${tone.text}`} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className={`font-bold text-base sm:text-lg ${tone.text}`}>毕业要求自检</h2>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${tone.pill}`}>
                {tone.label}
              </span>
            </div>
            <p className={`mt-1 text-xs sm:text-sm ${tone.text}`}>
              仅按当前网站数据自动核对，请以学院/ARRO 最终审核为准。
            </p>
            {audit.source.advisory && (
              <p className="mt-1 text-xs sm:text-sm text-amber-900">
                不是官网明确 study plan，仅按毕业要求整理，请自行 DIY 学期安排。
              </p>
            )}
          </div>
        </div>
        <div className="shrink-0 text-left sm:text-right">
          <div className={`text-xl sm:text-2xl font-bold ${tone.text}`}>
            {audit.totalCredits.planned}/{audit.totalCredits.required} CU
          </div>
          <div className={`text-xs ${tone.text}`}>
            {audit.totalCredits.missing > 0 ? `还差 ${audit.totalCredits.missing} CU` : '总学分已达到'}
          </div>
        </div>
      </div>

      {!compact && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 border-y border-current/10 py-3 text-xs sm:text-sm">
          <div className="sm:border-r sm:border-current/10 sm:pr-3">
            <div className="text-gray-500">GE 已规划</div>
            <div className="font-bold text-gray-800 mt-1">{audit.ge.plannedCredits}/{audit.ge.requiredCredits} CU</div>
          </div>
          <div className="sm:border-r sm:border-current/10 sm:pr-3">
            <div className="text-gray-500">GE Area 待确认</div>
            <div className="font-bold text-gray-800 mt-1">
              {audit.ge.missingAreas.length > 0 ? audit.ge.missingAreas.join(', ') : '已覆盖'}
            </div>
          </div>
          <div>
            <div className="text-gray-500">重复课程</div>
            <div className="font-bold text-gray-800 mt-1">
              {audit.duplicates.length > 0 ? audit.duplicates.map(item => item.code).join(', ') : '未发现'}
            </div>
          </div>
          <div>
            <div className="text-gray-500">跨学期项目</div>
            <div className="font-bold text-gray-800 mt-1">
              {audit.splitCourses.length > 0 ? audit.splitCourses.map(item => item.code).join(', ') : '无'}
            </div>
          </div>
        </div>
      )}

      {audit.splitCourses.length > 0 && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs sm:text-sm text-blue-800">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">跨学期课程已单独识别</div>
            <div>
              {audit.splitCourses.map(item => `${item.code} (${item.plannedCredits}/${item.catalogueCredits} CU, ${item.count} 个学期)`).join('；')}
              {' '}按年度项目或分学期完成处理，不计为重复课程冲突。
            </div>
          </div>
        </div>
      )}

      {shownSections.length > 0 && (
        <div className="mt-4 space-y-2">
          {shownSections.map(section => (
            <div key={section.key} className="grid grid-cols-1 sm:grid-cols-[160px_1fr_auto] gap-2 sm:items-center text-xs sm:text-sm">
              <div className="font-medium text-gray-700">{section.label}</div>
              <ProgressBar planned={section.plannedCredits} required={section.requiredCredits} />
              <div className="text-gray-600 sm:text-right">
                {section.plannedCredits}/{section.requiredCredits} CU
                {section.missingCourseCodes.length > 0 && (
                  <span className="ml-2 text-red-700">缺 {section.missingCourseCodes.join(', ')}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {visibleWarnings.length > 0 && (
        <div className="mt-4 space-y-2">
          {visibleWarnings.map((warning, index) => (
            <div key={`${warning.kind}-${index}`} className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs sm:text-sm ${warningClasses(warning)}`}>
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{warning.message}</span>
            </div>
          ))}
          {hasHiddenWarnings && (
            <div className="text-xs text-gray-500 px-1">
              还有 {audit.warnings.length - visibleWarnings.length} 条提示未显示，可先处理上方高优先级问题。
            </div>
          )}
        </div>
      )}
    </section>
  )
}
