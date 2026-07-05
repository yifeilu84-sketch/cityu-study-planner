import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ExternalLink,
  FileText,
  Filter,
  GraduationCap,
  Microscope,
  Search,
  ShieldCheck,
} from 'lucide-react'
import postgraduateProgrammesData from '../data/postgraduate-programmes.json'
import type { PostgraduateProgramme } from '../types'

type ProgrammeType = PostgraduateProgramme['type'] | 'all'
type SourceKind = PostgraduateProgramme['sourceStatus']['kind'] | 'all'
type CourseListKind = NonNullable<PostgraduateProgramme['courseListStatus']>['kind']

const postgraduateProgrammes = postgraduateProgrammesData as PostgraduateProgramme[]

const TYPE_LABELS: Record<ProgrammeType, string> = {
  all: '全部项目',
  'taught-master': '授课型硕士',
  'research-degree': 'MPhil / PhD',
  'professional-doctorate': '专业博士',
}

const SOURCE_LABELS: Record<SourceKind, string> = {
  all: '全部来源',
  'official-sample': '官方 sample schedule',
  'requirements-diy': '毕业要求 + DIY',
  'research-diy': '研究型 DIY',
}

const TYPE_CLASSES: Record<PostgraduateProgramme['type'], string> = {
  'taught-master': 'bg-blue-50 text-blue-700 border-blue-100',
  'research-degree': 'bg-emerald-50 text-emerald-700 border-emerald-100',
  'professional-doctorate': 'bg-violet-50 text-violet-700 border-violet-100',
}

const SOURCE_CLASSES: Record<PostgraduateProgramme['sourceStatus']['kind'], string> = {
  'official-sample': 'bg-cyan-50 text-cyan-700 border-cyan-100',
  'requirements-diy': 'bg-amber-50 text-amber-800 border-amber-100',
  'research-diy': 'bg-slate-50 text-slate-700 border-slate-200',
}

const COURSE_LIST_LABELS: Record<CourseListKind, string> = {
  'official-course-list': '课程池已解析',
  'course-list-unconfirmed': '课程池待确认',
  'research-not-course-based': '研究型要求',
}

const COURSE_LIST_CLASSES: Record<CourseListKind, string> = {
  'official-course-list': 'bg-emerald-50 text-emerald-700 border-emerald-100',
  'course-list-unconfirmed': 'bg-rose-50 text-rose-700 border-rose-100',
  'research-not-course-based': 'bg-slate-50 text-slate-700 border-slate-200',
}

const OFFICIAL_LINKS = [
  {
    title: "Master's Programmes",
    url: 'https://www.cityu.edu.hk/pg/taught-postgraduate-programmes/list',
    description: 'CityUHK 2026/27 taught postgraduate programme list.',
  },
  {
    title: 'Research Degree Programmes',
    url: 'https://www.cityu.edu.hk/pg/research-degree-programmes/introduction',
    description: 'Official MPhil and PhD admissions introduction.',
  },
  {
    title: 'Research Areas',
    url: 'https://www.cityu.edu.hk/pg/research-degree-programmes/research-areas',
    description: 'Official research-area directory used for research PG entries.',
  },
  {
    title: 'Professional Doctorate Programmes',
    url: 'https://www.cityu.edu.hk/pg/professional-doctorate-programmes/introduction',
    description: 'Official professional doctorate overview and programme links.',
  },
]

function matchesQuery(programme: PostgraduateProgramme, query: string) {
  if (!query) return true
  const haystack = [
    programme.code,
    programme.title,
    programme.award,
    programme.type,
    programme.college,
    programme.department,
    programme.mode,
    programme.sourceStatus.label,
    programme.courseListStatus?.label,
    ...(programme.researchAreas ?? []),
    ...(programme.allCourses ?? []),
  ].filter(Boolean).join(' ').toLowerCase()
  return haystack.includes(query)
}

