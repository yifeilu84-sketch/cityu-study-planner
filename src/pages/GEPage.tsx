import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  BookOpen,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  FileText,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import coursesData from '../data/courses.json'
import type { Course } from '../types'
import CourseDetailModal from '../components/CourseDetailModal'
import { filterGECourses, getGECourses, getGEFilterOptions, summarizeGEAreas, type GEFilters } from '../utils/geCourses.ts'
import { parseGEShortlist, serializeGEShortlist, toggleGEShortlist } from '../utils/geShortlist.ts'

const SHORTLIST_KEY = 'cityu-ge-shortlist'

function formatTerms(terms: string[]): string {
  if (terms.length === 0) return '官网暂未列出学期'
  if (terms.length <= 2) return terms.join(' / ')
  return `${terms.slice(0, 2).join(' / ')} +${terms.length - 2}`
}

function selectClassName() {
  return 'px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-cityu-accent cursor-pointer'
}

export default function GEPage() {
  const courses: Record<string, Course> = coursesData as any
  const [query, setQuery] = useState('')
  const [area, setArea] = useState('all')
  const [exam, setExam] = useState<GEFilters['exam']>('any')
  const [unit, setUnit] = useState('all')
  const [level, setLevel] = useState('all')
  const [term, setTerm] = useState('all')
  const [assessment, setAssessment] = useState<NonNullable<GEFilters['assessment']>>('any')
  const [shortlistOnly, setShortlistOnly] = useState(false)
  const [shortlist, setShortlist] = useState<string[]>(() => (
    typeof window === 'undefined' ? [] : parseGEShortlist(window.localStorage.getItem(SHORTLIST_KEY))
  ))
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)

  useEffect(() => {
    window.localStorage.setItem(SHORTLIST_KEY, serializeGEShortlist(shortlist))
  }, [shortlist])

  const geCourses = useMemo(() => getGECourses(courses), [courses])
  const geSummary = useMemo(() => summarizeGEAreas(geCourses), [geCourses])
  const options = useMemo(() => getGEFilterOptions(geCourses), [geCourses])
  const shortlistSet = useMemo(() => new Set(shortlist), [shortlist])
  const filtered = useMemo(() => filterGECourses(geCourses, {
    query,
    area,
    exam,
    unit,
    level,
    term,
    assessment,
  }), [geCourses, query, area, exam, unit, level, term, assessment])
  const visibleCourses = useMemo(() => (
    shortlistOnly ? filtered.filter(item => shortlistSet.has(item.code)) : filtered
  ), [filtered, shortlistOnly, shortlistSet])

  const resetFilters = () => {
    setQuery('')
    setArea('all')
    setExam('any')
    setUnit('all')
    setLevel('all')
    setTerm('all')
    setAssessment('any')
    setShortlistOnly(false)
  }

  const hasActiveFilters = Boolean(query.trim()) || area !== 'all' || exam !== 'any' || unit !== 'all' || level !== 'all' || term !== 'all' || assessment !== 'any' || shortlistOnly

  return (
    <div className="space-y-5">
      <Link to="/" className="inline-flex items-center gap-1 text-gray-500 hover:text-cityu-accent transition-colors text-sm sm:text-base">
        <ArrowLeft className="w-4 h-4" />
        返回首页
      </Link>

      <section className="bg-white border border-gray-100 rounded-xl shadow-sm p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-5">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-6 h-6 text-cityu-accent" />
              <h1 className="text-xl sm:text-2xl font-bold text-cityu-dark">GE 选课助手</h1>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">
              浏览可自由组合的 Gateway Education 课程，按 Area、开课单位、Level、学期和考核结构快速筛选，并把候选 GE 加入收藏清单。
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-lg bg-gray-50 px-3 py-2 text-right">
              <div className="font-bold text-cityu-dark">{visibleCourses.length} / {geCourses.length}</div>
              <div className="text-xs text-gray-500">当前显示 / GE 总数</div>
            </div>
            <button
              type="button"
              onClick={() => setShortlistOnly(!shortlistOnly)}
              className={`rounded-lg border px-3 py-2 text-right transition-colors cursor-pointer ${
                shortlistOnly ? 'border-cityu-accent bg-cityu-accent/10 text-cityu-accent' : 'border-gray-100 bg-gray-50 text-gray-600 hover:border-cityu-accent'
              }`}
            >
              <div className="font-bold">{shortlist.length}</div>
              <div className="text-xs">已收藏</div>
            </button>
          </div>
        </div>

        <div className="mb-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">
          <div>
            GE Area、开课单位、Level 和学期来自 CityU 官方 GE Search；评分细则优先保留已解析的课程 PDF，缺 PDF 明细时显示官方 GE 页面标记。
          </div>
          <a
            href="https://www.cityu.edu.hk/ge_info/Search/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-blue-900 hover:text-cityu-accent"
          >
            CityU GE Search
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(220px,1.5fr)_repeat(6,minmax(120px,1fr))] gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="搜索 GE 代码、课程名、单位..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cityu-accent focus:border-transparent"
            />
          </div>
          <select value={area} onChange={event => setArea(event.target.value)} className={selectClassName()} aria-label="GE Area">
            <option value="all">全部 Area</option>
            {options.areas.map(item => <option key={item} value={item}>{item}</option>)}
          </select>
          <select value={unit} onChange={event => setUnit(event.target.value)} className={selectClassName()} aria-label="Offering unit">
            <option value="all">全部单位</option>
            {options.units.map(item => <option key={item} value={item}>{item}</option>)}
          </select>
          <select value={level} onChange={event => setLevel(event.target.value)} className={selectClassName()} aria-label="GE Level">
            <option value="all">全部 Level</option>
            {options.levels.map(item => <option key={item} value={item}>{item}</option>)}
          </select>
          <select value={term} onChange={event => setTerm(event.target.value)} className={selectClassName()} aria-label="Offering term">
            <option value="all">全部学期</option>
            {options.terms.map(item => <option key={item} value={item}>{item}</option>)}
          </select>
          <select value={assessment} onChange={event => setAssessment(event.target.value as NonNullable<GEFilters['assessment']>)} className={selectClassName()} aria-label="Assessment profile">
            <option value="any">全部考核</option>
            <option value="has-exam">有 Final</option>
            <option value="no-exam">无 Final</option>
            <option value="ca-only">100% CA</option>
            <option value="ca-heavy">CA 60%+</option>
          </select>
          <select value={exam} onChange={event => setExam(event.target.value as GEFilters['exam'])} className={selectClassName()} aria-label="Final exam">
            <option value="any">Final 不限</option>
            <option value="has-exam">Final Yes</option>
            <option value="no-exam">Final No</option>
          </select>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShortlistOnly(!shortlistOnly)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
              shortlistOnly ? 'border-cityu-accent bg-cityu-accent text-white' : 'border-gray-200 bg-white text-gray-600 hover:border-cityu-accent hover:text-cityu-accent'
            }`}
          >
            {shortlistOnly ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
            只看收藏
          </button>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 hover:border-cityu-accent hover:text-cityu-accent transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
              清空筛选
            </button>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2">
          {geSummary.groups.map(group => (
            <button
              key={group.area}
              type="button"
              onClick={() => setArea(area === group.area ? 'all' : group.area)}
              className={`text-left rounded-lg border p-3 transition-colors cursor-pointer ${
                area === group.area
                  ? 'border-cityu-accent bg-cityu-accent/5'
                  : 'border-gray-100 bg-white hover:border-cityu-accent/60'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-cityu-dark">{group.area}</div>
                  <div className="text-xs text-gray-500 leading-snug break-words">{group.label}</div>
                </div>
                <div className="text-lg font-bold text-cityu-accent">{group.count}</div>
              </div>
              <div className="mt-2 text-[11px] text-gray-500">
                {group.withExamCount} 有 Final / {group.noExamCount} 无 Final
              </div>
            </button>
          ))}
        </div>

        {options.areas.includes('未标注') && (
          <div className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 flex items-start gap-2">
            <SlidersHorizontal className="w-4 h-4 flex-shrink-0 mt-0.5" />
            当前课程详情数据未稳定包含官方 GE Area 字段；未确认 Area 的课程会显示为“未标注”，不会臆测归类。
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
        {visibleCourses.map(item => {
          const saved = shortlistSet.has(item.code)
          return (
            <article
              key={item.code}
              className="bg-white border border-gray-100 rounded-xl shadow-sm p-4 transition-all hover:border-cityu-accent hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <button
                  type="button"
                  onClick={() => setSelectedCourse(item.course)}
                  className="min-w-0 flex-1 text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="px-2 py-0.5 bg-cityu-accent/10 text-cityu-accent text-xs font-bold rounded">
                      {item.code}
                    </span>
                    <span className="text-xs text-gray-500">{item.credits} CU</span>
                  </div>
                  <h2 className="font-semibold text-gray-800 text-sm leading-snug">{item.title}</h2>
                </button>
                <button
                  type="button"
                  onClick={() => setShortlist(current => toggleGEShortlist(current, item.code))}
                  className={`h-10 w-10 shrink-0 rounded-lg border inline-flex items-center justify-center transition-colors cursor-pointer ${
                    saved ? 'border-cityu-accent bg-cityu-accent/10 text-cityu-accent' : 'border-gray-200 text-gray-400 hover:border-cityu-accent hover:text-cityu-accent'
                  }`}
                  aria-label={saved ? `移除 ${item.code} 收藏` : `收藏 ${item.code}`}
                  title={saved ? '移除收藏' : '收藏 GE'}
                >
                  {saved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                </button>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-1 text-xs text-gray-500">
                <div className="flex flex-wrap gap-1.5">
                  {item.offeringUnit && (
                    <span className="px-2 py-0.5 rounded bg-gray-50 border border-gray-100">{item.offeringUnit}</span>
                  )}
                  {item.level && (
                    <span className="px-2 py-0.5 rounded bg-gray-50 border border-gray-100">{item.level}</span>
                  )}
                </div>
                <div className="leading-snug break-words">{formatTerms(item.terms)}</div>
              </div>

              <div className="mt-3 h-2 rounded-full bg-gray-100 overflow-hidden" aria-label="Assessment split">
                <div
                  className="h-full bg-emerald-500"
                  style={{ width: `${Math.min(100, item.continuousPercent || (item.hasFinalExam ? 0 : 100))}%` }}
                />
              </div>

              <div className="flex flex-wrap gap-2 mt-3">
                <span className="text-xs px-2 py-1 rounded bg-gray-50 text-gray-600 border border-gray-100">
                  {item.area}
                </span>
                <span className="text-xs px-2 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">
                  CA {item.continuousPercent || 0}%
                </span>
                <span className={`text-xs px-2 py-1 rounded border ${
                  item.hasFinalExam
                    ? 'bg-rose-50 text-rose-700 border-rose-100'
                    : 'bg-blue-50 text-blue-700 border-blue-100'
                }`}>
                  {item.examPercent > 0 ? `Final ${item.examPercent}%` : item.hasFinalExam ? 'Final: Yes' : 'Final 0%'}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedCourse(item.course)}
                  className="ml-auto inline-flex items-center gap-1 text-xs text-cityu-accent hover:text-cityu-purple cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  详情
                </button>
              </div>
            </article>
          )
        })}
      </div>

      {visibleCourses.length === 0 && (
        <div className="text-center py-12 text-gray-500 bg-white border border-gray-100 rounded-xl">
          没有找到匹配的 GE 课程
        </div>
      )}

      <CourseDetailModal course={selectedCourse} onClose={() => setSelectedCourse(null)} />
    </div>
  )
}
