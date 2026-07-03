import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, BookOpen, ExternalLink, FileText, Search, SlidersHorizontal } from 'lucide-react'
import coursesData from '../data/courses.json'
import type { Course } from '../types'
import CourseDetailModal from '../components/CourseDetailModal'
import { filterGECourses, getGECourses, summarizeGEAreas } from '../utils/geCourses.ts'

function formatTerms(terms: string[]): string {
  if (terms.length === 0) return '官方暂未列出学期'
  if (terms.length <= 2) return terms.join(' / ')
  return `${terms.slice(0, 2).join(' / ')} +${terms.length - 2}`
}

export default function GEPage() {
  const courses: Record<string, Course> = coursesData as any
  const [query, setQuery] = useState('')
  const [area, setArea] = useState('all')
  const [exam, setExam] = useState<'any' | 'has-exam' | 'no-exam'>('any')
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)

  const geCourses = useMemo(() => getGECourses(courses), [courses])
  const geSummary = useMemo(() => summarizeGEAreas(geCourses), [geCourses])
  const areas = useMemo(() => geSummary.groups.map(group => group.area), [geSummary])
  const filtered = useMemo(() => filterGECourses(geCourses, { query, area, exam }), [geCourses, query, area, exam])

  return (
    <div className="space-y-5">
      <Link to="/" className="inline-flex items-center gap-1 text-gray-500 hover:text-cityu-accent transition-colors text-sm sm:text-base">
        <ArrowLeft className="w-4 h-4" />
        返回首页
      </Link>

      <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-6 h-6 text-cityu-accent" />
              <h1 className="text-xl sm:text-2xl font-bold text-cityu-dark">GE 选课助手</h1>
            </div>
            <p className="text-sm text-gray-500">
              浏览可自由组合的 Gateway Education 课程，并按考核结构快速筛选。
            </p>
          </div>
          <div className="text-sm text-gray-500 sm:text-right">
            <div className="font-semibold text-cityu-dark">{filtered.length} / {geCourses.length}</div>
            <div>当前显示 / GE 总数</div>
          </div>
        </div>

        <div className="mb-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">
          <div>
            GE Area、开课单位、Level 和学期来自 CityU 官方 GE Search；评分细则优先保留已解析的课程 PDF，缺 PDF 明细时显示官方 GE 页标记。
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

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_auto] gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="搜索 GE 代码或课程名..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cityu-accent focus:border-transparent"
            />
          </div>
          <select
            value={area}
            onChange={event => setArea(event.target.value)}
            className="px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-cityu-accent"
          >
            <option value="all">全部 Area</option>
            {areas.map(item => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          <select
            value={exam}
            onChange={event => setExam(event.target.value as 'any' | 'has-exam' | 'no-exam')}
            className="px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-cityu-accent"
          >
            <option value="any">全部考核</option>
            <option value="has-exam">有 Final Exam</option>
            <option value="no-exam">无 Final Exam</option>
          </select>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2">
          {geSummary.groups.map(group => (
            <button
              key={group.area}
              type="button"
              onClick={() => setArea(area === group.area ? 'all' : group.area)}
              className={`text-left rounded-lg border p-3 transition-colors ${
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

        {areas.includes('未标注') && (
          <div className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 flex items-start gap-2">
            <SlidersHorizontal className="w-4 h-4 flex-shrink-0 mt-0.5" />
            当前课程详情数据未稳定包含官方 GE Area 字段；未确认 Area 的课程会显示为“未标注”，不会臆测归类。
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
        {filtered.map(item => (
          <button
            key={item.code}
            onClick={() => setSelectedCourse(item.course)}
            className="text-left bg-white border border-gray-100 rounded-xl shadow-sm p-4 hover:border-cityu-accent hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 bg-cityu-accent/10 text-cityu-accent text-xs font-bold rounded">
                    {item.code}
                  </span>
                  <span className="text-xs text-gray-500">{item.credits} CU</span>
                </div>
                <h2 className="font-semibold text-gray-800 text-sm leading-snug">{item.title}</h2>
              </div>
              <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
            </div>
            <div className="mt-3 grid grid-cols-1 gap-1 text-xs text-gray-500">
              <div className="flex flex-wrap gap-1.5">
                {item.offeringUnit && (
                  <span className="px-2 py-0.5 rounded bg-gray-50 border border-gray-100">
                    {item.offeringUnit}
                  </span>
                )}
                {item.level && (
                  <span className="px-2 py-0.5 rounded bg-gray-50 border border-gray-100">
                    {item.level}
                  </span>
                )}
              </div>
              <div className="leading-snug break-words">
                {formatTerms(item.terms)}
              </div>
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
            </div>
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-500 bg-white border border-gray-100 rounded-xl">
          没有找到匹配的 GE 课程
        </div>
      )}

      <CourseDetailModal course={selectedCourse} onClose={() => setSelectedCourse(null)} />
    </div>
  )
}