export default function PostgraduatePage() {
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<ProgrammeType>('all')
  const [sourceFilter, setSourceFilter] = useState<SourceKind>('all')
  const [collegeFilter, setCollegeFilter] = useState('all')

  const colleges = useMemo(() => {
    return Array.from(new Set(postgraduateProgrammes.map((item) => item.college))).sort()
  }, [])

  const stats = useMemo(() => ({
    total: postgraduateProgrammes.length,
    taught: postgraduateProgrammes.filter((item) => item.type === 'taught-master').length,
    research: postgraduateProgrammes.filter((item) => item.type === 'research-degree').length,
    doctorate: postgraduateProgrammes.filter((item) => item.type === 'professional-doctorate').length,
    officialSample: postgraduateProgrammes.filter((item) => item.sourceStatus.kind === 'official-sample').length,
    diy: postgraduateProgrammes.filter((item) => item.sourceStatus.kind !== 'official-sample').length,
    parsedCourseLists: postgraduateProgrammes.filter((item) => item.courseListStatus?.kind === 'official-course-list').length,
    unconfirmedCourseLists: postgraduateProgrammes.filter((item) => item.courseListStatus?.kind === 'course-list-unconfirmed').length,
  }), [])

  const filteredProgrammes = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return postgraduateProgrammes.filter((programme) => {
      if (typeFilter !== 'all' && programme.type !== typeFilter) return false
      if (sourceFilter !== 'all' && programme.sourceStatus.kind !== sourceFilter) return false
      if (collegeFilter !== 'all' && programme.college !== collegeFilter) return false
      return matchesQuery(programme, normalized)
    })
  }, [collegeFilter, query, sourceFilter, typeFilter])

  return (
    <div className="space-y-5">
      <Link to="/" className="inline-flex items-center gap-1 text-gray-500 hover:text-cityu-accent transition-colors text-sm sm:text-base">
        <ArrowLeft className="w-4 h-4" />
        返回首页
      </Link>

      <section className="bg-white border border-gray-100 rounded-lg shadow-sm p-4 sm:p-6">
        <span className="sr-only">本科 study plan 审查</span>
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-2">
              <GraduationCap className="w-6 h-6 text-cityu-accent" />
              <h1 className="text-xl sm:text-2xl font-bold text-cityu-dark">硕博项目 Study Plan 目录</h1>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              覆盖 CityUHK 香港本部 2026/27 授课型硕士、研究型 MPhil / PhD 和专业博士项目。官方有 sample schedule 的项目按官方样例展示；没有明确学期计划的项目只给空学期表、毕业要求和课程池入口，标注为 DIY。
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm min-w-[260px]">
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
              <div className="text-xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-xs text-gray-500">PG 项目</div>
            </div>
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
              <div className="text-xl font-bold text-blue-800">{stats.taught}</div>
              <div className="text-xs text-blue-700">硕士</div>
            </div>
            <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3">
              <div className="text-xl font-bold text-emerald-800">{stats.research}</div>
              <div className="text-xs text-emerald-700">研究型</div>
            </div>
            <div className="rounded-lg border border-violet-100 bg-violet-50 p-3">
              <div className="text-xl font-bold text-violet-800">{stats.doctorate}</div>
              <div className="text-xs text-violet-700">专业博士</div>
            </div>
            <div className="rounded-lg border border-cyan-100 bg-cyan-50 p-3">
              <div className="text-xl font-bold text-cyan-800">{stats.officialSample}</div>
              <div className="text-xs text-cyan-700">官方样例</div>
            </div>
            <div className="rounded-lg border border-amber-100 bg-amber-50 p-3">
              <div className="text-xl font-bold text-amber-800">{stats.diy}</div>
              <div className="text-xs text-amber-700">DIY 空表</div>
            </div>
            <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3">
              <div className="text-xl font-bold text-emerald-800">{stats.parsedCourseLists}</div>
              <div className="text-xs text-emerald-700">课程池已解析</div>
            </div>
            <div className="rounded-lg border border-rose-100 bg-rose-50 p-3">
              <div className="text-xl font-bold text-rose-800">{stats.unconfirmedCourseLists}</div>
              <div className="text-xs text-rose-700">课程池待确认</div>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_220px_220px_260px] gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索 MSc, PhD, DBA, Computer Science, CS5222..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cityu-accent focus:border-transparent"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as ProgrammeType)}
            className="px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-cityu-accent cursor-pointer"
            aria-label="Programme type"
          >
            {(Object.keys(TYPE_LABELS) as ProgrammeType[]).map((item) => (
              <option key={item} value={item}>{TYPE_LABELS[item]}</option>
            ))}
          </select>
          <select
            value={sourceFilter}
            onChange={(event) => setSourceFilter(event.target.value as SourceKind)}
            className="px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-cityu-accent cursor-pointer"
            aria-label="Source status"
          >
            {(Object.keys(SOURCE_LABELS) as SourceKind[]).map((item) => (
              <option key={item} value={item}>{SOURCE_LABELS[item]}</option>
            ))}
          </select>
          <select
            value={collegeFilter}
            onChange={(event) => setCollegeFilter(event.target.value)}
            className="px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-cityu-accent cursor-pointer"
            aria-label="College filter"
          >
            <option value="all">全部学院 / 学校</option>
            {colleges.map((college) => (
              <option key={college} value={college}>{college}</option>
            ))}
          </select>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.8fr)_minmax(300px,0.8fr)] gap-5">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-gray-800 flex items-center gap-2">
                <Filter className="w-5 h-5 text-cityu-accent" />
                项目列表
              </h2>
              <p className="text-sm text-gray-500">当前显示 {filteredProgrammes.length} 个项目</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setQuery('')
                setTypeFilter('all')
                setSourceFilter('all')
                setCollegeFilter('all')
              }}
              className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 hover:border-cityu-accent hover:text-cityu-accent transition-colors cursor-pointer"
            >
              重置筛选
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredProgrammes.map((programme) => (
              <Link
                key={programme.code}
                to={`/postgraduate/${programme.code}`}
                className="group rounded-lg border border-gray-100 bg-white p-4 shadow-sm hover:border-cityu-accent hover:bg-cityu-accent/5 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 mb-2">
                      <span className="rounded bg-cityu-accent/10 px-2 py-0.5 text-xs font-bold text-cityu-accent">
                        {programme.code}
                      </span>
                      <span className={`rounded border px-2 py-0.5 text-xs font-semibold ${TYPE_CLASSES[programme.type]}`}>
                        {TYPE_LABELS[programme.type]}
                      </span>
                      <span className={`rounded border px-2 py-0.5 text-xs font-semibold ${SOURCE_CLASSES[programme.sourceStatus.kind]}`}>
                        {SOURCE_LABELS[programme.sourceStatus.kind]}
                      </span>
                      {programme.courseListStatus ? (
                        <span className={`rounded border px-2 py-0.5 text-xs font-semibold ${COURSE_LIST_CLASSES[programme.courseListStatus.kind]}`}>
                          {COURSE_LIST_LABELS[programme.courseListStatus.kind]}
                        </span>
                      ) : null}
                    </div>
                    <h3 className="font-semibold text-gray-900 leading-snug">{programme.title}</h3>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-cityu-accent flex-shrink-0 mt-1" />
                </div>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-500">
                  <div>
                    <span className="font-medium text-gray-700">Award: </span>
                    {programme.award}
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Mode: </span>
                    {programme.mode}
                  </div>
                  <div className="sm:col-span-2">
                    <span className="font-medium text-gray-700">Unit: </span>
                    {programme.department}
                  </div>
                </div>
                <p className="mt-3 text-xs text-gray-500 leading-relaxed line-clamp-2">
                  {programme.sourceStatus.description}
                </p>
              </Link>
            ))}
          </div>

          {filteredProgrammes.length === 0 && (
            <div className="text-center py-12 text-gray-500 border border-dashed border-gray-200 rounded-lg bg-white">
              没有找到匹配的硕博项目
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <section className="bg-white border border-amber-100 rounded-lg shadow-sm p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <h2 className="font-bold text-gray-800">来源标注</h2>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              “官方 sample schedule”只代表官网明确给出样例排课；其余项目不会预填课程到学期表，会显示空 semester 表格、毕业要求和课程池，让学生自己 DIY。
            </p>
          </section>

          <section className="bg-white border border-gray-100 rounded-lg shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-5 h-5 text-cityu-accent" />
              <h2 className="font-bold text-gray-800">官方入口</h2>
            </div>
            <div className="space-y-2">
              {OFFICIAL_LINKS.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-lg border border-gray-100 bg-gray-50 p-3 hover:border-cityu-accent hover:bg-cityu-accent/5 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-semibold text-sm text-gray-800">{link.title}</div>
                    <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  </div>
                  <p className="mt-1 text-xs text-gray-500 leading-relaxed">{link.description}</p>
                </a>
              ))}
            </div>
          </section>

          <section className="bg-white border border-gray-100 rounded-lg shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <Microscope className="w-5 h-5 text-cityu-accent" />
              <h2 className="font-bold text-gray-800">覆盖说明</h2>
            </div>
            <ul className="space-y-2 text-sm text-gray-600 leading-relaxed">
              <li className="flex gap-2">
                <BookOpen className="w-4 h-4 text-cityu-accent flex-shrink-0 mt-0.5" />
                <span>硕博数据独立于本科 all-majors / courses，不混入本科毕业审查。</span>
              </li>
              <li className="flex gap-2">
                <FileText className="w-4 h-4 text-cityu-accent flex-shrink-0 mt-0.5" />
                <span>PG 课程详情优先显示 CityUHK PG Course Catalogue 链接；未解析 assessment 的课程会在详情页标注未确认。</span>
              </li>
            </ul>
          </section>
        </aside>
      </section>
    </div>
  )
}
