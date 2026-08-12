import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, Building2, Database, GitCompareArrows, GraduationCap, Microscope, Search, ShieldCheck, Users } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import majorIndex from '../data/majors-index.json'
import CourseDetailModal from '../components/CourseDetailModal'
import type { Course } from '../types'
import type { SearchIndex, SearchResults } from '../utils/searchIndex.ts'
import type { SourceStatusKind } from '../utils/sourceStatus.ts'
import { getCollegeThemeStyle } from '../utils/collegeThemes.ts'
import CampusSpotlightCarousel from '../components/CampusSpotlightCarousel'
import { useLanguage } from '../i18n/LanguageContext.tsx'

type SourceFilter = SourceStatusKind | 'all'

const SOURCE_FILTERS: { kind: SourceFilter; zh: string; en: string }[] = [
  { kind: 'all', zh: '全部来源', en: 'All sources' },
  { kind: 'official', zh: '官方计划', en: 'Official plan' },
  { kind: 'structure', zh: '结构图解析', en: 'Structure / flowchart' },
  { kind: 'derived', zh: '毕业要求整理', en: 'Requirements-based' },
  { kind: 'diy', zh: 'DIY 空表', en: 'DIY blank plan' },
]

const SOURCE_BADGE_CLASSES: Record<SourceStatusKind, string> = {
  official: 'bg-blue-50 text-blue-700 border-blue-100',
  structure: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  derived: 'bg-amber-50 text-amber-800 border-amber-100',
  diy: 'bg-slate-50 text-slate-700 border-slate-200',
}

const EMPTY_SEARCH_RESULTS: SearchResults = {
  majors: [],
  courses: [],
  postgraduateProgrammes: [],
  pgCourses: [],
  academicProfiles: [],
}

function getMajorCount(college: any) {
  if (college.majors && college.majors.length > 0) {
    return college.majors.length
  }
  return college.departments.reduce((sum: number, d: any) => sum + d.majors.length, 0)
}

function getSourceLabel(kind: SourceStatusKind, language: 'zh' | 'en') {
  const item = SOURCE_FILTERS.find((filter) => filter.kind === kind)
  return item ? item[language] : kind
}

