import { useState, useEffect } from 'react'
import { X, BookOpen, User, MessageCircle, HelpCircle, GraduationCap } from 'lucide-react'

export default function WelcomeModal() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const seen = localStorage.getItem('cityu-welcome-seen')
    if (!seen) {
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
    localStorage.setItem('cityu-welcome-seen', '1')
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
            <h2 className="text-lg font-bold text-gray-800">欢迎使用 CityU Study Planner</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* 用途 */}
          <div className="flex items-start gap-3">
            <BookOpen className="w-5 h-5 text-cityu-blue mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-medium text-gray-800">网站用途</div>
              <p className="text-sm text-gray-600 mt-1">
                本网站为香港城市大学（CityU）学生提供课程规划辅助工具，涵盖 53 个本科专业的官方推荐学习计划、课程详情、考核方式、前置要求查询，以及自定义编辑模式，帮助你合理安排四年学业。
              </p>
            </div>
          </div>

          {/* 使用方法 */}
          <div className="flex items-start gap-3">
            <HelpCircle className="w-5 h-5 text-cityu-green mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-medium text-gray-800">使用方法</div>
              <ol className="text-sm text-gray-600 mt-1 space-y-1 list-decimal list-inside">
                <li>首页选择所属学院</li>
                <li>进入专业页面查看官方推荐学习计划</li>
                <li>点击「编辑模式」可自定义增删课程、拖拽调整</li>
                <li>选择辅修专业（Minor）后可在课程池中添加辅修课程</li>
                <li>系统会自动校验前置课程要求</li>
              </ol>
            </div>
          </div>

          {/* 制作人 */}
          <div className="flex items-start gap-3">
            <User className="w-5 h-5 text-cityu-purple mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-medium text-gray-800">制作人</div>
              <p className="text-sm text-gray-600 mt-1">
                吕逸飞（Lyu Yifei）
              </p>
            </div>
          </div>

          {/* 问题反馈 */}
          <div className="flex items-start gap-3">
            <MessageCircle className="w-5 h-5 text-cityu-orange mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-medium text-gray-800">问题反馈</div>
              <p className="text-sm text-gray-600 mt-1">
                如有问题或建议，欢迎通过微信联系：
                <span className="font-mono font-bold text-cityu-accent bg-cityu-accent/10 px-2 py-0.5 rounded ml-1">
                  L18617192008
                </span>
              </p>
            </div>
          </div>

          {/* 声明 */}
          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500">
            免责声明：本网站数据来源于 CityU 官方课程目录，仅供参考。实际选课请以大学官方系统和学术顾问意见为准。
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            onClick={handleClose}
            className="w-full py-2.5 bg-cityu-accent text-white rounded-lg font-medium hover:bg-cityu-purple transition-colors"
          >
            开始使用
          </button>
        </div>
      </div>
    </div>
  )
}
