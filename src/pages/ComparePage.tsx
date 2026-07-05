import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ExternalLink, GitCompareArrows, Plus, Search, ShieldCheck, X } from 'lucide-react'
import allMajors from '../data/all-majors.json'
import {
  buildMajorComparison,
  findCompareCandidates,
  type MajorCompareItem,
  type RequirementRow,
} from '../utils/majorComparison.ts'
import type { SourceStatusKind } from '../utils/sourceStatus.ts'

const DEFAULT_CODES = ['BSC1_CSC1-1', 'BSC1_CYBE-1']

const SOURCE_LABELS: Record<SourceStatusKind, string> = {
  official: '官方 Study Plan',
  structure: '结构图解析',
  derived: '按毕业要求排',
  diy: 'DIY 空表',
}

const SOURCE_CLASSES: Record<SourceStatusKind, string> = {
  official: 'bg-blue-50 text-blue-700 border-blue-100',
  structure: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  derived: 'bg-amber-50 text-amber-800 border-amber-100',
  diy: 'bg-slate-50 text-slate-700 border-slate-200',
}

function parseCodes(value: string | null): string[] {
  if (!value) return DEFAULT_CODES
  const codes = value.split(',').map(item => item.trim()).filter(Boolean)
  return codes.length > 0 ? [...new Set(codes)].slice(0, 3) : DEFAULT_CODES
}

function getRequirementCredits(rows: RequirementRow[], key: string): number {
  return rows.find(row => row.key === key)?.credits ?? 0
}

function metricRows() {
  return [
    { label: '总学分', render: (item: MajorCompareItem) => `${item.totalCredits} CU` },
    { label: '来源状态', render: (item: MajorCompareItem) => SOURCE_LABELS[item.sourceKind] },
    { label: 'GE', render: (item: MajorCompareItem) => `${getRequirementCredits(item.requirementRows, 'gatewayEducation')} CU` },
    { label: 'Major Core', render: (item: MajorCompareItem) => `${getRequirementCredits(item.requirementRows, 'majorCore')} CU` },
    { label: 'Major Electives', render: (item: MajorCompareItem) => `${getRequirementCredits(item.requirementRows, 'majorElectives')} CU` },
    { label: 'Free Electives', render: (item: MajorCompareItem) => `${getRequirementCredits(item.requirementRows, 'freeElectives')} CU` },
    { label: '可核对课程数', render: (item: MajorCompareItem) => `${item.concreteCourseCount}` },
    { label: 'FYP / Capstone', render: (item: MajorCompareItem) => item.hasProject ? '有' : '未标出' },
    { label: '实习 / Training', render: (item: MajorCompareItem) => item.hasInternship ? '有' : '未标出' },
  ]
}

