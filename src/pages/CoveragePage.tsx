import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Database, ExternalLink, Search, ShieldCheck } from 'lucide-react'
import allMajors from '../data/all-majors.json'
import { filterMajorsBySource, summarizeMajorSourceStatuses } from '../utils/sourceSummary.ts'
import type { SourceStatusKind } from '../utils/sourceStatus.ts'

type SourceFilter = SourceStatusKind | 'all'

const FILTERS: { kind: SourceFilter; label: string }[] = [
  { kind: 'all', label: '全部' },
  { kind: 'official', label: '官方 Study Plan' },
  { kind: 'structure', label: 'Structure / Flowchart' },
  { kind: 'derived', label: '按毕业要求排' },
  { kind: 'diy', label: 'DIY 空表' },
]

const TONE_CLASSES: Record<SourceStatusKind, string> = {
  official: 'bg-blue-50 text-blue-800 border-blue-100',
  structure: 'bg-indigo-50 text-indigo-800 border-indigo-100',
  derived: 'bg-amber-50 text-amber-800 border-amber-100',
  diy: 'bg-slate-50 text-slate-700 border-slate-200',
}

export default function CoveragePage() {
  const majors = allMajors as any[]
  const [selectedKind, setSelectedKind] = useState<SourceFilter>('all')
  const [query, setQuery] = useState('')

  const summary = useMemo(() => summarizeMajorSourceStatuses(majors), [majors])
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return filterMajorsBySource(majors, selectedKind).filter((item) => {
      if (!q) return true
      return [item.code, item.title, item.college, item.department]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    })
  }, [majors, selectedKind, query])

  const selectedLabel = FILTERS.find((item) => item.kind === selectedKind)?.label ?? '全部'

  return (
    <div className="space-y-5">
      <Link to="/" className="inline-flex items-center gap-1 text-gray-500 hover:text-cityu-accent transition-colors text-sm sm:text-base">
        <ArrowLeft className="w-4 h-4" />
        返回首页
      </Link>

      <section className="bg-white border border-gray-100 rounded-xl shadow-sm p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-6 h-6 text-cityu-accent" />
              <h1 className="text-xl sm:text-2xl font-bold text-cityu-dark">数据来源覆盖率</h1>
            </div>
            <p className="text-sm text-gray-500">
              共 {summary.total} 个本科项目；其中 {summary.needsReviewCount} 个没有官网明确的逐学期 study plan，页面会按来源状态提醒学生自行核对。
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 min-w-0 lg:min-w-[460px]">
            {summary.groups.map((group) => (
              <button
                key={group.kind}
                onClick={() => setSelectedKind(group.kind)}
                className={`text-left rounded-lg border px-3 py-2 transition-colors ${TONE_CLASSES[group.kind]} ${
                  selectedKind === group.kind ? 'ring-2 ring-cityu-accent/40' : ''
                }`}
              >
                <div className="text-xl font-bold">{group.count}</div>
                <div className="text-xs font-medium leading-tight">{FILTERS.find((item) => item.kind === group.kind)?.label}</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white border border-gray-100 rounded-xl shadow-sm p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between mb-4">
          <div>
            <h2 className="font-bold text-gray-800">{selectedLabel}</h2>
            <p className="text-sm text-gray-500">当前显示 {filtered.length} 个项目</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索专业、学院或代码..."
                className="w-full sm:w-72 pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cityu-accent"
              />
            </div>
            <select
              value={selectedKind}
              onChange={(event) => setSelectedKind(event.target.value as SourceFilter)}
              className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-cityu-accent"
            >
              {FILTERS.map((item) => (
                <option key={item.kind} value={item.kind}>{item.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((item) => (
            <Link
              key={item.code}
              to={`/major/${item.code}`}
              className="block rounded-lg border border-gray-100 p-3 hover:border-cityu-accent hover:bg-cityu-accent/5 transition-colors"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="px-2 py-0.5 bg-cityu-accent/10 text-cityu-accent text-xs font-bold rounded">
                      {item.code}
                    </span>
                    <span className={`px-2 py-0.5 text-xs rounded border ${TONE_CLASSES[item.source.kind]}`}>
                      {FILTERS.find((filter) => filter.kind === item.source.kind)?.label}
                    </span>
                  </div>
                  <h3 className="font-semibold text-sm text-gray-800 leading-snug">{item.title}</h3>
                </div>
                <ShieldCheck className="w-4 h-4 text-gray-400 flex-shrink-0" />
              </div>
              <p className="text-xs text-gray-500 line-clamp-2">{item.source.description}</p>
              <div className="mt-2 flex items-center justify-between gap-2 text-xs text-gray-500">
                <span className="truncate">{item.department || item.college}</span>
                {item.source.sourceUrl && (
                  <span className="inline-flex items-center gap-1 text-cityu-accent">
                    来源
                    <ExternalLink className="w-3 h-3" />
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            没有找到匹配的项目
          </div>
        )}
      </section>
    </div>
  )
}
