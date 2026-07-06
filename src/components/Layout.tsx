import { Link, NavLink } from 'react-router-dom'
import {
  BookOpen,
  Database,
  GitCompareArrows,
  GraduationCap,
  Microscope,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import type { ReactNode } from 'react'

interface LayoutProps {
  children: ReactNode
}

const navItems = [
  { to: '/', icon: GraduationCap, label: '本科规划', shortLabel: '本科', end: true },
  { to: '/coverage', icon: Database, label: '数据来源', shortLabel: '来源' },
  { to: '/ge', icon: Search, label: 'GE 选课助手', shortLabel: 'GE' },
  { to: '/compare', icon: GitCompareArrows, label: '专业对比', shortLabel: '对比' },
  { to: '/postgraduate', icon: GraduationCap, label: '硕博项目', shortLabel: '硕博' },
  { to: '/academic', icon: Microscope, label: '科研参考', shortLabel: '科研' },
]

const navClass = ({ isActive }: { isActive: boolean }) => (
  `nav-link ${isActive ? 'nav-link-active' : ''}`
)

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <Link to="/" className="brand-block">
          <span className="brand-mark">
            <GraduationCap className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-black text-slate-950">CityU Study Planner</span>
            <span className="block truncate text-[11px] font-bold uppercase text-slate-500">
              Academic Intelligence
            </span>
          </span>
        </Link>

        <nav className="sidebar-nav" aria-label="Primary navigation">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink key={to} to={to} end={end} className={navClass}>
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-insight">
          <div className="flex items-center gap-2 text-xs font-black uppercase text-amber-700">
            <ShieldCheck className="h-4 w-4" />
            Trust Layer
          </div>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            官方 study plan、毕业要求、课程池和评分细则分层标注，避免把 DIY 参考伪装成官网路径。
          </p>
        </div>
      </aside>

      <div className="app-content">
        <header className="app-mobile-header">
          <div className="flex items-center gap-2">
            <div className="brand-mark h-9 w-9">
              <GraduationCap className="h-5 w-5" />
            </div>
            <Link to="/" className="min-w-0 truncate text-sm font-black text-slate-950">
              CityU Study Planner
            </Link>
          </div>
          <nav className="mobile-nav" aria-label="Mobile navigation">
            {navItems.map(({ to, icon: Icon, shortLabel, end }) => (
              <NavLink key={to} to={to} end={end} className={navClass}>
                <Icon className="h-4 w-4" />
                <span>{shortLabel}</span>
              </NavLink>
            ))}
          </nav>
        </header>

        <main className="app-main">
          {children}
        </main>

        <footer className="app-footer">
          <div className="mx-auto max-w-7xl space-y-2 px-4 text-center text-sm">
            <p className="flex items-center justify-center gap-2 text-slate-600">
              <BookOpen className="h-4 w-4 text-cityu-accent" />
              数据来源：CityU 官方课程目录、官方 study plan / handbook / flowchart，以及已标注的毕业要求整理
            </p>
            <p className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500">
              <Sparkles className="h-3.5 w-3.5 text-amber-600" />
              cityu.edu.hk/catalogue/ug/current
            </p>
            <p className="text-slate-500">
              制作人：吕逸飞（Lyu Yifei） 问题反馈微信：
              <span className="font-mono text-slate-700">L18617192008</span>
            </p>
          </div>
        </footer>
      </div>
    </div>
  )
}
