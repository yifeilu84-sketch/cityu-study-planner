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
import LanguageToggle from './LanguageToggle.tsx'
import { useLanguage } from '../i18n/LanguageContext.tsx'

interface LayoutProps {
  children: ReactNode
}

const navItems = [
  { to: '/', icon: GraduationCap, zh: '本科规划', en: 'Undergraduate', shortZh: '本科', shortEn: 'UG', end: true },
  { to: '/coverage', icon: Database, zh: '数据来源', en: 'Data Sources', shortZh: '来源', shortEn: 'Sources' },
  { to: '/ge', icon: Search, zh: 'GE 选课助手', en: 'GE Explorer', shortZh: 'GE', shortEn: 'GE' },
  { to: '/compare', icon: GitCompareArrows, zh: '专业对比', en: 'Compare Majors', shortZh: '对比', shortEn: 'Compare' },
  { to: '/postgraduate', icon: GraduationCap, zh: '硕博项目', en: 'Postgraduate', shortZh: '硕博', shortEn: 'PG' },
  { to: '/academic', icon: Microscope, zh: '科研参考', en: 'Research', shortZh: '科研', shortEn: 'Research' },
]

const navClass = ({ isActive }: { isActive: boolean }) => (
  `nav-link ${isActive ? 'nav-link-active' : ''}`
)

export default function Layout({ children }: LayoutProps) {
  const { pick } = useLanguage()

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

        <div className="sidebar-language-control">
          <LanguageToggle />
        </div>

        <nav className="sidebar-nav" aria-label={pick('主导航', 'Primary navigation')}>
          {navItems.map(({ to, icon: Icon, zh, en, end }) => (
            <NavLink key={to} to={to} end={end} className={navClass}>
              <Icon className="h-4 w-4" />
              <span>{pick(zh, en)}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-insight sidebar-product-note">
          <div className="flex items-center gap-2 text-[13px] font-black text-slate-700">
            <ShieldCheck className="h-4 w-4" />
            {pick('数据可信度', 'Source confidence')}
          </div>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            {pick(
              '官方 study plan、毕业要求、课程池和评分细则分层标注，避免把 DIY 参考伪装成官网路径。',
              'Official study plans, graduation requirements, course pools, and assessment details are labelled by source confidence, with DIY references kept distinct from official paths.',
            )}
          </p>
        </div>
      </aside>

      <div className="app-content">
        <header className="app-mobile-header">
          <div className="mobile-brand-row">
            <div className="flex min-w-0 items-center gap-2">
              <div className="brand-mark h-9 w-9">
                <GraduationCap className="h-5 w-5" />
              </div>
              <Link to="/" className="min-w-0 truncate text-sm font-black text-slate-950">
                CityU Study Planner
              </Link>
            </div>
            <LanguageToggle compact />
          </div>
          <nav className="mobile-nav" aria-label={pick('移动端导航', 'Mobile navigation')}>
            {navItems.map(({ to, icon: Icon, shortZh, shortEn, end }) => (
              <NavLink key={to} to={to} end={end} className={navClass}>
                <Icon className="h-4 w-4" />
                <span>{pick(shortZh, shortEn)}</span>
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
              {pick(
                '数据来源：CityU 官方课程目录、官方 study plan / handbook / flowchart，以及已标注的毕业要求整理',
                'Sources: official CityU course catalogues, study plans, handbooks, flowcharts, and clearly labelled graduation-requirement summaries',
              )}
            </p>
            <p className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500">
              <Sparkles className="h-3.5 w-3.5 text-amber-600" />
              cityu.edu.hk/catalogue/ug/current
            </p>
            <p className="text-slate-500">
              {pick('制作人：吕逸飞（Lyu Yifei） 问题反馈微信：', 'Created by Lyu Yifei · Feedback on WeChat: ')}
              <span className="font-mono text-slate-700">L18617192008</span>
            </p>
          </div>
        </footer>
      </div>
    </div>
  )
}
