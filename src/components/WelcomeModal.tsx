import { useState, useEffect } from 'react'
import { X, BookOpen, User, MessageCircle, HelpCircle, GraduationCap } from 'lucide-react'
import { shouldShowWelcomeModal } from '../utils/welcomeSession'
import { useLanguage } from '../i18n/LanguageContext.tsx'

export default function WelcomeModal() {
  const { pick } = useLanguage()
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (shouldShowWelcomeModal()) {
      setShow(true)
    }
  }, [])

  useEffect(() => {
    if (show) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [show])

  const handleClose = () => {
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60" onClick={handleClose}>
      <div
        className="bg-white rounded-none sm:rounded-2xl shadow-2xl max-w-lg w-full h-full sm:h-auto sm:max-h-[90vh] overflow-y-auto overscroll-contain"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-cityu-accent" />
            <h2 className="text-lg font-bold text-gray-800">{pick('欢迎使用 CityU Study Planner', 'Welcome to CityU Study Planner')}</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label={pick('关闭欢迎说明', 'Close welcome guide')}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* 用途 */}
          <div className="flex items-start gap-3">
            <BookOpen className="w-5 h-5 text-cityu-blue mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-medium text-gray-800">{pick('网站用途', 'What this site does')}</div>
              <p className="text-sm text-gray-600 mt-1">
                {pick(
                  '本网站为香港城市大学（CityU）学生提供课程规划辅助工具，涵盖本科与硕博项目、课程详情、考核方式、先修要求、毕业自检和自定义编辑模式。',
                  'This planning tool brings together CityUHK undergraduate and postgraduate programmes, course details, assessment, prerequisites, graduation checks, and editable semester plans.',
                )}
              </p>
            </div>
          </div>

          {/* 使用方法 */}
          <div className="flex items-start gap-3">
            <HelpCircle className="w-5 h-5 text-cityu-green mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-medium text-gray-800">{pick('使用方法', 'How to use it')}</div>
              <ol className="text-sm text-gray-600 mt-1 space-y-1 list-decimal list-inside">
                <li>{pick('首页选择所属学院或直接搜索专业与课程', 'Choose a college or search directly for a programme or course')}</li>
                <li>{pick('进入专业页面查看来源标注、学习计划和毕业要求', 'Open a programme to review its source status, study plan, and requirements')}</li>
                <li>{pick('点击「编辑模式」可增删课程并拖拽调整学期', 'Use Edit Mode to add, remove, and move courses between semesters')}</li>
                <li>{pick('通过 GE、专业对比、硕博和科研页面继续筛选', 'Use the GE, comparison, postgraduate, and research modules for deeper exploration')}</li>
                <li>{pick('系统会自动检查开课学期、先修、学分和毕业缺口', 'The site checks offerings, prerequisites, credit load, and graduation gaps')}</li>
              </ol>
            </div>
          </div>

          {/* 制作人 */}
          <div className="flex items-start gap-3">
            <User className="w-5 h-5 text-cityu-purple mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-medium text-gray-800">{pick('制作人', 'Created by')}</div>
              <p className="text-sm text-gray-600 mt-1">
                {pick('吕逸飞（Lyu Yifei）', 'Lyu Yifei')}
              </p>
            </div>
          </div>

          {/* 问题反馈 */}
          <div className="flex items-start gap-3">
            <MessageCircle className="w-5 h-5 text-cityu-orange mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-medium text-gray-800">{pick('问题反馈', 'Feedback')}</div>
              <p className="text-sm text-gray-600 mt-1">
                {pick('如有问题或建议，欢迎通过微信联系：', 'For corrections or suggestions, contact me on WeChat: ')}
                <span className="font-mono font-bold text-cityu-accent bg-cityu-accent/10 px-2 py-0.5 rounded ml-1">
                  L18617192008
                </span>
              </p>
            </div>
          </div>

          {/* 声明 */}
          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500">
            {pick(
              '免责声明：本站基于 CityU 官方资料整理并明确标注来源状态，仅供规划参考。实际选课和毕业审核请以大学官方系统、学院及学术顾问意见为准。',
              'Disclaimer: This site organises and labels data from official CityU sources for planning reference. Official university systems, colleges, and academic advisers remain authoritative for enrolment and graduation review.',
            )}
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            onClick={handleClose}
            className="w-full py-2.5 bg-cityu-accent text-white rounded-lg font-medium hover:bg-cityu-purple transition-colors"
          >
            {pick('开始使用', 'Start Exploring')}
          </button>
        </div>
      </div>
    </div>
  )
}
