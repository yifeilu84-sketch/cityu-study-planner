import { useEffect } from 'react'
import { X, ExternalLink, Clock, FileText, BookOpen, AlertCircle, Flag } from 'lucide-react'
import type { Course } from '../types'
import { buildIssueReport } from '../utils/feedback.ts'

interface Props {
  course: Course | null
  onClose: () => void
  pageUrl?: string
}

function extractCAItems(details: string): { name: string; weight: number }[] {
  if (!details) return []
  const parts = details.replace(/\s+No\b/g, '\n').replace(/\s+Yes\b/g, '\n').split('\n').filter(Boolean)
  return parts.map(part => {
    const trimmed = part.trim().replace(/^\d+\s+/, '')
    const ciloRegex = /(\d+\s*,\s*){1,4}\d+/g
    let bestCilo = null
    let ciloMatch
    while ((ciloMatch = ciloRegex.exec(trimmed)) !== null) {
      const afterCilo = trimmed.substring(ciloMatch.index + ciloMatch[0].length)
      const weightMatch = afterCilo.match(/^\s*(\d{1,3})\b/)
      if (weightMatch) {
        bestCilo = { cilo: ciloMatch, weight: parseInt(weightMatch[1]) }
      }
    }
    let name: string
    let weight: number
    if (bestCilo) {
      name = trimmed.substring(0, bestCilo.cilo.index).trim()
      weight = bestCilo.weight
    } else {
      const numbers = [...trimmed.matchAll(/\b\d{1,3}\b/g)]
      if (numbers.length < 2) return null
      let weightIdx = numbers.length - 1
      const lastPos = numbers[weightIdx].index + numbers[weightIdx][0].length
      const afterLast = trimmed.substring(lastPos).trim()
      if (/^[a-zA-Z]/.test(afterLast) && weightIdx > 0) {
        weightIdx--
      }
      weight = parseInt(numbers[weightIdx][0])
      const weightPos = numbers[weightIdx].index
      const beforeWeight = trimmed.substring(0, weightPos)
      const cilos = [...beforeWeight.matchAll(/\b\d{1,3}\b/g)]
      if (cilos.length > 0) {
        const ciloPos = cilos[cilos.length - 1].index
        name = beforeWeight.substring(0, ciloPos).trim()
      } else {
        name = beforeWeight.trim()
      }
    }
    name = name.replace(/[-:‒]\s*$/, '')
    if (name.includes(':')) {
      name = name.split(':')[0].trim()
    } else if (name.length > 40) {
      const words = name.split(/\s+/)
      if (words.length > 4) name = words.slice(0, 4).join(' ')
      if (name.length > 40) name = name.substring(0, 40) + '...'
    }
    if (!name) return null
    return { name, weight }
  }).filter(Boolean) as { name: string; weight: number }[]
}

