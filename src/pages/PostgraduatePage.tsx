import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  ExternalLink,
  FileText,
  GraduationCap,
  ListChecks,
  Microscope,
  Search,
  ShieldCheck,
} from 'lucide-react'

type PgCategory = 'master' | 'research' | 'doctorate' | 'support'

interface PgLink {
  category: PgCategory
  title: string
  subtitle: string
  url: string
  tags: string[]
}

const CATEGORY_LABELS: Record<PgCategory | 'all', string> = {
  all: '全部',
  master: '授课型硕士',
  research: '研究型硕博',
  doctorate: '专业博士',
  support: '申请与奖学金',
}

const CATEGORY_CLASSES: Record<PgCategory, string> = {
  master: 'bg-blue-50 text-blue-800 border-blue-100',
  research: 'bg-emerald-50 text-emerald-800 border-emerald-100',
  doctorate: 'bg-violet-50 text-violet-800 border-violet-100',
  support: 'bg-amber-50 text-amber-800 border-amber-100',
}

const OFFICIAL_LINKS: PgLink[] = [
  {
    category: 'master',
    title: "Master's Programmes",
    subtitle: '2026/27 programme list, study mode, application deadlines and programme-specific pages.',
    url: 'https://www.cityu.edu.hk/pg/taught-postgraduate-programmes/list',
    tags: ['programme list', 'deadlines', 'taught'],
  },
  {
    category: 'master',
    title: "Master's Entrance Requirements",
    subtitle: 'General entrance requirements and English proficiency notes for taught postgraduate admission.',
    url: 'https://www.cityu.edu.hk/pg/taught-postgraduate-programmes/entrance-requirements',
    tags: ['requirements', 'english'],
  },
  {
    category: 'master',
    title: "Master's Latest Updates",
    subtitle: 'Admissions updates, English-test validity window and other current reminders.',
    url: 'https://www.cityu.edu.hk/pg/taught-postgraduate-programmes/latest-updates-for-tpg',
    tags: ['updates', 'admissions'],
  },
  {
    category: 'research',
    title: 'Research Degree Programmes',
    subtitle: 'Official introduction to MPhil and PhD routes at CityUHK.',
    url: 'https://www.cityu.edu.hk/pg/research-degree-programmes/introduction',
    tags: ['MPhil', 'PhD', 'research'],
  },
  {
    category: 'research',
    title: 'Research Areas',
    subtitle: 'College and department research-area directory for finding possible supervisors and disciplines.',
    url: 'https://www.cityu.edu.hk/pg/research-degree-programmes/research-areas',
    tags: ['supervisors', 'departments'],
  },
  {
    category: 'research',
    title: 'Research Degree Entrance Requirements',
    subtitle: 'Minimum academic and English requirements for MPhil and PhD applicants.',
    url: 'https://www.cityu.edu.hk/pg/research-degree-programmes/entrance-requirements',
    tags: ['requirements', 'MPhil', 'PhD'],
  },
  {
    category: 'research',
    title: 'Research Proposal Guidelines',
    subtitle: 'Official advice for preparing a research proposal for research postgraduate admission.',
    url: 'https://www.cityu.edu.hk/pg/research-degree-programmes/research-proposal-guidelines',
    tags: ['proposal', 'research plan'],
  },
  {
    category: 'doctorate',
    title: 'Professional Doctorate Programmes',
    subtitle: 'Official overview for DBA, DBAC, EngD and other professional doctorate routes.',
    url: 'https://www.cityu.edu.hk/pg/professional-doctorate-programmes/introduction',
    tags: ['DBA', 'EngD', 'professional'],
  },
  {
    category: 'doctorate',
    title: 'Professional Doctorate Programme List',
    subtitle: 'Programme-specific information and links for professional doctorate applicants.',
    url: 'https://www.cityu.edu.hk/pg/professional-doctorate-programmes/programme-list',
    tags: ['programme list', 'doctorate'],
  },
  {
    category: 'support',
    title: 'Research Degree Apply Now',
    subtitle: 'Official application notes, documents and application-period reminder for research degrees.',
    url: 'https://www.cityu.edu.hk/pg/research-degree-programmes/apply-now',
    tags: ['apply', 'documents'],
  },
  {
    category: 'support',
    title: "Master's Apply Now",
    subtitle: 'Application notes for taught postgraduate applicants.',
    url: 'https://www.cityu.edu.hk/pg/taught-postgraduate-programmes/apply-now',
    tags: ['apply', 'taught'],
  },
  {
    category: 'support',
    title: 'HK PhD Fellowship Scheme',
    subtitle: 'Official scholarship route for eligible PhD applicants.',
    url: 'https://www.cityu.edu.hk/pg/research-degree-programmes/hk-phd-fellowship-scheme',
    tags: ['scholarship', 'PhD'],
  },
]

const CHECKLIST = [
  '确认 programme title、award、mode of study 和 local / non-local deadlines 是否一致。',
  '逐个打开 programme-specific page 核对 entrance requirements、English requirements 和所需文件。',
  '授课型硕士通常看课程结构和 credit units；研究型硕博通常看研究方向、导师、proposal 和 funding。',
  '如果官网没有逐学期 study plan，不在本站预设学期课程，避免误导。',
]

