import { useParams, Link } from 'react-router-dom'
import { useState, useMemo } from 'react'
import { ArrowLeft, BookOpen, GraduationCap, Clock, FileText, LayoutGrid, List, AlertCircle, Info, Pencil, Eye } from 'lucide-react'
import allMajors from '../data/all-majors.json'
import coursesData from '../data/courses.json'
import type { Course } from '../types'
import CourseDetailModal from '../components/CourseDetailModal'
import CourseBadge from '../components/CourseBadge'
import StudyPlanEditor from '../components/StudyPlanEditor'
import { generateStudyPlan, getAllMajorCourses, getCategoryColor, getCategoryLabel, getCreditStatus } from '../utils/studyPlan'

type Tab = 'plan' | 'requirements' | 'courses'

export default function MajorPage() {
  const { majorCode } = useParams<{ majorCode: string }>()
  const [tab, setTab] = useState<Tab>('plan')
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [search, setSearch] = useState('')
  const [editMode, setEditMode] = useState(false)

  const major = (allMajors as any[]).find((m: any) => m.code === majorCode)
  const courses: Record<string, Course> = coursesData as any

  // Determine if this major has streams
  const hasStreams = major?.streams && major.streams.length > 0
  const hasStreamPlans = major?.streams && major.streams.some((s: any) => s.studyPlan)
  const [selectedStreamIdx, setSelectedStreamIdx] = useState<number>(
    hasStreams ? 0 : -1
  )

  if (!major) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-gray-600">专业未找到</h2>
        <Link to="/" className="text-cityu-accent mt-4 inline-block hover:underline">
          返回首页
        </Link>
      </div>
    )
  }

  const activeStream = selectedStreamIdx >= 0 ? major.streams?.[selectedStreamIdx] : null

  const studyPlan = useMemo(() => generateStudyPlan(major, courses, selectedStreamIdx >= 0 ? selectedStreamIdx : undefined), [major, courses, selectedStreamIdx])

  const allReqCourses = useMemo(() => getAllMajorCourses(major, selectedStreamIdx >= 0 ? selectedStreamIdx : undefined), [major, selectedStreamIdx])

  const filteredCourses = useMemo(() => {
    if (!search.trim()) return allReqCourses
    const s = search.toLowerCase()
    return allReqCourses.filter(c =>
      c.code.toLowerCase().includes(s) || c.title.toLowerCase().includes(s)
    )
  }, [allReqCourses, search])

  const getCourseDetail = (code: string): Course | null => {
    // Try exact match
    if (courses[code]) return courses[code]
    // Try first part before space or slash
    const baseCode = code.split(/[\s\/]/)[0]
    if (courses[baseCode]) return courses[baseCode]
    // For special placeholders
    if (code === 'GE-DR' || code === 'ELECTIVE') return null
    return {
      code, title: code, credits: 0, department: '', prerequisites: [],
      semester: '', assessment: {}, pdfUrl: '', courseUrl: ''
    }
  }

  // Helper to get credits from either flat or nested requirement structure
  const getReqValue = (reqs: any, keys: string[]) => {
    for (const key of keys) {
      if (typeof reqs[key] === 'number') return { credits: reqs[key], courses: [] }
      if (reqs[key] && typeof reqs[key] === 'object') return reqs[key]
    }
    return { credits: 0, courses: [] }
  }

  // Use stream-specific requirements if available
  const activeReqs = activeStream?.requirements ?? major.requirements ?? {}
  const geReq = getReqValue(activeReqs, ['gatewayEducation'])
  const collegeReq = getReqValue(activeReqs, ['college', 'collegeRequirement'])
  const coreReq = getReqValue(activeReqs, ['majorCore'])
  const electiveReq = getReqValue(activeReqs, ['majorElectives', 'majorElective'])

  const totalCredits = major.totalCredits ||
    ((geReq.credits || 0) + (collegeReq.credits || 0) + (coreReq.credits || 0) + (electiveReq.credits || 0))

  // Build requirement sections dynamically
  const reqSections = useMemo(() => {
    const sections: { key: string; label: string; icon: any; req: any }[] = []
    const reqList = [
      { key: 'gatewayEducation', label: '通识教育', icon: GraduationCap, req: geReq },
      { key: 'college', label: '学院/学系要求', icon: BookOpen, req: collegeReq },
      { key: 'majorCore', label: '专业核心', icon: FileText, req: coreReq },
      { key: 'majorElectives', label: '专业选修', icon: LayoutGrid, req: electiveReq },
    ]
    for (const { key, label, icon, req } of reqList) {
      if (req && ((req.courses?.length > 0) || (req.credits > 0))) {
        sections.push({ key, label, icon, req })
      }
    }
    return sections
  }, [geReq, collegeReq, coreReq, electiveReq])

  return (
    <div>
      <Link to={`/college/${major.college?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`}
        className="inline-flex items-center gap-1 text-gray-500 hover:text-cityu-accent mb-3 sm:mb-4 transition-colors text-sm sm:text-base">
        <ArrowLeft className="w-4 h-4" />
        返回学院
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-3 sm:gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="px-2 py-0.5 bg-cityu-accent/10 text-cityu-accent text-sm font-bold rounded">
                {major.code}
              </span>
              <span className="text-sm text-gray-500">{major.department}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-cityu-dark mb-1">{major.title}</h1>
            <p className="text-gray-500 text-sm sm:text-base">{major.degree}</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="text-center px-3 sm:px-4 py-2 bg-gray-50 rounded-lg">
              <div className="text-xl sm:text-2xl font-bold text-cityu-dark">{totalCredits}</div>
              <div className="text-xs text-gray-500">总学分</div>
            </div>
            <div className="text-center px-3 sm:px-4 py-2 bg-gray-50 rounded-lg">
              <div className="text-xl sm:text-2xl font-bold text-cityu-dark">{major.allCourses.length}</div>
              <div className="text-xs text-gray-500">课程数</div>
            </div>
          </div>
        </div>

        {/* Stream Selector */}
        {hasStreams && major.streams && major.streams.length > 0 && (
          <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-100">
            <h3 className="text-sm font-medium text-gray-700 mb-2">学术方向 / Streams</h3>
            <div className="flex flex-wrap gap-2">
              {major.streams.map((s: any, idx: number) => (
                <button
                  key={s.code}
                  onClick={() => {
                    setSelectedStreamIdx(idx)
                    setEditMode(false)
                  }}
                  className={`px-3 py-1.5 border rounded-lg text-sm transition-colors ${
                    selectedStreamIdx === idx
                      ? 'bg-cityu-accent text-white border-cityu-accent'
                      : 'bg-purple-50 border-purple-200 text-purple-800 hover:bg-purple-100'
                  }`}
                >
                  <span className="font-semibold">{s.code}</span>
                  <span className="ml-1 opacity-90">{s.name}</span>
                </button>
              ))}
            </div>
            {activeStream?.description && (
              <p className="mt-2 text-xs text-gray-500">{activeStream.description}</p>
            )}
          </div>
        )}

        {/* Notes */}
        {major.notes && major.notes.length > 0 && (
          <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-100">
            <h3 className="text-sm font-medium text-gray-700 mb-2">重要备注</h3>
            <ul className="space-y-1">
              {major.notes.map((note: string, i: number) => (
                <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                  <Info className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  {note}
                </li>
              ))}
            </ul>
          </div>
        )}
        {selectedStreamIdx >= 0 && major.streams?.[selectedStreamIdx]?.notes && (
          <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-100">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              {major.streams[selectedStreamIdx].name} 备注
            </h3>
            <ul className="space-y-1">
              {major.streams[selectedStreamIdx].notes!.map((note: string, i: number) => (
                <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                  <Info className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                  {note}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex flex-col sm:flex-row gap-2 mb-6 border-b border-gray-200 items-start sm:items-center justify-between">
        <div className="flex gap-2 overflow-x-auto w-full sm:w-auto pb-1">
          {[
            { key: 'plan' as Tab, label: '学习计划', icon: LayoutGrid },
            { key: 'requirements' as Tab, label: '课程要求', icon: BookOpen },
            { key: 'courses' as Tab, label: '课程列表', icon: List },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-3 py-2.5 sm:py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                tab === key
                  ? 'border-cityu-accent text-cityu-accent'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
        {tab === 'plan' && (
          <button
            onClick={() => setEditMode(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-2.5 sm:py-1.5 text-sm rounded-lg transition-colors shrink-0 ${
              editMode
                ? 'bg-cityu-accent text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {editMode ? <Eye className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
            {editMode ? '退出编辑' : '编辑模式'}
          </button>
        )}
      </div>

      {/* Tab Content */}
      {tab === 'plan' && (
        <div className="space-y-6">
          {editMode ? (
            <StudyPlanEditor
              initialPlan={studyPlan.map(s => ({
                year: s.year,
                sem: s.sem,
                courses: s.courses.map(c => ({
                  code: c.code,
                  title: c.title,
                  credits: c.credits,
                  category: c.category
                })),
                totalCredits: s.totalCredits
              }))}
              major={major}
              streamIndex={selectedStreamIdx >= 0 ? selectedStreamIdx : undefined}
              courses={courses}
              onCourseClick={(code) => {
                const detail = getCourseDetail(code)
                if (detail) setSelectedCourse(detail)
              }}
            />
          ) : (
            <>
              {(major.studyPlan || activeStream?.studyPlan) && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 flex items-start gap-2 sm:gap-3">
                  <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs sm:text-sm text-blue-800">
                    <p className="font-medium">
                      官方推荐学习计划
                      {activeStream ? ` — ${activeStream.name}` : ''}
                    </p>
                    <p>此学习计划来自 CityU 官方 Recommended Study Plan，适用于 2025 cohort normative 4-year degree。</p>
                    <p className="mt-1 text-[10px] sm:text-xs opacity-80">每学期正常学分上限为 18 CU，申请 ARRO 批准后最高可达 21 CU。</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-4 flex-wrap">
                {['ge', 'college', 'majorCore', 'majorElective'].map(cat => (
                  <div key={cat} className="flex items-center gap-1.5 text-sm">
                    <span className={`w-3 h-3 rounded border ${getCategoryColor(cat)}`} />
                    {getCategoryLabel(cat)}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                {studyPlan.map(sem => {
                  const creditStatus = getCreditStatus(sem.totalCredits)
                  return (
                    <div key={`${sem.year}-${sem.sem}`} className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4">
                      <div className="flex items-center justify-between mb-2 sm:mb-3 pb-2 border-b border-gray-100">
                        <h3 className="font-bold text-gray-800 text-sm sm:text-base">Year {sem.year} Sem {sem.sem}</h3>
                        <div className="flex items-center gap-2">
                          {creditStatus.status !== 'ok' && (
                            <AlertCircle className={`w-4 h-4 ${creditStatus.status === 'danger' ? 'text-red-500' : 'text-amber-500'}`} />
                          )}
                          <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                            creditStatus.status === 'ok' ? 'text-gray-500' :
                            creditStatus.status === 'warning' ? 'text-amber-700 bg-amber-50' :
                            'text-red-700 bg-red-50'
                          }`}>
                            {sem.totalCredits} 学分
                          </span>
                        </div>
                      </div>
                      {creditStatus.status !== 'ok' && (
                        <div className={`text-xs mb-2 px-2 py-1 rounded ${
                          creditStatus.status === 'warning' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                        }`}>
                          {creditStatus.message}
                        </div>
                      )}
                      <div className="space-y-2">
                        {sem.courses.map(c => (
                          <CourseBadge
                            key={c.code}
                            code={c.code}
                            title={c.title}
                            credits={c.credits}
                            category={c.category}
                            onClick={() => {
                              const detail = getCourseDetail(c.code)
                              if (detail) setSelectedCourse(detail)
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>

              {studyPlan.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  暂无学习计划数据
                </div>
              )}
            </>
          )}
        </div>
      )}

      {tab === 'requirements' && (
        <div className="space-y-6">
          {reqSections.map(({ key, label, icon: Icon, req }) => (
            <div key={key} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-4">
                <Icon className="w-5 h-5 text-cityu-accent" />
                <h3 className="text-base sm:text-lg font-bold text-gray-800">{label}</h3>
                <span className="text-sm text-gray-500 ml-auto">{req.credits} 学分</span>
              </div>
              {req.courses?.length > 0 ? (
                <div className="overflow-x-auto -mx-2 px-2">
                  <table className="w-full text-xs sm:text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-2 sm:px-3 py-2 font-medium text-gray-600 whitespace-nowrap">代码</th>
                        <th className="text-left px-2 sm:px-3 py-2 font-medium text-gray-600">课程名称</th>
                        <th className="text-left px-2 sm:px-3 py-2 font-medium text-gray-600 whitespace-nowrap">学分</th>
                        <th className="text-left px-2 sm:px-3 py-2 font-medium text-gray-600">备注</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {req.courses.map((c: any) => (
                        <tr key={c.code} className="hover:bg-gray-50 active:bg-gray-100 cursor-pointer"
                          onClick={() => {
                            const detail = getCourseDetail(c.code)
                            if (detail) setSelectedCourse(detail)
                          }}>
                          <td className="px-2 sm:px-3 py-2 font-mono text-cityu-accent font-medium whitespace-nowrap">{c.code}</td>
                          <td className="px-2 sm:px-3 py-2 max-w-[180px] truncate">{c.title}</td>
                          <td className="px-2 sm:px-3 py-2 whitespace-nowrap">{c.credits}</td>
                          <td className="px-2 sm:px-3 py-2 text-gray-500 text-[10px] sm:text-xs min-w-[80px]">{c.remarks || ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">暂无课程列表</p>
              )}
              {req.choose && (
                <div className="mt-3 text-xs sm:text-sm text-gray-600 bg-gray-50 p-2.5 sm:p-3 rounded-lg">
                  需选修 {req.choose} 门课程
                </div>
              )}
              {req.chooseCredits && (
                <div className="mt-3 text-xs sm:text-sm text-gray-600 bg-gray-50 p-2.5 sm:p-3 rounded-lg">
                  需选修 {req.chooseCredits} 学分
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'courses' && (
        <div>
          <div className="mb-4">
            <input
              type="text"
              placeholder="搜索课程代码或名称..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full sm:max-w-md px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cityu-accent"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredCourses.map(c => {
              const course = courses[c.code]
              const hasPrereq = course?.prerequisites?.length > 0
              return (
                <button
                  key={c.code}
                  onClick={() => {
                    const detail = getCourseDetail(c.code)
                    if (detail) setSelectedCourse(detail)
                  }}
                  className={`text-left p-4 rounded-xl border transition-all hover:shadow-md active:scale-[0.98] ${getCategoryColor(c.category)}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-sm">{c.code}</div>
                      <div className="text-sm mt-0.5 truncate">{c.title}</div>
                    </div>
                    <span className="text-xs font-medium flex-shrink-0">{c.credits} 学分</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-xs opacity-70">
                    {course?.semester && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {course.semester}
                      </span>
                    )}
                    {hasPrereq && (
                      <span className="flex items-center gap-1 text-orange-600">
                        <AlertCircle className="w-3 h-3" />
                        有前置课程
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {filteredCourses.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              未找到匹配的课程
            </div>
          )}
        </div>
      )}

      <CourseDetailModal
        course={selectedCourse}
        onClose={() => setSelectedCourse(null)}
      />
    </div>
  )
}
