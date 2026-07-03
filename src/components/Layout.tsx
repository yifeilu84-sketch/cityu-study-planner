import { Link } from 'react-router-dom'
import { BookOpen, Database, GraduationCap, Search } from 'lucide-react'
import type { ReactNode } from 'react'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-cityu-dark text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center gap-2 sm:gap-3">
          <GraduationCap className="w-6 h-6 sm:w-8 sm:h-8 text-cityu-accent flex-shrink-0" />
          <Link to="/" className="text-lg sm:text-xl font-bold hover:text-cityu-accent transition-colors min-w-0 truncate">
            CityU Study Planner
          </Link>
          <nav className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <Link
              to="/coverage"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs sm:text-sm bg-white/10 hover:bg-white/15 hover:text-cityu-accent transition-colors"
            >
              <Database className="w-4 h-4" />
              <span className="hidden sm:inline">数据来源</span>
              <span className="sm:hidden">来源</span>
            </Link>
            <Link
              to="/ge"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs sm:text-sm bg-white/10 hover:bg-white/15 hover:text-cityu-accent transition-colors"
            >
              <Search className="w-4 h-4" />
              <span className="hidden sm:inline">GE 选课助手</span>
              <span className="sm:hidden">GE</span>
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {children}
      </main>

      <footer className="bg-cityu-dark text-gray-400 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm space-y-2">
          <p className="flex items-center justify-center gap-2">
            <BookOpen className="w-4 h-4" />
            数据来源：CityU 官方课程目录、官方 study plan / handbook / flowchart，以及已标注的毕业要求整理
          </p>
          <p>cityu.edu.hk/catalogue/ug/current</p>
          <p className="text-gray-500">
            制作人：吕逸飞（Lyu Yifei） 问题反馈微信：
            <span className="font-mono text-gray-300">L18617192008</span>
          </p>
        </div>
      </footer>
    </div>
  )
}
