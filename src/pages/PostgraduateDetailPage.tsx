import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  FileText,
  GraduationCap,
  Layers,
  Microscope,
  PencilLine,
} from 'lucide-react'
import postgraduateProgrammesData from '../data/postgraduate-programmes.json'
import pgCoursesData from '../data/pg-courses.json'
import academicProfilesJson from '../data/academic-profiles.json'
import CourseDetailModal from '../components/CourseDetailModal'
import PostgraduatePlanEditor from '../components/PostgraduatePlanEditor'
import ResearchReferencePanel from '../components/ResearchReferencePanel'
import { findRelatedAcademicProfiles } from '../utils/academicProfiles.ts'
import type { AcademicProfilesData, Course, MajorCourse, PostgraduateProgramme, StudyPlan } from '../types'

const postgraduateProgrammes = postgraduateProgrammesData as PostgraduateProgramme[]
const pgCourses = pgCoursesData as Record<string, Course>
const academicData = academicProfilesJson as AcademicProfilesData

const TYPE_LABELS: Record<PostgraduateProgramme['type'], string> = {
  'taught-master': '授课型硕士',
  'research-degree': 'MPhil / PhD',
  'professional-doctorate': '专业博士',
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

const COURSE_LIST_CLASSES: Record<NonNullable<PostgraduateProgramme['courseListStatus']>['kind'], string> = {
  'official-course-list': 'bg-emerald-50 text-emerald-700 border-emerald-100',
  'official-title-list': 'bg-teal-50 text-teal-700 border-teal-100',
  'course-list-unconfirmed': 'bg-rose-50 text-rose-700 border-rose-100',
  'research-not-course-based': 'bg-slate-50 text-slate-700 border-slate-200',
}

const COURSE_LIST_PANEL_CLASSES: Record<NonNullable<PostgraduateProgramme['courseListStatus']>['kind'], string> = {
  'official-course-list': 'border-emerald-100 bg-emerald-50 text-emerald-800',
  'official-title-list': 'border-teal-100 bg-teal-50 text-teal-800',
  'course-list-unconfirmed': 'border-rose-100 bg-rose-50 text-rose-800',
  'research-not-course-based': 'border-slate-200 bg-slate-50 text-slate-700',
}

const SEMESTERS = [
  ['semA', 'Semester A'],
  ['semB', 'Semester B'],
  ['summer', 'Summer Term'],
] as const

function getYearNumber(key: string) {
  return Number(key.replace(/^year/, '')) || 0
}

function coursePoolFor(programme: PostgraduateProgramme) {
  const byCode = new Map<string, MajorCourse>()

  const add = (course: MajorCourse | undefined) => {
    if (!course?.code || byCode.has(course.code)) return
    byCode.set(course.code, course)
  }

  for (const section of programme.requirements.sections ?? []) {
    for (const course of section.courses ?? []) add(course)
  }

  for (const code of programme.allCourses ?? []) {
    const detail = pgCourses[code]
    add({ code, title: detail?.title ?? code, credits: detail?.credits ?? 0 })
  }

  return Array.from(byCode.values()).sort((a, b) => a.code.localeCompare(b.code))
}

function planEntries(plan: StudyPlan) {
  return Object.entries(plan)
    .sort(([a], [b]) => getYearNumber(a) - getYearNumber(b))
    .map(([key, year]) => ({ key, label: `Year ${getYearNumber(key)}`, year }))
}

function isSourceOnlyCourse(course: MajorCourse) {
  return Boolean(course.sourceOnly || course.code.startsWith('PGTITLE_'))
}

function displayCourseCode(course: MajorCourse) {
  return isSourceOnlyCourse(course) ? null : course.code
}

export default function PostgraduateDetailPage() {
  const { programmeCode } = useParams()
  const programme = postgraduateProgrammes.find((item) => item.code.toLowerCase() === (programmeCode ?? '').toLowerCase())
  const [selectedVariantCode, setSelectedVariantCode] = useState<string | null>(null)
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [editMode, setEditMode] = useState(false)

  const selectedVariant = useMemo(() => {
    if (!programme) return null
    return programme.studyPlanVariants.find((variant) => variant.code === selectedVariantCode) ?? programme.studyPlanVariants[0] ?? null
  }, [programme, selectedVariantCode])

  const studyPlanVariants = programme?.studyPlanVariants ?? []
  const activePlan = selectedVariant?.studyPlan ?? programme?.studyPlan
  const coursePool = useMemo(() => (programme ? coursePoolFor(programme) : []), [programme])
  const isDiy = programme?.sourceStatus.kind !== 'official-sample'
  const relatedAcademicProfiles = useMemo(() => (
    programme ? findRelatedAcademicProfiles(academicData.profiles, programme, { limit: 5 }) : []
  ), [programme])

  useEffect(() => {
    setEditMode(false)
  }, [programme?.code, selectedVariant?.code])

  if (!programme || !activePlan) {
    return (
      <div className="space-y-4">
        <Link to="/postgraduate" className="inline-flex items-center gap-1 text-gray-500 hover:text-cityu-accent transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" />
          返回硕博目录
        </Link>
        <section className="surface-panel p-6 text-center text-gray-500">
          未找到这个硕博项目。
        </section>
      </div>
    )
  }

  const sourceLinks = [
    { label: 'Official programme page', url: programme.url },
    { label: 'Curriculum overview', url: programme.curriculumUrl },
    { label: 'Sample schedule', url: programme.sampleScheduleUrl },
    { label: 'PG course catalogue', url: programme.courseCatalogueUrl },
    { label: 'Course list source', url: programme.courseListStatus?.sourceUrl },
  ].filter((item): item is { label: string; url: string } => Boolean(item.url))

  return (
    <div className="space-y-5">
      <Link to="/postgraduate" className="inline-flex items-center gap-1 text-gray-500 hover:text-cityu-accent transition-colors text-sm sm:text-base">
        <ArrowLeft className="w-4 h-4" />
        返回硕博目录
      </Link>

      <section className="surface-panel p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="max-w-4xl">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="rounded bg-cityu-accent/10 px-2 py-0.5 text-xs font-bold text-cityu-accent">{programme.code}</span>
              <span className={`rounded border px-2 py-0.5 text-xs font-semibold ${TYPE_CLASSES[programme.type]}`}>
                {TYPE_LABELS[programme.type]}
              </span>
              <span className={`rounded border px-2 py-0.5 text-xs font-semibold ${SOURCE_CLASSES[programme.sourceStatus.kind]}`}>
                {programme.sourceStatus.label}
              </span>
              {programme.courseListStatus ? (
                <span className={`rounded border px-2 py-0.5 text-xs font-semibold ${COURSE_LIST_CLASSES[programme.courseListStatus.kind]}`}>
                  {programme.courseListStatus.label}
                </span>
              ) : null}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-cityu-dark">{programme.title}</h1>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
              <div>
                <div className="text-xs uppercase text-gray-400">Award</div>
                <div className="font-medium text-gray-800">{programme.award}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-gray-400">Mode</div>
                <div className="font-medium text-gray-800">{programme.mode}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-gray-400">College / School</div>
                <div className="font-medium text-gray-800">{programme.college}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-gray-400">Department</div>
                <div className="font-medium text-gray-800">{programme.department}</div>
              </div>
            </div>
          </div>
          <a
            href={programme.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-cityu-dark px-4 py-2.5 text-sm font-semibold text-white hover:bg-cityu-purple transition-colors"
          >
            官方页面
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        <div className={`mt-5 rounded-lg border p-4 ${isDiy ? 'border-amber-100 bg-amber-50' : 'border-cyan-100 bg-cyan-50'}`}>
          <div className="flex items-start gap-3">
            {isDiy ? <AlertTriangle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" /> : <CheckCircle2 className="w-5 h-5 text-cyan-700 flex-shrink-0 mt-0.5" />}
            <div>
              <div className={`font-semibold ${isDiy ? 'text-amber-900' : 'text-cyan-900'}`}>
                {isDiy ? '非官网 study plan，请自行 DIY' : 'Official sample schedule'}
              </div>
              <p className={`mt-1 text-sm leading-relaxed ${isDiy ? 'text-amber-800' : 'text-cyan-800'}`}>
                {programme.sourceStatus.description}
              </p>
            </div>
          </div>
        </div>

        {programme.courseListStatus ? (
          <div className={`mt-3 rounded-lg border p-3 ${COURSE_LIST_PANEL_CLASSES[programme.courseListStatus.kind]}`}>
            <div className="font-semibold text-sm">Course list status: {programme.courseListStatus.label}</div>
            <p className="mt-1 text-sm leading-relaxed">{programme.courseListStatus.description}</p>
          </div>
        ) : null}
      </section>

      {studyPlanVariants.length > 1 && (
        <section className="surface-panel p-4">
          <div className="flex flex-wrap gap-2">
            {studyPlanVariants.map((variant) => (
              <button
                key={variant.code}
                type="button"
                onClick={() => setSelectedVariantCode(variant.code)}
                className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                  selectedVariant?.code === variant.code
                    ? 'bg-cityu-dark text-white border-cityu-dark'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-cityu-accent hover:text-cityu-accent'
                }`}
              >
                {variant.title}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.9fr)] gap-5">
        <div className="space-y-5">
          <section className="surface-panel p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
              <div>
                <h2 className="font-bold text-gray-800 flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-cityu-accent" />
                  Study Plan
                </h2>
                <p className="text-sm text-gray-500">
                  {selectedVariant ? selectedVariant.title : 'Programme plan'} · {isDiy ? 'DIY empty semesters' : 'Official sample'}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {programme.totalCredits ? (
                  <span className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700">
                    {programme.totalCredits} CU
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => setEditMode((current) => !current)}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                    editMode
                      ? 'border-cityu-accent bg-cityu-accent text-white'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-cityu-accent hover:text-cityu-accent'
                  }`}
                >
                  <PencilLine className="h-4 w-4" />
                  {editMode ? 'Editing DIY copy' : 'Edit DIY plan'}
                </button>
              </div>
            </div>

            {editMode ? (
              <PostgraduatePlanEditor
                programme={programme}
                variantCode={selectedVariant?.code}
                initialPlan={activePlan}
                coursePool={coursePool}
                pgCourses={pgCourses}
                onCourseClick={setSelectedCourse}
              />
            ) : (
            <div className="space-y-4">
              {planEntries(activePlan).map(({ key, label, year }) => (
                <div key={key} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                  <div className="bg-gray-50 px-3 py-2 font-semibold text-gray-800">{label}</div>
                  <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-gray-100">
                    {SEMESTERS.map(([semKey, semLabel]) => {
                      const sem = year[semKey]
                      return (
                        <div key={semKey} className="p-3 min-h-[150px]">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <h3 className="font-semibold text-sm text-gray-800">{semLabel}</h3>
                            <span className="text-xs text-gray-500">{sem?.credits ?? 0} CU</span>
                          </div>
                          {sem?.courses?.length ? (
                            <div className="space-y-2">
                              {sem.courses.map((course) => (
                                <button
                                  key={`${semKey}-${course.code}-${course.title}`}
                                  type="button"
                                  onClick={() => setSelectedCourse(pgCourses[course.code] ?? null)}
                                  className="interactive-card w-full p-2 text-left"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-bold text-xs text-cityu-accent">{course.code}</span>
                                    <span className="text-xs text-gray-500">{course.credits} CU</span>
                                  </div>
                                  <div className="mt-1 text-sm font-medium text-gray-800">{course.title}</div>
                                  {'remarks' in course && (course as { remarks?: string }).remarks ? (
                                    <div className="mt-1 text-xs text-gray-500">{(course as { remarks?: string }).remarks}</div>
                                  ) : null}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <div className="flex h-[96px] items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 text-center text-xs text-gray-500">
                              DIY 空白学期
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
            )}
          </section>

          <section className="surface-panel p-4 sm:p-5">
            <h2 className="font-bold text-gray-800 flex items-center gap-2 mb-3">
              <Layers className="w-5 h-5 text-cityu-accent" />
              Requirements
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed mb-4">{programme.requirements.summary}</p>
            <div className="space-y-3">
              {programme.requirements.sections.map((section) => (
                <div key={section.key} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold text-gray-800">{section.title}</h3>
                    {(section.credits || section.chooseCredits) ? (
                      <span className="text-xs font-semibold text-gray-500">
                        {section.chooseCredits ? `choose ${section.chooseCredits} CU` : `${section.credits} CU`}
                      </span>
                    ) : null}
                  </div>
                  {section.note && <p className="mt-2 text-sm text-gray-600 leading-relaxed">{section.note}</p>}
                  {section.courses?.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {section.courses.map((course) => (
                        <button
                          key={`${section.key}-${course.code}`}
                          type="button"
                          onClick={() => setSelectedCourse(pgCourses[course.code] ?? null)}
                          className={`rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 transition-colors ${
                            pgCourses[course.code] ? 'hover:border-cityu-accent hover:text-cityu-accent' : 'cursor-default'
                          }`}
                        >
                          {displayCourseCode(course) ? `${displayCourseCode(course)} · ` : ''}{course.title} · {course.credits} CU
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <ResearchReferencePanel
            profiles={relatedAcademicProfiles}
            heading="Research Reference"
            description="Related CityUHK academic profiles for supervisor, research group, and publication exploration. This is separate from programme coursework requirements."
            compact
          />

          {programme.researchAreas?.length ? (
            <section className="surface-panel p-4">
              <h2 className="font-bold text-gray-800 flex items-center gap-2 mb-3">
                <Microscope className="w-5 h-5 text-cityu-accent" />
                Research Areas
              </h2>
              <div className="flex flex-wrap gap-2">
                {programme.researchAreas.map((area) => (
                  <span key={area} className="rounded-lg border border-emerald-100 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800">
                    {area}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          <section className="surface-panel p-4">
            <h2 className="font-bold text-gray-800 flex items-center gap-2 mb-3">
              <BookOpen className="w-5 h-5 text-cityu-accent" />
              Courses
            </h2>
            {coursePool.length > 0 ? (
              <div className="space-y-2">
                {coursePool.map((course) => {
                  const detail = pgCourses[course.code]
                  const sourceOnly = isSourceOnlyCourse(course)
                  const needsReview = sourceOnly || detail?.detailStatus !== 'parsed'
                  const shownCode = displayCourseCode(course)
                  return (
                    <button
                      key={course.code}
                      type="button"
                      onClick={() => detail ? setSelectedCourse(detail) : null}
                      className={`w-full rounded-lg border p-3 text-left transition-colors ${
                        detail ? 'interactive-card' : 'cursor-default border-slate-200 bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          {shownCode ? <div className="font-bold text-sm text-cityu-accent">{shownCode}</div> : null}
                          <div className="mt-0.5 text-sm font-medium text-gray-800">{course.title}</div>
                        </div>
                        <span className="text-xs text-gray-500 flex-shrink-0">{course.credits} CU</span>
                      </div>
                      {sourceOnly ? (
                        <div className="mt-2 text-xs text-teal-700">Official title list; course code / assessment pending</div>
                      ) : needsReview ? (
                        <div className="mt-2 text-xs text-amber-700">官方课程详情未确认</div>
                      ) : (
                        <div className="mt-2 text-xs text-emerald-700">Assessment parsed from PG catalogue</div>
                      )}
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500 leading-relaxed">
                {programme.courseListStatus?.description ?? '官方课程池尚未结构化到本站。请打开官方 programme page 核对 required / elective / research requirements 后自行填入 DIY 表格。'}
              </div>
            )}
          </section>

          <section className="surface-panel p-4">
            <h2 className="font-bold text-gray-800 flex items-center gap-2 mb-3">
              <FileText className="w-5 h-5 text-cityu-accent" />
              Sources
            </h2>
            <div className="space-y-2">
              {sourceLinks.map((link) => (
                <a
                  key={`${link.label}-${link.url}`}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="interactive-card flex items-start justify-between gap-2 p-3 text-sm"
                >
                  <span className="font-medium text-gray-700">{link.label}</span>
                  <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0" />
                </a>
              ))}
            </div>
            {programme.notes?.length ? (
              <ul className="mt-3 space-y-1 text-xs text-gray-500 leading-relaxed">
                {programme.notes.map((note) => <li key={note}>- {note}</li>)}
              </ul>
            ) : null}
          </section>
        </aside>
      </section>

      <CourseDetailModal course={selectedCourse} onClose={() => setSelectedCourse(null)} />
    </div>
  )
}
