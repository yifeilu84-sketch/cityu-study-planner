import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, BookOpen, FileText, Search, SlidersHorizontal } from 'lucide-react'
import coursesData from '../data/courses.json'
import type { Course } from '../types'
import CourseDetailModal from '../components/CourseDetailModal'
import { filterGECourses, getGECourses } from '../utils/geCourses.ts'

const AREA_ORDER = ['Area 1', 'Area 2', 'Area 3', 'University Req.', '未标注']

export default function GEPage() {
  const courses: Record<string, Course> = coursesData as any
  const [query, setQuery] = useState('')
  const [area, setArea] = useState('all')
  const [exam, setExam] = useState<'any' | 'has-exam' | 'no-exam'>('any')
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)

  const geCourses = useMemo(() => getGECourses(courses), [courses])
  const areas = useMemo(() => Array.from(new Set(geCourses.map(item => item.area))).sort((a, b) => {
    const indexA = AREA_ORDER.indexOf(a)
    const indexB = AREA_ORDER.indexOf(b)
    if (indexA !== -1 || indexB !== -1) {
      return (indexA === -1 ? AREA_ORDER.length : indexA) - (indexB === -1 ? AREA_ORDER.length : indexB)
    }
    return a.localeCompare(b)
  }), [geCourses])
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