export default function CourseDetailModal({ course, onClose, pageUrl }: Props) {
  useEffect(() => {
    if (course) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [course])

  if (!course) return null

  const caItems = extractCAItems(course.assessment?.details || '')
  const issueReport = buildIssueReport({
    entityType: 'course',
    code: course.code,
    title: course.title,
    pageUrl: pageUrl ?? (typeof window !== 'undefined' ? window.location.href : course.courseUrl),
    sourceKind: course.catalogue === 'pg' ? 'pg-catalogue' : course.geSource ? 'official-ge-page' : 'course-pdf',
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-none sm:rounded-2xl shadow-2xl max-w-2xl w-full h-full sm:h-auto sm:max-h-[90vh] overflow-y-auto overscroll-contain"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 bg-cityu-accent/10 text-cityu-accent text-sm font-bold rounded">
                {course.code}
              </span>
              {course.catalogue === 'pg' && (
                <span className="px-2 py-0.5 bg-blue-50 text-cityu-blue text-sm font-bold rounded border border-blue-100">
                  PG Catalogue
                </span>
              )}
              <span className="text-sm text-gray-500">{course.credits} 学分</span>
            </div>
            <h2 className="text-xl font-bold text-gray-800">{course.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Semester */}
          {course.semester && (
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-cityu-blue mt-0.5" />
              <div>
                <div className="font-medium text-gray-800">开设学期</div>
                <div className="text-gray-600">{course.semester}</div>
              </div>
            </div>
          )}

          {/* Prerequisites */}
          {course.prerequisites.length > 0 && (
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-cityu-orange mt-0.5" />
              <div>
                <div className="font-medium text-gray-800">前置课程</div>
                <div className="flex flex-wrap gap-2 mt-1">
                  {course.prerequisites.map(pr => (
                    <span key={pr} className="px-2 py-1 bg-orange-50 text-orange-700 text-sm rounded border border-orange-100">
                      {pr}
                    </span>
                  ))}
                </div>
                {course.prerequisitesRaw && (
                  <div className="text-xs text-gray-400 mt-1">{course.prerequisitesRaw}</div>
                )}
              </div>
            </div>
          )}

          {/* Assessment */}
          {(course.assessment.continuous || course.assessment.exam || course.assessment.details) && (
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-cityu-green mt-0.5" />
              <div>
                <div className="font-medium text-gray-800">考核方式</div>
                <div className="mt-1 space-y-1 text-gray-600">
                  {course.assessment.continuous && (
                    <div>
                      <span>平时成绩: {course.assessment.continuous}</span>
                      {caItems.length > 0 && (
                        <span className="text-gray-500 text-sm ml-1 block sm:inline">
                          ({caItems.map(i => `${i.name}: ${i.weight}%`).join(', ')})
                        </span>
                      )}
                    </div>
                  )}
                  {course.assessment.exam && (
                    <div>期末考试: {course.assessment.exam}</div>
                  )}
                  {course.assessment.examDuration && (
                    <div>考试时长: {course.assessment.examDuration}</div>
                  )}
                  {course.assessment.details && caItems.length === 0 && (
                    <div className="text-sm text-gray-500">{course.assessment.details}</div>
                  )}
                </div>
                {(course.assessment.minCAPass || course.assessment.minExamPass) && (
                  <div className="mt-2 text-xs text-gray-500 bg-gray-50 p-2 rounded-lg">
                    {course.assessment.minCAPass && (
                      <span>平时成绩及格线: {course.assessment.minCAPass}</span>
                    )}
                    {course.assessment.minCAPass && course.assessment.minExamPass && (
                      <span className="mx-2">|</span>
                    )}
                    {course.assessment.minExamPass && (
                      <span>考试及格线: {course.assessment.minExamPass}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {course.catalogue === 'pg' && course.detailStatus !== 'parsed' && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-100 bg-amber-50 p-3">
              <AlertCircle className="w-5 h-5 text-amber-700 mt-0.5" />
              <div>
                <div className="font-medium text-amber-900">官方课程详情未确认</div>
                <div className="text-sm text-amber-800 mt-1">
                  已链接 CityUHK PG Course Catalogue；assessment / exam 等细项仍需打开官方课程页核对。
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          {course.description && (
            <div className="flex items-start gap-3">
              <BookOpen className="w-5 h-5 text-cityu-purple mt-0.5" />
              <div>
                <div className="font-medium text-gray-800">课程简介</div>
                <div className="text-gray-600 text-sm mt-1 leading-relaxed">
                  {course.description}
                </div>
              </div>
            </div>
          )}

          {(course.pdfUrl || issueReport.githubUrl) && (
            <div className="pt-3 border-t border-gray-100 flex flex-wrap gap-2">
              {/* PDF Link */}
              {course.pdfUrl && (
              <a
                href={course.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-cityu-dark text-white rounded-lg hover:bg-cityu-purple transition-colors"
              >
                <FileText className="w-4 h-4" />
                查看课程官方PDF
                <ExternalLink className="w-3 h-3" />
              </a>
              )}
              {course.courseUrl && (
              <a
                href={course.courseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                查看官方课程页
              </a>
              )}
              <a
                href={issueReport.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Flag className="w-4 h-4" />
                报告课程问题
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