export default function ComparePage() {
  const majors = allMajors as any[]
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState('')

  const selectedCodes = useMemo(() => parseCodes(searchParams.get('majors')), [searchParams])
  const comparison = useMemo(() => buildMajorComparison(majors, selectedCodes), [majors, selectedCodes])
  const candidates = useMemo(() => findCompareCandidates(majors, query, selectedCodes, 8), [majors, query, selectedCodes])

  const setCodes = (codes: string[]) => {
    const nextCodes = [...new Set(codes)].slice(0, 3)
    setSearchParams({ majors: nextCodes.join(',') })
  }

  const addCode = (code: string) => {
    if (selectedCodes.includes(code) || selectedCodes.length >= 3) return
    setCodes([...selectedCodes, code])
    setQuery('')
  }

  const removeCode = (code: string) => {
    if (selectedCodes.length <= 1) return
    setCodes(selectedCodes.filter(item => item !== code))
  }

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
              <GitCompareArrows className="w-6 h-6 text-cityu-accent" />
              <h1 className="text-xl sm:text-2xl font-bold text-cityu-dark">专业对比</h1>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">
              把 2-3 个本科项目放在一起看总学分、来源可信度、课程结构、FYP/实习标记和重叠课程。对没有官网明确 study plan 的项目，仍请以学院和 ARRO 最终审核为准。
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
            {(['official', 'structure', 'derived', 'diy'] as SourceStatusKind[]).map(kind => (
              <div key={kind} className={`rounded-lg border px-3 py-2 text-right ${SOURCE_CLASSES[kind]}`}>
                <div className="font-bold">{comparison.sourceCounts[kind]}</div>
                <div className="text-xs">{SOURCE_LABELS[kind]}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {comparison.items.map(item => (
              <article key={item.code} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded bg-cityu-accent/10 text-cityu-accent text-xs font-bold">
                        {item.code}
                      </span>
                      <span className={`px-2 py-0.5 rounded border text-xs ${SOURCE_CLASSES[item.sourceKind]}`}>
                        {SOURCE_LABELS[item.sourceKind]}
                      </span>
                    </div>
                    <h2 className="font-semibold text-gray-800 text-sm leading-snug">{item.title}</h2>
                    <div className="text-xs text-gray-500 mt-1">{item.department || item.college}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeCode(item.code)}
                    disabled={selectedCodes.length <= 1}
                    className="h-9 w-9 shrink-0 rounded-lg border border-gray-200 bg-white text-gray-500 inline-flex items-center justify-center hover:border-cityu-accent hover:text-cityu-accent disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    aria-label={`移除 ${item.code}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded bg-white border border-gray-100 px-2 py-1">{item.totalCredits} CU</span>
                  <span className="rounded bg-white border border-gray-100 px-2 py-1">{item.concreteCourseCount} 门可核对课程</span>
                  {item.hasProject && <span className="rounded bg-emerald-50 border border-emerald-100 text-emerald-700 px-2 py-1">FYP / Project</span>}
                  {item.hasInternship && <span className="rounded bg-amber-50 border border-amber-100 text-amber-700 px-2 py-1">Internship / Training</span>}
                </div>
              </article>
            ))}
          </div>

          <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
            <label htmlFor="compare-search" className="text-xs font-semibold text-gray-600">添加专业</label>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                id="compare-search"
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder={selectedCodes.length >= 3 ? '最多同时对比 3 个专业' : '搜索专业名、代码、学院...'}
                disabled={selectedCodes.length >= 3}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cityu-accent disabled:bg-gray-100"
              />
            </div>
            <div className="mt-3 space-y-2 max-h-72 overflow-y-auto">
              {candidates.map(candidate => (
                <button
                  key={candidate.code}
                  type="button"
                  onClick={() => addCode(candidate.code)}
                  className="w-full text-left rounded-lg border border-gray-100 bg-white p-2.5 hover:border-cityu-accent hover:bg-cityu-accent/5 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-cityu-accent">{candidate.code}</span>
                    <Plus className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="text-sm font-semibold text-gray-800 leading-snug mt-1">{candidate.title}</div>
                  <div className="text-xs text-gray-500 mt-1">{candidate.totalCredits} CU · {SOURCE_LABELS[candidate.sourceKind]}</div>
                </button>
              ))}
              {query.trim() && candidates.length === 0 && selectedCodes.length < 3 && (
                <div className="text-xs text-gray-500 py-3">没有找到匹配的本科专业</div>
              )}
            </div>
          </div>
        </div>
      </section>

      {comparison.items.length > 0 && (
        <section className="bg-white border border-gray-100 rounded-xl shadow-sm p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="w-5 h-5 text-cityu-accent" />
            <h2 className="font-bold text-gray-800">结构对比</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 text-gray-500 font-medium w-44">指标</th>
                  {comparison.items.map(item => (
                    <th key={item.code} className="text-left py-2 px-3 text-gray-700 font-semibold">
                      <Link to={`/major/${item.code}`} className="inline-flex items-center gap-1 hover:text-cityu-accent">
                        {item.code}
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {metricRows().map(row => (
                  <tr key={row.label} className="odd:bg-gray-50/60">
                    <td className="py-2.5 px-3 font-medium text-gray-600">{row.label}</td>
                    {comparison.items.map(item => (
                      <td key={`${item.code}-${row.label}`} className="py-2.5 px-3 text-gray-800">
                        {row.render(item)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="bg-white border border-gray-100 rounded-xl shadow-sm p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div>
            <h2 className="font-bold text-gray-800">重叠课程</h2>
            <p className="text-sm text-gray-500">只统计真实课程代码，不包含 GE、专业选修占位符或自由选修占位符。</p>
          </div>
          <div className="text-sm font-semibold text-cityu-accent">{comparison.overlaps.length} 门</div>
        </div>
        {comparison.overlaps.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {comparison.overlaps.slice(0, 80).map(item => (
              <span key={item.code} className="rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-1.5 text-xs text-gray-700">
                <span className="font-mono font-bold text-cityu-accent">{item.code}</span>
                <span className="ml-1 text-gray-500">{item.majorCodes.length}/{comparison.items.length}</span>
              </span>
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-500 py-6 text-center border border-dashed border-gray-200 rounded-lg">
            当前选择的专业没有明显重叠课程。
          </div>
        )}
      </section>
    </div>
  )
}
