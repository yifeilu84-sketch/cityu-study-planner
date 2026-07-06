import { useState, useMemo, useEffect } from 'react'
import { DndContext, useDraggable, useDroppable, TouchSensor, MouseSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { X, GripVertical, AlertCircle, ChevronUp, ChevronDown, Download } from 'lucide-react'
import { canAddCourse, getGEArea, isRequiredGE, recalcCredits, buildCoursePool, type EditableSemester } from '../utils/editPlan'
import minorsData from '../data/minors.json'
import type { Course } from '../types'
import CourseBadge from './CourseBadge'
import GraduationAuditPanel from './GraduationAuditPanel'
import { getCategoryColor, getCreditStatus } from '../utils/studyPlan'
import { auditGraduationPlan } from '../utils/graduationAudit.ts'

interface Props {
  initialPlan: EditableSemester[]
  major: any
  streamIndex?: number
  courses: Record<string, Course>
  onCourseClick: (code: string) => void
}

function DraggablePoolItem({ course, disabled }: { course: { code: string; title: string; credits: number; category: string }; disabled?: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: course.code, disabled })
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`p-2.5 rounded-lg border text-xs cursor-grab active:cursor-grabbing transition-opacity touch-none select-none ${
        disabled ? 'opacity-40 cursor-not-allowed' : 'hover:shadow-md'
      } ${getCategoryColor(course.category)} ${isDragging ? 'opacity-50' : ''}`}
    >
      <div className="font-bold">{course.code}</div>
      <div className="truncate">{course.title}</div>
      <div className="text-[10px] opacity-70">{course.credits} 学分</div>
    </div>
  )
}

function DroppableSemester({ sem, children, onRemoveCourse }: {
  sem: EditableSemester
  children: React.ReactNode
  onRemoveCourse: (code: string) => void
}) {
  const { isOver, setNodeRef } = useDroppable({ id: `${sem.year}-${sem.sem}` })
  const creditStatus = getCreditStatus(sem.totalCredits)

  return (
    <div
      ref={setNodeRef}
      className={`semester-card border-2 p-3 sm:p-4 transition-colors ${
        isOver ? 'border-cityu-accent bg-cityu-accent/5' : 'border-transparent'
      }`}
    >
      <div className="flex items-center justify-between mb-2 sm:mb-3 pb-2 border-b border-gray-100">
        <h3 className="font-bold text-gray-800 text-sm sm:text-base">Year {sem.year} Sem {sem.sem}</h3>
        <span className={`text-xs font-medium px-2 py-0.5 rounded ${
          creditStatus.status === 'ok' ? 'text-gray-500' :
          creditStatus.status === 'warning' ? 'text-amber-700 bg-amber-50' :
          'text-red-700 bg-red-50'
        }`}>
          {sem.totalCredits} 学分
        </span>
      </div>
      {creditStatus.status !== 'ok' && (
        <div className={`text-xs mb-2 px-2 py-1 rounded ${
          creditStatus.status === 'warning' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
        }`}>
          {creditStatus.message}
        </div>
      )}
      <div className="space-y-2 min-h-[80px]">
        {children}
      </div>
    </div>
  )
}

