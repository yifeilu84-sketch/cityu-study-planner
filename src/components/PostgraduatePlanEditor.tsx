import { useEffect, useMemo, useState } from 'react'
import { Download, Plus, RotateCcw, Trash2 } from 'lucide-react'
import PlanRiskPanel from './PlanRiskPanel'
import type { Course, MajorCourse, PostgraduateProgramme, StudyPlan, StudyPlanSemester } from '../types'
import { auditPlanRisks, studyPlanToRiskSemesters } from '../utils/planRiskAudit.ts'
import { useLanguage } from '../i18n/LanguageContext.tsx'

const SEMESTERS = [
  ['semA', 'Semester A'],
  ['semB', 'Semester B'],
  ['summer', 'Summer Term'],
] as const

type SemesterKey = (typeof SEMESTERS)[number][0]

interface PostgraduatePlanEditorProps {
  programme: PostgraduateProgramme
  variantCode?: string
  initialPlan: StudyPlan
  coursePool: MajorCourse[]
  pgCourses: Record<string, Course>
  onCourseClick: (course: Course) => void
}

function clonePlan(plan: StudyPlan) {
  return JSON.parse(JSON.stringify(plan)) as StudyPlan
}

function getYearNumber(key: string) {
  return Number(key.replace(/^year/, '')) || 0
}

function planEntries(plan: StudyPlan) {
  return Object.entries(plan)
    .sort(([a], [b]) => getYearNumber(a) - getYearNumber(b))
    .map(([key, year]) => ({ key, label: `Year ${getYearNumber(key)}`, year }))
}

function recalculateSemester(semester: StudyPlanSemester) {
  return {
    ...semester,
    credits: semester.courses.reduce((sum, course) => sum + (Number(course.credits) || 0), 0),
  }
}

function recalculatePlan(plan: StudyPlan) {
  const next = clonePlan(plan)
  for (const year of Object.values(next)) {
    year.semA = recalculateSemester(year.semA)
    year.semB = recalculateSemester(year.semB)
    if (year.summer) year.summer = recalculateSemester(year.summer)
  }
  return next
}

function normalizeCourse(course: MajorCourse) {
  return {
    code: course.code,
    title: course.title,
    credits: Number(course.credits) || 0,
  }
}

function isSourceOnlyCourse(course: { code: string }) {
  return course.code.startsWith('PGTITLE_') || course.code.startsWith('PGCUSTOM_')
}

function displayCode(course: { code: string }) {
  return isSourceOnlyCourse(course) ? null : course.code
}

function loadSavedPlan(storageKey: string, initialPlan: StudyPlan) {
  if (typeof window === 'undefined') return clonePlan(initialPlan)

  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return clonePlan(initialPlan)
    return recalculatePlan(JSON.parse(raw) as StudyPlan)
  } catch {
    return clonePlan(initialPlan)
  }
}

