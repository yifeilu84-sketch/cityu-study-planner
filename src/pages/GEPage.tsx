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
import { useLanguage } from '../i18n/LanguageContext.tsx'
import type { Language } from '../i18n/language.ts'

const SHORTLIST_KEY = 'cityu-ge-shortlist'

function formatTerms(terms: string[], language: Language): string {
  if (terms.length === 0) return language === 'en' ? 'No offering term listed on the official page' : '官网暂未列出学期'
  if (terms.length <= 2) return terms.join(' / ')
  return `${terms.slice(0, 2).join(' / ')} +${terms.length - 2}`
}

function selectClassName() {
  return 'px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-cityu-accent cursor-pointer'
}

export default function GEPage() {
  const { language, pick } = useLanguage()
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
        {pick('返回首页', 'Back to Home')}
      </Link>

      <section className="planner-command-center p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-5">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-6 h-6 text-cityu-accent" />
              <h1 className="text-xl sm:text-2xl font-bold text-cityu-dark">{pick('GE 选课助手', 'GE Course Explorer')}</h1>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">
              {pick(
                '浏览可自由组合的 Gateway Education 课程，按 Area、开课单位、Level、学期和考核结构快速筛选，并把候选 GE 加入收藏清单。',
                'Explore flexible Gateway Education courses by Area, offering unit, level, term, and assessment profile, then save candidates to a shortlist.',
              )}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-lg bg-gray-50 px-3 py-2 text-right">
              <div className="font-bold text-cityu-dark">{visibleCourses.length} / {geCourses.length}</div>
              <div className="text-xs text-gray-500">{pick('当前显示 / GE 总数', 'Showing / Total GE')}</div>
            </div>
            <button
              type="button"
              onClick={() => setShortlistOnly(!shortlistOnly)}
              className={`rounded-lg border px-3 py-2 text-right transition-colors cursor-pointer ${
                shortlistOnly ? 'border-cityu-accent bg-cityu-accent/10 text-cityu-accent' : 'border-gray-100 bg-gray-50 text-gray-600 hover:border-cityu-accent'
              }`}
            >
              <div className="font-bold">{shortlist.length}</div>
              <div className="text-xs">{pick('已收藏', 'Saved')}</div>
            </button>
          </div>
        </div>

        <div className="mb-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">
          <div>
            {pick(
              'GE Area、开课单位、Level 和学期来自 CityU 官方 GE Search；评分细则优先保留已解析的课程 PDF，缺 PDF 明细时显示官方 GE 页面标记。',
              'GE Area, offering unit, level, and term come from the official CityU GE Search. Assessment details use parsed course PDFs where available; otherwise the official GE page is clearly labelled.',
            )}
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
              placeholder={pick('搜索 GE 代码、课程名、单位...', 'Search GE code, title, or offering unit...')}
              aria-label={pick('搜索 GE 课程', 'Search GE courses')}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cityu-accent focus:border-transparent"
            />
          </div>
          <select value={area} onChange={event => setArea(event.target.value)} className={selectClassName()} aria-label="GE Area">
            <option value="all">{pick('全部 Area', 'All Areas')}</option>
            {options.areas.map(item => <option key={item} value={item}>{item === '未标注' ? pick('未标注', 'Unlabelled') : item}</option>)}
          </select>
          <select value={unit} onChange={event => setUnit(event.target.value)} className={selectClassName()} aria-label="Offering unit">
            <option value="all">{pick('全部单位', 'All Units')}</option>
            {options.units.map(item => <option key={item} value={item}>{item}</option>)}
          </select>
          <select value={level} onChange={event => setLevel(event.target.value)} className={selectClassName()} aria-label="GE Level">
            <option value="all">{pick('全部 Level', 'All Levels')}</option>
            {options.levels.map(item => <option key={item} value={item}>{item}</option>)}
          </select>
          <select value={term} onChange={event => setTerm(event.target.value)} className={selectClassName()} aria-label="Offering term">
            <option value="all">{pick('全部学期', 'All Terms')}</option>
            {options.terms.map(item => <option key={item} value={item}>{item}</option>)}
          </select>
          <select value={assessment} onChange={event => setAssessment(event.target.value as NonNullable<GEFilters['assessment']>)} className={selectClassName()} aria-label="Assessment profile">
            <option value="any">{pick('全部考核', 'All Assessments')}</option>
            <option value="has-exam">{pick('有 Final', 'Has Final')}</option>
            <option value="no-exam">{pick('无 Final', 'No Final')}</option>
            <option value="ca-only">100% CA</option>
            <option value="ca-heavy">CA 60%+</option>
          </select>
          <select value={exam} onChange={event => setExam(event.target.value as GEFilters['exam'])} className={selectClassName()} aria-label="Final exam">
            <option value="any">{pick('Final 不限', 'Any Final Status')}</option>
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
            {pick('只看收藏', 'Saved Only')}
          </button>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 hover:border-cityu-accent hover:text-cityu-accent transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
              {pick('清空筛选', 'Clear Filters')}
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
                  <div className="text-sm font-bold text-cityu-dark">{group.area === '未标注' ? pick('未标注', 'Unlabelled') : group.area}</div>
                  <div className="text-xs text-gray-500 leading-snug break-words">{group.label}</div>
                </div>
                <div className="text-lg font-bold text-cityu-accent">{group.count}</div>
              </div>
              <div className="mt-2 text-[11px] text-gray-500">
                {pick(`${group.withExamCount} 有 Final / ${group.noExamCount} 无 Final`, `${group.withExamCount} with Final / ${group.noExamCount} without Final`)}
              </div>
            </button>
          ))}
        </div>

        {options.areas.includes('未标注') && (
          <div className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 flex items-start gap-2">
            <SlidersHorizontal className="w-4 h-4 flex-shrink-0 mt-0.5" />
            {pick(
              '当前课程详情数据未稳定包含官方 GE Area 字段；未确认 Area 的课程会显示为“未标注”，不会臆测归类。',
              'Some official course details do not provide a stable GE Area field. Unconfirmed courses are shown as “Unlabelled” rather than assigned speculatively.',
            )}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
        {visibleCourses.map(item => {
          const saved = shortlistSet.has(item.code)
          return (
            <article
              key={item.code}
              className="interactive-card p-4 transition-all hover:border-cityu-accent hover:shadow-md"
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
                  aria-label={saved ? pick(`移除 ${item.code} 收藏`, `Remove ${item.code} from saved courses`) : pick(`收藏 ${item.code}`, `Save ${item.code}`)}
                  title={saved ? pick('移除收藏', 'Remove from saved') : pick('收藏 GE', 'Save GE course')}
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
                <div className="leading-snug break-words">{formatTerms(item.terms, language)}</div>
              </div>

              <div className="mt-3 h-2 rounded-full bg-gray-100 overflow-hidden" aria-label="Assessment split">
                <div
                  className="h-full bg-emerald-500"
                  style={{ width: `${Math.min(100, item.continuousPercent || (item.hasFinalExam ? 0 : 100))}%` }}
                />
              </div>

              <div className="flex flex-wrap gap-2 mt-3">
                <span className="text-xs px-2 py-1 rounded bg-gray-50 text-gray-600 border border-gray-100">
                  {item.area === '未标注' ? pick('未标注', 'Unlabelled') : item.area}
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
                  {pick('详情', 'Details')}
                </button>
              </div>
            </article>
          )
        })}
      </div>

      {visibleCourses.length === 0 && (
        <div className="surface-panel text-center py-12 text-gray-500">
          {pick('没有找到匹配的 GE 课程', 'No matching GE courses')}
        </div>
      )}

      <CourseDetailModal course={selectedCourse} onClose={() => setSelectedCourse(null)} />
    </div>
  )
}