export default function PostgraduatePage() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<PgCategory | 'all'>('all')

  const filteredLinks = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return OFFICIAL_LINKS.filter((item) => {
      const matchesCategory = category === 'all' || item.category === category
      if (!matchesCategory) return false
      if (!normalized) return true
      return [item.title, item.subtitle, item.url, ...item.tags]
        .some((value) => value.toLowerCase().includes(normalized))
    })
  }, [category, query])

  const counts = useMemo(() => (
    OFFICIAL_LINKS.reduce<Record<PgCategory, number>>((acc, item) => {
      acc[item.category] += 1
      return acc
    }, { master: 0, research: 0, doctorate: 0, support: 0 })
  ), [])

  return (
    <div className="space-y-5">
      <Link to="/" className="inline-flex items-center gap-1 text-gray-500 hover:text-cityu-accent transition-colors text-sm sm:text-base">
        <ArrowLeft className="w-4 h-4" />
        返回首页
      </Link>

      <section className="bg-white border border-gray-100 rounded-xl shadow-sm p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-2">
              <GraduationCap className="w-6 h-6 text-cityu-accent" />
              <h1 className="text-xl sm:text-2xl font-bold text-cityu-dark">硕博页面</h1>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">
              这里集中放 CityUHK 官方硕士、研究型 MPhil / PhD 和专业博士入口。当前站内逐课程规划、GE 检索和毕业要求自检仍只属于本科 study plan 审查；硕博项目请以官方 postgraduate admissions 页面为准。
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
            {(['master', 'research', 'doctorate', 'support'] as PgCategory[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={`rounded-lg border px-3 py-2 text-right transition-colors cursor-pointer ${CATEGORY_CLASSES[item]} ${
                  category === item ? 'ring-2 ring-cityu-accent/40' : ''
                }`}
              >
                <div className="font-bold text-lg">{counts[item]}</div>
                <div className="text-xs leading-tight">{CATEGORY_LABELS[item]}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索 MSc、PhD、DBA、proposal、scholarship..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cityu-accent focus:border-transparent"
            />
          </div>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value as PgCategory | 'all')}
            className="px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-cityu-accent cursor-pointer"
            aria-label="Postgraduate category"
          >
            {(['all', 'master', 'research', 'doctorate', 'support'] as const).map((item) => (
              <option key={item} value={item}>{CATEGORY_LABELS[item]}</option>
            ))}
          </select>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.8fr)_minmax(300px,0.8fr)] gap-5">
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <div>
              <h2 className="font-bold text-gray-800 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-cityu-accent" />
                官方入口
              </h2>
              <p className="text-sm text-gray-500">当前显示 {filteredLinks.length} 个官方链接</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setCategory('all')
                setQuery('')
              }}
              className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 hover:border-cityu-accent hover:text-cityu-accent transition-colors cursor-pointer"
            >
              重置筛选
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredLinks.map((item) => (
              <a
                key={item.url}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-lg border border-gray-100 bg-gray-50 p-4 hover:border-cityu-accent hover:bg-cityu-accent/5 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className={`inline-flex px-2 py-0.5 rounded border text-xs font-semibold ${CATEGORY_CLASSES[item.category]}`}>
                      {CATEGORY_LABELS[item.category]}
                    </span>
                    <h3 className="mt-2 font-semibold text-gray-800 leading-snug">{item.title}</h3>
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-cityu-accent flex-shrink-0" />
                </div>
                <p className="mt-2 text-sm text-gray-500 leading-relaxed">{item.subtitle}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {item.tags.map((tag) => (
                    <span key={tag} className="rounded bg-white border border-gray-100 px-2 py-0.5 text-xs text-gray-500">
                      {tag}
                    </span>
                  ))}
                </div>
              </a>
            ))}
          </div>

          {filteredLinks.length === 0 && (
            <div className="text-center py-12 text-gray-500 border border-dashed border-gray-200 rounded-lg">
              没有找到匹配的官方入口
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <section className="bg-white border border-amber-100 rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <h2 className="font-bold text-gray-800">站内状态</h2>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              硕博项目暂未纳入本科 study plan 审查、毕业要求自检和 GE 可自由组合课程池。此页是官方入口导航，不会为没有明确官方学期规划的硕博项目预设课程。
            </p>
          </section>

          <section className="bg-white border border-gray-100 rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <ListChecks className="w-5 h-5 text-cityu-accent" />
              <h2 className="font-bold text-gray-800">核验清单</h2>
            </div>
            <ul className="space-y-2">
              {CHECKLIST.map((item) => (
                <li key={item} className="flex gap-2 text-sm text-gray-600 leading-relaxed">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="bg-white border border-gray-100 rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <Microscope className="w-5 h-5 text-cityu-accent" />
              <h2 className="font-bold text-gray-800">下一步可补</h2>
            </div>
            <div className="space-y-2 text-sm text-gray-600 leading-relaxed">
              <p>如果后续收集到某个 MSc / MPhil / PhD 的官方 curriculum PDF 或 handbook，可以单独加入硕博数据层。</p>
              <p>有明确课程结构的授课型硕士可做 credit audit；研究型硕博更适合做 supervisor / research area / funding checklist。</p>
            </div>
            <div className="mt-3 rounded-lg bg-gray-50 border border-gray-100 p-3 text-xs text-gray-500 flex gap-2">
              <FileText className="w-4 h-4 flex-shrink-0 text-gray-400" />
              <span>资料核对日期：2026-07-05。官方页面可能调整，请以 CityUHK Postgraduate Admissions 实时内容为准。</span>
            </div>
          </section>
        </aside>
      </section>
    </div>
  )
}
