import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, Building2, Database, GitCompareArrows, GraduationCap, Search, ShieldCheck } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import majorIndex from '../data/majors-index.json'
import CourseDetailModal from '../components/CourseDetailModal'
import type { Course } from '../types'
import type { SearchIndex, SearchResults } from '../utils/searchIndex.ts'
import type { SourceStatusKind } from '../utils/sourceStatus.ts'

type SourceFilter = SourceStatusKind | 'all'

const COLLEGE_COLORS: Record<string, string> = {
  'college-of-biomedicine': 'bg-rose-100 text-rose-800 border-rose-200',
  'college-of-business': 'bg-amber-100 text-amber-800 border-amber-200',
  'college-of-computing': 'bg-blue-100 text-blue-800 border-blue-200',
  'college-of-engineering': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'college-of-liberal-arts-and-social-sciences': 'bg-violet-100 text-violet-800 border-violet-200',
  'college-of-science': 'bg-cyan-100 text-cyan-800 border-cyan-200',
  'jockey-club-college-of-veterinary-medicine-and-life-sciences': 'bg-teal-100 text-teal-800 border-teal-200',
  'school-of-creative-media': 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200',
  'school-of-energy-and-environment': 'bg-lime-100 text-lime-800 border-lime-200',
  'school-of-law': 'bg-indigo-100 text-indigo-800 border-indigo-200',
}

const SOURCE_FILTERS: { kind: SourceFilter; label: string }[] = [
  { kind: 'all', label: '全部来源' },
  { kind: 'official', label: '官方计划' },
  { kind: 'structure', label: '结构图解析' },
  { kind: 'derived', label: '毕业要求整理' },
  { kind: 'diy', label: 'DIY 空表' },
]

const SOURCE_BADGE_CLASSES: Record<SourceStatusKind, string> = {
  official: 'bg-blue-50 text-blue-700 border-blue-100',
  structure: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  derived: 'bg-amber-50 text-amber-800 border-amber-100',
  diy: 'bg-slate-50 text-slate-700 border-slate-200',
}

const EMPTY_SEARCH_RESULTS: SearchResults = { majors: [], courses: [] }

function getMajorCount(college: any) {
  if (college.majors && college.majors.length > 0) {
    return college.majors.length
  }
  return college.departments.reduce((sum: number, d: any) => sum + d.majors.length, 0)
}

function getSourceLabel(kind: SourceStatusKind) {
  return SOURCE_FILTERS.find((item) => item.kind === kind)?.label ?? kind
}