export default function StudyPlanEditor({ initialPlan, major, streamIndex, courses, onCourseClick }: Props) {
  const storageKey = `cityu-study-plan-${major.code}${streamIndex != null ? '-stream-' + streamIndex : ''}`

  const [plan, setPlan] = useState<EditableSemester[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) return JSON.parse(saved)
    } catch { /* ignore */ }
    return initialPlan
  })
  const [toast, setToast] = useState<string | null>(null)
  const [saveIndicator, setSaveIndicator] = useState(false)
  const [poolOpen, setPoolOpen] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)

  const [selectedMinor, setSelectedMinor] = useState<string>('')

  // Auto-save plan to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(plan))
      setSaveIndicator(true)
      const timer = setTimeout(() => setSaveIndicator(false), 1500)
      return () => clearTimeout(timer)
    } catch { /* ignore */ }
  }, [plan, storageKey])

  const minor = minorsData.find((m: any) => m.code === selectedMinor)
  const minorCourseList = minor?.courses as string[] | undefined

  const pool = useMemo(() => buildCoursePool(major, courses, minorCourseList, streamIndex), [major, courses, minorCourseList, streamIndex])
  const audit = useMemo(() => auditGraduationPlan(major, courses, plan, streamIndex), [major, courses, plan, streamIndex])

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  )

  const usedCodes = useMemo(() => {
    const s = new Set<string>()
    plan.forEach(sem => sem.courses.forEach(c => s.add(c.code)))
    return s
  }, [plan])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = event
    if (!over) return
    const courseCode = active.id as string
    const semId = over.id as string
    const [yearStr, sem] = semId.split('-')
    const year = parseInt(yearStr)

    // Find target semester index
    const targetIdx = plan.findIndex(s => s.year === year && s.sem === sem)
    if (targetIdx === -1) return

    // Check if already in this semester
    const targetSem = plan[targetIdx]
    if (targetSem.courses.some(c => c.code === courseCode)) {
      showToast('该课程已在此学期中')
      return
    }

    // Check prerequisites
    const check = canAddCourse(courseCode, { year, sem: sem as any }, plan, courses)
    if (!check.ok) {
      showToast(check.reason || '无法添加课程')
      return
    }

    const course = courses[courseCode]
    if (!course) return

    const newPlan = plan.map((s, idx) => {
      if (idx === targetIdx) {
        return {
          ...s,
          courses: [...s.courses, {
            code: course.code,
            title: course.title,
            credits: course.credits || 0,
            category: course.code.startsWith('GE') ? 'ge' : s.courses[0]?.category || 'majorCore'
          }],
          totalCredits: s.totalCredits + (course.credits || 0)
        }
      }
      // Remove from other semesters if present
      const filtered = s.courses.filter(c => c.code !== courseCode)
      if (filtered.length !== s.courses.length) {
        return { ...s, courses: filtered, totalCredits: recalcCredits({ ...s, courses: filtered }) }
      }
      return s
    })

    setPlan(newPlan)
  }

  const removeCourse = (semIdx: number, code: string) => {
    const newPlan = plan.map((s, idx) => {
      if (idx !== semIdx) return s
      const filtered = s.courses.filter(c => c.code !== code)
      return { ...s, courses: filtered, totalCredits: recalcCredits({ ...s, courses: filtered }) }
    })
    setPlan(newPlan)
  }

  // Group pool courses
  const poolGroups = useMemo(() => {
    const requiredGE: typeof pool = []
    const areas: Record<string, typeof pool> = {}
    const others: typeof pool = []
    for (const c of pool) {
      if (isRequiredGE(c.code)) {
        requiredGE.push(c)
      } else {
        const area = getGEArea(c.code)
        if (area) {
          if (!areas[area]) areas[area] = []
          areas[area].push(c)
        } else {
          others.push(c)
        }
      }
    }
    return { requiredGE, areas, others }
  }, [pool])

  // Reset to official plan
  const handleReset = () => {
    if (confirm('确定要重置为官方推荐学习计划吗？所有自定义更改将丢失。')) {
      setPlan(initialPlan)
      localStorage.removeItem(storageKey)
    }
  }

  // Export study plan as JSON
  const handleExport = () => {
    const data = {
      major: major.code,
      majorTitle: major.title,
      exportedAt: new Date().toISOString(),
      semesters: plan.map(s => ({
        year: s.year,
        sem: s.sem,
        totalCredits: s.totalCredits,
        courses: s.courses.map(c => ({
          code: c.code,
          title: c.title,
          credits: c.credits,
          category: c.category
        }))
      }))
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cityu-study-plan-${major.code}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="mb-4">
        <GraduationAuditPanel audit={audit} compact />
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Semester Grid */}
        <div className="flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
            {plan.map((sem, semIdx) => (
              <DroppableSemester key={`${sem.year}-${sem.sem}`} sem={sem} onRemoveCourse={(code) => removeCourse(semIdx, code)}>
                {sem.courses.map(c => (
                  <CourseBadge
                    key={c.code}
                    code={c.code}
                    title={c.title}
                    credits={c.credits}
                    category={c.category}
                    onClick={() => onCourseClick(c.code)}
                    onRemove={() => removeCourse(semIdx, c.code)}
                  />
                ))}
                {sem.courses.length === 0 && (
                  <div className="text-xs text-gray-400 text-center py-6 border-2 border-dashed border-gray-200 rounded-lg min-h-[80px] flex items-center justify-center">
                    拖拽课程到此处
                  </div>
                )}
              </DroppableSemester>
            ))}
          </div>

          <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">
            {saveIndicator && (
              <span className="text-xs text-green-600 text-center sm:text-right">已自动保存</span>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleExport}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 sm:py-2 text-sm text-cityu-accent bg-cityu-accent/10 rounded-lg hover:bg-cityu-accent/20 transition-colors"
              >
                <Download className="w-4 h-4" />
                导出计划
              </button>
              <button
                onClick={handleReset}
                className="flex-1 sm:flex-none px-4 py-2.5 sm:py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                重置为官方计划
              </button>
            </div>
          </div>
        </div>

        {/* Course Pool */}
        <div className={`course-pool-panel lg:w-80 shrink-0 max-h-[50dvh] lg:max-h-[80vh] overflow-y-auto overscroll-contain ${poolOpen ? '' : 'hidden lg:block'}`}>
          {/* Mobile pool toggle - sticky header */}
          <button
            onClick={() => setPoolOpen(!poolOpen)}
            className="lg:hidden sticky top-0 z-10 flex items-center justify-center gap-1 w-full py-3 bg-white border-b border-gray-100 text-sm text-gray-600"
          >
            {poolOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            {poolOpen ? '收起课程池' : '展开课程池'}
            <span className="text-xs text-gray-400 ml-1">({pool.length} 门课程)</span>
          </button>

          <div className="p-4">
            <h3 className="hidden lg:flex font-bold text-gray-800 mb-3 items-center gap-2">
              <GripVertical className="w-4 h-4 text-gray-400" />
              课程池
              <span className="text-xs font-normal text-gray-500 ml-auto">拖拽添加</span>
            </h3>

          {/* Minor Selector */}
          <div className="mb-4">
            <label className="text-xs font-semibold text-gray-500 mb-1 block">辅修专业 (Minor)</label>
            <select
              value={selectedMinor}
              onChange={e => setSelectedMinor(e.target.value)}
              className="w-full text-base sm:text-sm px-2 py-1.5 rounded border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cityu-accent"
            >
              <option value="">不选辅修</option>
              {minorsData.map((m: any) => (
                <option key={m.code} value={m.code}>{m.title} ({m.credits} 学分)</option>
              ))}
            </select>
            {minor && (
              <div className="text-[10px] text-gray-500 mt-1">{minor.department}</div>
            )}
          </div>

          {/* Required GE */}
          {poolGroups.requiredGE.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">必修 GE</h4>
              <div className="grid grid-cols-2 gap-1.5">
                {poolGroups.requiredGE.map(c => (
                  <DraggablePoolItem
                    key={c.code}
                    course={c}
                    disabled={usedCodes.has(c.code)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* GE Areas - fixed order: 1, 2, 3 */}
          {['Area 1', 'Area 2', 'Area 3'].map(area => {
            const list = poolGroups.areas[area]
            if (!list || list.length === 0) return null
            return (
              <div key={area} className="mb-4">
                <h4 className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">{area}</h4>
                <div className="grid grid-cols-2 gap-1.5">
                  {list.map(c => (
                    <DraggablePoolItem
                      key={c.code}
                      course={c}
                      disabled={usedCodes.has(c.code)}
                    />
                  ))}
                </div>
              </div>
            )
          })}

          {/* Minor courses */}
          {selectedMinor && minorCourseList && (
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-amber-600 mb-2 uppercase tracking-wider">{minor?.title} 辅修课程</h4>
              <div className="grid grid-cols-2 gap-1.5">
                {poolGroups.others.filter(c => minorCourseList.includes(c.code)).map(c => (
                  <DraggablePoolItem
                    key={c.code}
                    course={c}
                    disabled={usedCodes.has(c.code)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Other required courses (excluding minor courses if minor selected) */}
          {poolGroups.others.filter(c => !minorCourseList?.includes(c.code)).length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">专业课程</h4>
              <div className="grid grid-cols-2 gap-1.5">
                {poolGroups.others.filter(c => !minorCourseList?.includes(c.code)).map(c => (
                  <DraggablePoolItem
                    key={c.code}
                    course={c}
                    disabled={usedCodes.has(c.code)}
                  />
                ))}
              </div>
            </div>
          )}
          </div>
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeId ? (
          (() => {
            const course = courses[activeId]
            if (!course) return null
            const poolCourse = pool.find(c => c.code === activeId)
            const category = poolCourse?.category || (course.code.startsWith('GE') ? 'ge' : 'majorCore')
            return (
              <div className={`p-3 rounded-lg border shadow-xl cursor-grabbing ${getCategoryColor(category)}`}>
                <div className="font-bold text-sm">{course.code}</div>
                <div className="text-sm">{course.title}</div>
                <div className="text-xs opacity-70 mt-1">{course.credits} 学分</div>
              </div>
            )
          })()
        ) : null}
      </DragOverlay>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg shadow-lg text-sm max-w-[90vw] mb-[env(safe-area-inset-bottom)]">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">{toast}</span>
        </div>
      )}
    </DndContext>
  )
}