export default function PostgraduatePlanEditor({
  programme,
  variantCode = 'default',
  initialPlan,
  coursePool,
  pgCourses,
  onCourseClick,
}: PostgraduatePlanEditorProps) {
  const { language, pick } = useLanguage()
  const storageKey = `cityu-pg-diy-plan:${programme.code}:${variantCode}`
  const [plan, setPlan] = useState(() => loadSavedPlan(storageKey, initialPlan))
  const [selectedCourseCode, setSelectedCourseCode] = useState(coursePool[0]?.code ?? '')
  const [targetSemester, setTargetSemester] = useState('year1.semA')
  const [customCode, setCustomCode] = useState('')
  const [customTitle, setCustomTitle] = useState('')
  const [customCredits, setCustomCredits] = useState('3')

  const semesterOptions = useMemo(
    () =>
      planEntries(plan).flatMap(({ key, label, year }) =>
        SEMESTERS.filter(([semesterKey]) => Boolean(year[semesterKey])).map(([semesterKey, semesterLabel]) => ({
          value: `${key}.${semesterKey}`,
          label: `${pick(`第 ${getYearNumber(key)} 年`, label)} / ${pick(
            semesterKey === 'semA' ? 'A 学期' : semesterKey === 'semB' ? 'B 学期' : '暑期学期',
            semesterLabel,
          )}`,
        }))
      ),
    [plan, pick]
  )

  const selectedCourse = useMemo(
    () => coursePool.find((course) => course.code === selectedCourseCode) ?? coursePool[0],
    [coursePool, selectedCourseCode]
  )

  const totalCredits = useMemo(
    () =>
      planEntries(plan).reduce(
        (sum, { year }) => sum + SEMESTERS.reduce((yearSum, [semesterKey]) => yearSum + (year[semesterKey]?.credits ?? 0), 0),
        0
      ),
    [plan]
  )
  const planRisks = useMemo(
    () => auditPlanRisks({ plan: studyPlanToRiskSemesters(plan), courses: pgCourses }, language),
    [plan, pgCourses, language]
  )

  useEffect(() => {
    setPlan(loadSavedPlan(storageKey, initialPlan))
    setSelectedCourseCode(coursePool[0]?.code ?? '')
    setTargetSemester('year1.semA')
  }, [storageKey, initialPlan, coursePool])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(storageKey, JSON.stringify(plan))
  }, [plan, storageKey])

  function updateSemester(target: string, updater: (semester: StudyPlanSemester) => StudyPlanSemester) {
    const [yearKey, semesterKey] = target.split('.') as [string, SemesterKey]
    setPlan((current) => {
      const next = clonePlan(current)
      const semester = next[yearKey]?.[semesterKey]
      if (!semester) return current
      next[yearKey][semesterKey] = recalculateSemester(updater(semester))
      return next
    })
  }

  function addCourseToSemester() {
    if (!selectedCourse || !targetSemester) return
    updateSemester(targetSemester, (semester) => ({
      ...semester,
      courses: [...semester.courses, normalizeCourse(selectedCourse)],
    }))
  }

  function addCustomCourseToSemester() {
    const title = customTitle.trim()
    if (!title || !targetSemester) return
    const normalizedCode = customCode.trim() || `PGCUSTOM_${Date.now()}`
    const credits = Math.max(0, Number(customCredits) || 0)

    updateSemester(targetSemester, (semester) => ({
      ...semester,
      courses: [...semester.courses, { code: normalizedCode, title, credits }],
    }))
    setCustomCode('')
    setCustomTitle('')
    setCustomCredits('3')
  }

  function removeCourseFromSemester(yearKey: string, semesterKey: SemesterKey, index: number) {
    updateSemester(`${yearKey}.${semesterKey}`, (semester) => ({
      ...semester,
      courses: semester.courses.filter((_, courseIndex) => courseIndex !== index),
    }))
  }

  function resetPlan() {
    if (typeof window !== 'undefined') window.localStorage.removeItem(storageKey)
    setPlan(clonePlan(initialPlan))
  }

  function exportPlan() {
    const payload = {
      programme: programme.code,
      title: programme.title,
      variant: variantCode,
      exportedAt: new Date().toISOString(),
      plan,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${programme.code}-${variantCode}-diy-plan.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-cityu-accent/20 bg-cityu-accent/5 p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(180px,0.8fr)]">
            <label className="text-xs font-semibold text-gray-600">
              {pick('从课程池添加', 'Add from course pool')}
              <select
                value={selectedCourseCode}
                onChange={(event) => setSelectedCourseCode(event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-cityu-accent"
              >
                {coursePool.length ? (
                  coursePool.map((course) => (
                    <option key={course.code} value={course.code}>
                      {displayCode(course) ? `${displayCode(course)} - ` : ''}{course.title} ({course.credits} CU)
                    </option>
                  ))
                ) : (
                  <option value="">{pick('暂无结构化课程池', 'No structured course pool')}</option>
                )}
              </select>
            </label>
            <label className="text-xs font-semibold text-gray-600">
              {pick('目标学期', 'Target semester')}
              <select
                value={targetSemester}
                onChange={(event) => setTargetSemester(event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-cityu-accent"
              >
                {semesterOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={addCourseToSemester}
              disabled={!selectedCourse}
              className="inline-flex items-center gap-2 rounded-lg bg-cityu-dark px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-cityu-purple disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              <Plus className="h-4 w-4" />
              {pick('添加', 'Add')}
            </button>
            <button
              type="button"
              onClick={resetPlan}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-cityu-accent hover:text-cityu-accent"
            >
              <RotateCcw className="h-4 w-4" />
              {pick('重置', 'Reset')}
            </button>
            <button
              type="button"
              onClick={exportPlan}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-cityu-accent hover:text-cityu-accent"
            >
              <Download className="h-4 w-4" />
              {pick('导出', 'Export')}
            </button>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[minmax(120px,0.4fr)_minmax(0,1fr)_minmax(90px,0.25fr)_auto]">
          <input
            value={customCode}
            onChange={(event) => setCustomCode(event.target.value)}
            placeholder={pick('自定义代码', 'Custom code')}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-cityu-accent"
          />
          <input
            value={customTitle}
            onChange={(event) => setCustomTitle(event.target.value)}
            placeholder={pick('自定义课程 / 里程碑', 'Custom course / milestone')}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-cityu-accent"
          />
          <input
            value={customCredits}
            onChange={(event) => setCustomCredits(event.target.value)}
            type="number"
            min="0"
            step="1"
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-cityu-accent"
          />
          <button
            type="button"
            onClick={addCustomCourseToSemester}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-cityu-accent bg-white px-3 py-2 text-sm font-semibold text-cityu-accent transition-colors hover:bg-cityu-accent hover:text-white"
          >
            <Plus className="h-4 w-4" />
            {pick('自定义添加', 'Custom')}
          </button>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-gray-500">
          {pick(
            '可编辑副本仅保存在此浏览器中，不会改动官方样例或毕业要求。',
            'This editable copy is saved in this browser only. Official samples and graduation requirements are not changed.',
          )}
        </p>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm">
        <span className="font-semibold text-gray-700">{pick('本地 DIY 总学分', 'Local DIY total')}</span>
        <span className="font-bold text-cityu-accent">{totalCredits} CU</span>
      </div>

      <PlanRiskPanel summary={planRisks} compact />

      <div className="space-y-4">
        {planEntries(plan).map(({ key, label, year }) => (
          <div key={key} className="overflow-hidden rounded-lg border border-gray-100">
            <div className="bg-gray-50 px-3 py-2 font-semibold text-gray-800">{pick(`第 ${getYearNumber(key)} 年`, label)}</div>
            <div className="grid grid-cols-1 divide-y divide-gray-100 lg:grid-cols-3 lg:divide-x lg:divide-y-0">
              {SEMESTERS.map(([semesterKey, semesterLabel]) => {
                const semester = year[semesterKey]
                return (
                  <div key={semesterKey} className="min-h-[170px] p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-gray-800">{pick(
                        semesterKey === 'semA' ? 'A 学期' : semesterKey === 'semB' ? 'B 学期' : '暑期学期',
                        semesterLabel,
                      )}</h3>
                      <span className="text-xs text-gray-500">{semester?.credits ?? 0} CU</span>
                    </div>
                    {semester?.courses?.length ? (
                      <div className="space-y-2">
                        {semester.courses.map((course, index) => {
                          const detail = pgCourses[course.code]
                          return (
                            <div key={`${course.code}-${course.title}-${index}`} className="flex gap-2 rounded-lg border border-gray-100 bg-white p-2">
                              <button
                                type="button"
                                onClick={() => (detail ? onCourseClick(detail) : undefined)}
                                className={`min-w-0 flex-1 text-left ${detail ? 'hover:text-cityu-accent' : 'cursor-default'}`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  {displayCode(course) ? <span className="text-xs font-bold text-cityu-accent">{displayCode(course)}</span> : <span />}
                                  <span className="text-xs text-gray-500">{course.credits} CU</span>
                                </div>
                                <div className="mt-1 text-sm font-medium leading-snug text-gray-800">{course.title}</div>
                              </button>
                              <button
                                type="button"
                                onClick={() => removeCourseFromSemester(key, semesterKey, index)}
                                className="h-8 w-8 flex-shrink-0 rounded border border-gray-200 text-gray-500 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                                aria-label={pick(`移除 ${course.title}`, `Remove ${course.title}`)}
                              >
                                <Trash2 className="mx-auto h-4 w-4" />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="flex h-[108px] items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 text-center text-xs text-gray-500">
                        {pick('DIY 空白学期', 'DIY empty semester')}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