export default function Home() {
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [searchBundle, setSearchBundle] = useState<{
    index: SearchIndex
    searchPlanner: (index: SearchIndex, query: string, options?: { limit?: number; sourceKind?: SourceFilter }) => SearchResults
  } | null>(null)
  const [courseDetails, setCourseDetails] = useState<Record<string, Course> | null>(null)

  const hasSearch = search.trim().length > 0
  const isSearchLoading = hasSearch && !searchBundle

  useEffect(() => {
    if (!hasSearch || searchBundle) return
    let cancelled = false

    Promise.all([
      import('../data/search-index.json'),
      import('../utils/searchIndex.ts'),
    ]).then(([indexModule, searchModule]) => {
      if (cancelled) return
      setSearchBundle({
        index: indexModule.default as SearchIndex,
        searchPlanner: searchModule.searchPlanner,
      })
    })

    return () => {
      cancelled = true
    }
  }, [hasSearch, searchBundle])

  const searchResults = useMemo(() => {
    if (!hasSearch || !searchBundle) return EMPTY_SEARCH_RESULTS
    return searchBundle.searchPlanner(searchBundle.index, search, { limit: 10, sourceKind: sourceFilter })
  }, [hasSearch, searchBundle, search, sourceFilter])

  const openCourse = async (code: string) => {
    if (courseDetails) {
      setSelectedCourse(courseDetails[code] ?? null)
      return
    }
    const coursesModule = await import('../data/courses.json')
    const loadedCourses = coursesModule.default as unknown as Record<string, Course>
    setCourseDetails(loadedCourses)
    setSelectedCourse(loadedCourses[code] ?? null)
  }

  const totalMajors = (majorIndex.colleges as any[]).reduce((sum, c) => sum + getMajorCount(c), 0)

  return (
    <div>
      <div className="text-center py-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-cityu-dark mb-3">
          CityU Study Planner
        </h1>
        <p className="text-gray-600 text-base sm:text-lg mb-2">
          浏览香港城市大学本科专业的学习计划、课程要求与课程评分细则
        </p>
        <p className="text-gray-500 text-sm">
          覆盖 {majorIndex.colleges.length} 个学院 / 学校 · {totalMajors} 个本科项目
        </p>
      </div>

      <div className="max-w-3xl mx-auto mb-8 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="搜索学院、专业或课程..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-cityu-accent focus:border-transparent"
          />
        </div>
        {hasSearch && (
          <div className="flex flex-wrap items-center justify-center gap-2">
            {SOURCE_FILTERS.map((item) => (
              <button
                key={item.kind}
                onClick={() => setSourceFilter(item.kind)}
                className={`px-3 py-1.5 rounded-lg border text-xs sm:text-sm transition-colors ${
                  sourceFilter === item.kind
                    ? 'bg-cityu-dark text-white border-cityu-dark'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-cityu-accent hover:text-cityu-accent'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {hasSearch ? (
        <div className="space-y-6">
          <section className="bg-white border border-gray-100 rounded-xl shadow-sm p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="font-bold text-gray-800 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-cityu-accent" />
                专业结果
              </h2>
              <span className="text-xs text-gray-500">{searchResults.majors.length} 个匹配</span>
            </div>
            {isSearchLoading ? (
              <div className="text-sm text-gray-500 py-3">正在加载搜索索引...</div>
            ) : searchResults.majors.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {searchResults.majors.map(item => (
                  <Link
                    key={item.code}
                    to={`/major/${item.code}`}
                    className="block border border-gray-100 rounded-lg p-3 hover:border-cityu-accent hover:bg-cityu-accent/5 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="px-2 py-0.5 bg-cityu-accent/10 text-cityu-accent text-xs font-bold rounded">
                        {item.code}
                      </span>
                      <span className={`px-2 py-0.5 border text-xs rounded ${SOURCE_BADGE_CLASSES[item.sourceKind]}`}>
                        {getSourceLabel(item.sourceKind)}
                      </span>
                      <span className="text-xs text-gray-500 truncate">{item.department || item.college}</span>
                    </div>
                    <div className="font-semibold text-gray-800 text-sm">{item.title}</div>
                    <div className="text-xs text-gray-500 mt-1">{item.college}</div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500 py-3">没有找到匹配专业</div>
            )}
          </section>

          <section className="bg-white border border-gray-100 rounded-xl shadow-sm p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="font-bold text-gray-800 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-cityu-blue" />
                课程结果
              </h2>
              <span className="text-xs text-gray-500">{searchResults.courses.length} 门匹配</span>
            </div>
            {isSearchLoading ? (
              <div className="text-sm text-gray-500 py-3">正在加载课程索引...</div>
            ) : searchResults.courses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {searchResults.courses.map(item => (
                  <button
                    key={item.code}
                    onClick={() => openCourse(item.code)}
                    className="text-left border border-gray-100 rounded-lg p-3 hover:border-cityu-blue hover:bg-blue-50 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 bg-blue-50 text-cityu-blue text-xs font-bold rounded">
                        {item.code}
                      </span>
                      <span className="text-xs text-gray-500">{item.credits} CU</span>
                    </div>
                    <div className="font-semibold text-gray-800 text-sm">{item.title}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {item.relatedMajorCount > 0
                        ? `出现在 ${item.relatedMajorCount} 个专业路径中`
                        : '暂未关联到专业学习计划'}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500 py-3">没有找到匹配课程</div>
            )}
          </section>
        </div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-3">
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="font-bold text-gray-800 flex items-center gap-2">
                  <Database className="w-4 h-4 text-cityu-accent" />
                  数据来源覆盖率
                </div>
                <div className="text-sm text-gray-500">查看哪些专业来自官方 study plan，哪些需要按毕业要求自行核对。</div>
              </div>
              <Link
                to="/coverage"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-cityu-dark text-white text-sm hover:bg-cityu-purple transition-colors"
              >
                查看来源
                <ShieldCheck className="w-4 h-4" />
              </Link>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="font-bold text-gray-800">GE 选课助手</div>
                <div className="text-sm text-gray-500">按课程名、代码和考核方式筛选可自由组合的 GE 课程。</div>
              </div>
              <Link
                to="/ge"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-cityu-dark text-white text-sm hover:bg-cityu-purple transition-colors"
              >
                打开 GE 工具
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="font-bold text-gray-800 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-cityu-accent" />
                  硕博页面
                </div>
                <div className="text-sm text-gray-500">集中查看 CityUHK 硕士、研究型硕博和专业博士官方入口。</div>
              </div>
              <Link
                to="/postgraduate"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-cityu-dark text-white text-sm hover:bg-cityu-purple transition-colors"
              >
                打开硕博
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="font-bold text-gray-800 flex items-center gap-2">
                  <GitCompareArrows className="w-4 h-4 text-cityu-accent" />
                  专业对比
                </div>
                <div className="text-sm text-gray-500">并排查看 2-3 个专业的学分结构、来源可信度和重叠课程。</div>
              </div>
              <Link
                to="/compare"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-cityu-dark text-white text-sm hover:bg-cityu-purple transition-colors"
              >
                打开对比
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {(majorIndex.colleges as any[]).map(college => {
              const majorCount = getMajorCount(college)
              const deptCount = college.departments?.length || 0
              const isSchool = college.type === 'school'
              const colorClass = COLLEGE_COLORS[college.id] || 'bg-gray-100 text-gray-800 border-gray-200'

              return (
                <Link
                  key={college.id}
                  to={`/college/${college.id}`}
                  className={`group block p-5 rounded-xl border-2 transition-all hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] ${colorClass}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <Building2 className="w-6 h-6 opacity-70" />
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-white/60">
                      {majorCount} 个专业
                    </span>
                  </div>
                  <h2 className="font-bold text-lg mb-1">{college.name}</h2>
                  <p className="text-sm opacity-70">
                    {isSchool ? '独立学院 / 学校' : `${deptCount} 个学系`}
                  </p>
                  <div className="mt-3 flex items-center gap-1 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    查看详情 <ArrowRight className="w-4 h-4" />
                  </div>
                </Link>
              )
            })}
          </div>
        </>
      )}

      <CourseDetailModal course={selectedCourse} onClose={() => setSelectedCourse(null)} />
    </div>
  )
}