export default function Home() {
  const { language, pick } = useLanguage()
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
    const [coursesModule, pgCoursesModule] = await Promise.all([
      import('../data/courses.json'),
      import('../data/pg-courses.json'),
    ])
    const loadedCourses = coursesModule.default as unknown as Record<string, Course>
    const loadedPgCourses = pgCoursesModule.default as unknown as Record<string, Course>
    const mergedCourses = { ...loadedCourses, ...loadedPgCourses }
    setCourseDetails(mergedCourses)
    setSelectedCourse(mergedCourses[code] ?? null)
  }

  const totalMajors = (majorIndex.colleges as any[]).reduce((sum, c) => sum + getMajorCount(c), 0)

  return (
    <div>
      <div className="spotlight-rail">
        <CampusSpotlightCarousel />
      </div>

      <div className="planner-command-center mb-8">
        <div className="section-eyebrow mb-3 justify-center">
          <Database className="h-4 w-4" />
          {pick('学业规划情报中心', 'Academic planning intelligence')}
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-cityu-dark mb-3">
          CityU Study Planner
        </h1>
        <p className="text-gray-600 text-base sm:text-lg mb-2">
          {pick(
            '浏览香港城市大学本科专业的学习计划、课程要求与课程评分细则',
            'Explore CityUHK study plans, programme requirements, and course assessment details',
          )}
        </p>
        <p className="text-gray-500 text-sm">
          {pick(
            `覆盖 ${majorIndex.colleges.length} 个学院 / 学校 · ${totalMajors} 个本科项目`,
            `${majorIndex.colleges.length} colleges and schools · ${totalMajors} undergraduate programmes`,
          )}
        </p>
        <div className="insight-strip mt-5">
          <div className="metric-card">
            <div className="metric-value">{majorIndex.colleges.length}</div>
            <div className="metric-label">{pick('学院 / 学校', 'Colleges')}</div>
          </div>
          <div className="metric-card">
            <div className="metric-value">{totalMajors}</div>
            <div className="metric-label">{pick('本科专业', 'UG Majors')}</div>
          </div>
          <div className="metric-card">
            <div className="metric-value">PG</div>
            <div className="metric-label">{pick('项目目录', 'Directory')}</div>
          </div>
        </div>
      </div>

      <div className="control-surface search-command max-w-4xl mx-auto mb-8 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder={pick('搜索学院、专业、课程或教授...', 'Search colleges, programmes, courses, or academics...')}
            aria-label={pick('全站搜索', 'Search the site')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 pl-10 shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-cityu-accent"
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
                {pick(item.zh, item.en)}
              </button>
            ))}
          </div>
        )}
      </div>

      {hasSearch ? (
        <div className="space-y-6">
          <section className="surface-panel p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="font-bold text-gray-800 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-cityu-accent" />
                {pick('专业结果', 'Undergraduate Programmes')}
              </h2>
              <span className="text-xs text-gray-500">{pick(`${searchResults.majors.length} 个匹配`, `${searchResults.majors.length} matches`)}</span>
            </div>
            {isSearchLoading ? (
              <div className="text-sm text-gray-500 py-3">{pick('正在加载搜索索引...', 'Loading search index...')}</div>
            ) : searchResults.majors.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {searchResults.majors.map(item => (
                  <Link
                    key={item.code}
                    to={`/major/${item.code}`}
                    className="interactive-card block p-3"
                  >
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="px-2 py-0.5 bg-cityu-accent/10 text-cityu-accent text-xs font-bold rounded">
                        {item.code}
                      </span>
                      <span className={`px-2 py-0.5 border text-xs rounded ${SOURCE_BADGE_CLASSES[item.sourceKind]}`}>
                        {getSourceLabel(item.sourceKind, language)}
                      </span>
                      <span className="text-xs text-gray-500 truncate">{item.department || item.college}</span>
                    </div>
                    <div className="font-semibold text-gray-800 text-sm">{item.title}</div>
                    <div className="text-xs text-gray-500 mt-1">{item.college}</div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500 py-3">{pick('没有找到匹配专业', 'No matching undergraduate programmes')}</div>
            )}
          </section>

          <section className="surface-panel p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="font-bold text-gray-800 flex items-center gap-2">
                <Microscope className="w-5 h-5 text-cityu-accent" />
                {pick('科研参考', 'Research Reference')}
              </h2>
              <span className="text-xs text-gray-500">{pick(`${searchResults.academicProfiles.length} 个匹配`, `${searchResults.academicProfiles.length} matches`)}</span>
            </div>
            {isSearchLoading ? (
              <div className="text-sm text-gray-500 py-3">{pick('正在加载科研资料...', 'Loading academic profiles...')}</div>
            ) : searchResults.academicProfiles.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {searchResults.academicProfiles.map(item => (
                  <Link
                    key={item.id}
                    to={`/academic/${item.id}`}
                    className="interactive-card block p-3"
                  >
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="px-2 py-0.5 bg-cityu-accent/10 text-cityu-accent text-xs font-bold rounded">
                        {item.name}
                      </span>
                      {item.nameCN ? <span className="text-xs text-gray-500">{item.nameCN}</span> : null}
                      {item.ugWelcome ? (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded">UG</span>
                      ) : null}
                    </div>
                    <div className="font-semibold text-gray-800 text-sm line-clamp-2">{item.title || item.department}</div>
                    <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                      <span className="inline-flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {item.studentCount}
                      </span>
                      <span>{item.publicationCount} {pick('篇论文', 'publications')}</span>
                      <span className="truncate">{item.department}</span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500 py-3">{pick('没有找到匹配的科研资料', 'No matching academic profiles')}</div>
            )}
          </section>

          <section className="surface-panel p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="font-bold text-gray-800 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-cityu-accent" />
                {pick('硕博项目', 'Postgraduate Programmes')}
              </h2>
              <span className="text-xs text-gray-500">{pick(`${searchResults.postgraduateProgrammes.length} 个匹配`, `${searchResults.postgraduateProgrammes.length} matches`)}</span>
            </div>
            {isSearchLoading ? (
              <div className="text-sm text-gray-500 py-3">{pick('正在加载硕博项目索引...', 'Loading postgraduate programme index...')}</div>
            ) : searchResults.postgraduateProgrammes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {searchResults.postgraduateProgrammes.map(item => (
                  <Link
                    key={item.code}
                    to={`/postgraduate/${item.code}`}
                    className="interactive-card block p-3"
                  >
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="px-2 py-0.5 bg-cityu-accent/10 text-cityu-accent text-xs font-bold rounded">
                        {item.code}
                      </span>
                      <span className="px-2 py-0.5 border text-xs rounded bg-amber-50 text-amber-800 border-amber-100">
                        {item.sourceKind}
                      </span>
                      <span className="text-xs text-gray-500 truncate">{item.department || item.college}</span>
                    </div>
                    <div className="font-semibold text-gray-800 text-sm">{item.title}</div>
                    <div className="text-xs text-gray-500 mt-1">{item.award}</div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500 py-3">{pick('没有找到匹配硕博项目', 'No matching postgraduate programmes')}</div>
            )}
          </section>

          <section className="surface-panel p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="font-bold text-gray-800 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-cityu-blue" />
                {pick('课程结果', 'Undergraduate Courses')}
              </h2>
              <span className="text-xs text-gray-500">{pick(`${searchResults.courses.length} 门匹配`, `${searchResults.courses.length} matches`)}</span>
            </div>
            {isSearchLoading ? (
              <div className="text-sm text-gray-500 py-3">{pick('正在加载课程索引...', 'Loading course index...')}</div>
            ) : searchResults.courses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {searchResults.courses.map(item => (
                  <button
                    key={item.code}
                    onClick={() => openCourse(item.code)}
                    className="interactive-card p-3 text-left hover:text-cityu-blue"
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
                        ? pick(`出现在 ${item.relatedMajorCount} 个专业路径中`, `Appears in ${item.relatedMajorCount} programme pathways`)
                        : pick('暂未关联到专业学习计划', 'Not yet linked to a programme plan')}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500 py-3">{pick('没有找到匹配课程', 'No matching undergraduate courses')}</div>
            )}
          </section>

          <section className="surface-panel p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="font-bold text-gray-800 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-cityu-blue" />
                {pick('PG 课程', 'Postgraduate Courses')}
              </h2>
              <span className="text-xs text-gray-500">{pick(`${searchResults.pgCourses.length} 门匹配`, `${searchResults.pgCourses.length} matches`)}</span>
            </div>
            {isSearchLoading ? (
              <div className="text-sm text-gray-500 py-3">{pick('正在加载 PG 课程索引...', 'Loading postgraduate course index...')}</div>
            ) : searchResults.pgCourses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {searchResults.pgCourses.map(item => (
                  <button
                    key={item.code}
                    onClick={() => openCourse(item.code)}
                    className="interactive-card p-3 text-left hover:text-cityu-blue"
                  >
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="px-2 py-0.5 bg-blue-50 text-cityu-blue text-xs font-bold rounded">
                        {item.code}
                      </span>
                      <span className="text-xs text-gray-500">{item.credits} CU</span>
                      {item.detailStatus !== 'parsed' && (
                        <span className="text-xs text-amber-700">{pick('官方课程详情未确认', 'Official details not confirmed')}</span>
                      )}
                    </div>
                    <div className="font-semibold text-gray-800 text-sm">{item.title}</div>
                    <div className="text-xs text-gray-500 mt-1">{item.department}</div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500 py-3">{pick('没有找到匹配 PG 课程', 'No matching postgraduate courses')}</div>
            )}
          </section>
        </div>
      ) : (
        <>
          <div className="quick-action-grid action-rail mb-6">
            <div className="quick-action-card">
              <div>
                <div className="font-bold text-gray-800 flex items-center gap-2">
                  <Database className="w-4 h-4 text-cityu-accent" />
                  {pick('数据来源覆盖率', 'Source Coverage')}
                </div>
                <div className="text-sm text-gray-500">{pick('查看哪些专业来自官方 study plan，哪些需要按毕业要求自行核对。', 'See which programmes have official study plans and which require a graduation-requirement review.')}</div>
              </div>
              <Link
                to="/coverage"
                className="premium-action"
              >
                {pick('查看来源', 'View Sources')}
                <ShieldCheck className="w-4 h-4" />
              </Link>
            </div>
            <div className="quick-action-card">
              <div>
                <div className="font-bold text-gray-800">{pick('GE 选课助手', 'GE Explorer')}</div>
                <div className="text-sm text-gray-500">{pick('按课程名、代码和考核方式筛选可自由组合的 GE 课程。', 'Filter flexible GE options by title, code, offering term, and assessment.')}</div>
              </div>
              <Link
                to="/ge"
                className="premium-action"
              >
                {pick('打开 GE 工具', 'Open GE Explorer')}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="quick-action-card">
              <div>
                <div className="font-bold text-gray-800 flex items-center gap-2">
                  <Microscope className="w-4 h-4 text-cityu-accent" />
                  {pick('科研参考', 'Research Reference')}
                </div>
                <div className="text-sm text-gray-500">{pick('按教授、研究方向、学生课题和代表论文检索 CityUHK 科研资料。', 'Search CityUHK academics by faculty member, research area, student topics, and selected publications.')}</div>
              </div>
              <Link
                to="/academic"
                className="premium-action"
              >
                {pick('打开科研', 'Open Research')}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="quick-action-card">
              <div>
                <div className="font-bold text-gray-800 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-cityu-accent" />
                  {pick('硕博页面', 'Postgraduate Directory')}
                </div>
                <div className="text-sm text-gray-500">{pick('集中查看 CityUHK 硕士、研究型硕博和专业博士官方入口。', 'Browse CityUHK taught master, research degree, and professional doctorate programmes.')}</div>
              </div>
              <Link
                to="/postgraduate"
                className="premium-action"
              >
                {pick('打开硕博', 'Open Postgraduate')}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="quick-action-card">
              <div>
                <div className="font-bold text-gray-800 flex items-center gap-2">
                  <GitCompareArrows className="w-4 h-4 text-cityu-accent" />
                  {pick('专业对比', 'Compare Majors')}
                </div>
                <div className="text-sm text-gray-500">{pick('并排查看 2-3 个专业的学分结构、来源可信度和重叠课程。', 'Compare the credit structure, source confidence, and overlapping courses of two or three majors.')}</div>
              </div>
              <Link
                to="/compare"
                className="premium-action"
              >
                {pick('打开对比', 'Open Comparison')}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {(majorIndex.colleges as any[]).map(college => {
              const majorCount = getMajorCount(college)
              const deptCount = college.departments?.length || 0
              const isSchool = college.type === 'school'
              const themeStyle = getCollegeThemeStyle(college.id) as CSSProperties

              return (
                <Link
                  key={college.id}
                  to={`/college/${college.id}`}
                  className="college-card group"
                  style={themeStyle}
                >
                  <div className="college-card-header">
                    <span className="college-icon-shell">
                      <Building2 className="w-5 h-5" />
                    </span>
                    <span className="college-count-pill">
                      {pick(`${majorCount} 个专业`, `${majorCount} programmes`)}
                    </span>
                  </div>
                  <h2 className="college-card-title">{college.name}</h2>
                  <p className="college-card-meta">
                    {isSchool ? pick('独立学院 / 学校', 'Independent school') : pick(`${deptCount} 个学系`, `${deptCount} departments`)}
                  </p>
                  <div className="college-card-link">
                    {pick('查看详情', 'View Details')} <ArrowRight className="w-4 h-4" />
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
