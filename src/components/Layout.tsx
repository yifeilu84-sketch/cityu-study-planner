import { Link } from 'react-router-dom'
import { BookOpen, Database, GitCompareArrows, GraduationCap, Microscope, Search } from 'lucide-react'
import type { ReactNode } from 'react'

interface LayoutProps {
  children: ReactNode
}

const navItems = [
  { to: '/coverage', icon: Database, label: '数据来源', shortLabel: '来源' },
  { to: '/ge', icon: Search, label: 'GE 选课助手', shortLabel: 'GE' },
  { to: '/compare', icon: GitCompareArrows, label: '专业对比', shortLabel: '对比' },
  { to: '/postgraduate', icon: GraduationCap, label: '硕博', shortLabel: '硕博' },
]

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="app-shell">
      <header className="app-header text-white">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-3 py-3 sm:gap-3 sm:px-4 sm:py-4">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/10">
            <GraduationCap className="h-5 w-5 text-red-200 sm:h-6 sm:w-6" />
          </div>
          <Link to="/" className="min-w-0 truncate text-base font-bold tracking-tight text-white transition-colors hover:text-red-100 sm:text-lg">
            CityU Study Planner
            <span className="ml-2 hidden text-xs font-semibold uppercase tracking-[0.16em] text-white/45 lg:inline">
              Academic Intelligence
            </span>
          </Link>
          <nav className="ml-auto flex items-center gap-1.5 overflow-x-auto sm:gap-2">
            {navItems.map(({ to, icon: Icon, label, shortLabel }) => (
              <Link key={to} to={to} className="toolbar-link">
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{shortLabel}</span>
              </Link>
            ))}
            <Link to="/academic" className="toolbar-link">
              <Microscope className="h-4 w-4" />
              <span className="hidden sm:inline">科研参考</span>
              <span className="sm:hidden">科研</span>
            </Link>
          </nav>
        </div>
      </header>

      <main className="app-main">
        {children}
      </main>

      <footer className="mt-12 border-t border-slate-200/70 bg-white/80 py-6 text-slate-500">
        <div className="mx-auto max-w-7xl space-y-2 px-4 text-center text-sm">
          <p className="flex items-center justify-center gap-2 text-slate-600">
            <BookOpen className="h-4 w-4 text-cityu-accent" />
            数据来源：CityU 官方课程目录、官方 study plan / handbook / flowchart，以及已标注的毕业要求整理
          </p>
          <p>cityu.edu.hk/catalogue/ug/current</p>
          <p className="text-slate-500">
            制作人：吕逸飞（Lyu Yifei） 问题反馈微信：
            <span className="font-mono text-slate-700">L18617192008</span>
          </p>
        </div>
      </footer>
    </div>
  )
}
