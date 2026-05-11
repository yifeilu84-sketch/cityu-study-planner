import { Link } from 'react-router-dom'
import { Building2, Search, ArrowRight } from 'lucide-react'
import { useState, useMemo } from 'react'
import majorIndex from '../data/majors-index.json'

const COLLEGE_COLORS: Record<string, string> = {
  'college-of-biomedicine': 'bg-rose-100 text-rose-800 border-rose-200',
  'college-of-business': 'bg-amber-100 text-amber-800 border-amber-200',
  'college-of-computing': 'bg-blue-100 text-blue-800 border-blue-200',
  'college-of-engineering': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'college-of-liberal-arts-and-social-sciences': 'bg-violet-100 text-violet-800 border-violet-200',
  'college-of-science': 'bg-cyan-100 text-cyan-800 border-cyan-200',
  'jockey-club-college-of-veterinary-medicine-and-life-sciences': 'bg-teal-100 text-teal-800 border-teal-200',
  'school-of-creative-media': 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200',
  'school-of-energy-and-environment': 'bg-lime-100 text-lime-800 border-lime-200',
  'school-of-law': 'bg-indigo-100 text-indigo-800 border-indigo-200',
}

function getMajorCount(college: any) {
  if (college.majors && college.majors.length > 0) {
    return college.majors.length
  }
  return college.departments.reduce((sum: number, d: any) => sum + d.majors.length, 0)
}

function matchesSearch(college: any, s: string): boolean {
  if (college.name.toLowerCase().includes(s)) return true
  if (college.majors) {
    return college.majors.some((m: any) => m.title.toLowerCase().includes(s))
  }
  return college.departments.some((d: any) =>
    d.name.toLowerCase().includes(s) ||
    d.majors.some((m: any) => m.title.toLowerCase().includes(s))
  )
}

export default function Home() {
  const [search, setSearch] = useState('')

  const filteredColleges = useMemo(() => {
    if (!search.trim()) return majorIndex.colleges
    const s = search.toLowerCase()
    return (majorIndex.colleges as any[]).filter(c => matchesSearch(c, s))
  }, [search])

  const totalMajors = (majorIndex.colleges as any[]).reduce((sum, c) => sum + getMajorCount(c), 0)

  return (
    <div>
      <div className="text-center py-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-cityu-dark mb-3">
          CityU Study Planner
        </h1>
        <p className="text-gray-600 text-base sm:text-lg mb-2">
          浏览香港城市大学各学院专业的学习计划与课程安排
        </p>
        <p className="text-gray-500 text-sm">
          覆盖 {majorIndex.colleges.length} 个学院 · {totalMajors} 个本科专业
        </p>
      </div>

      <div className="max-w-xl mx-auto mb-10 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="搜索学院、专业或课程..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-cityu-accent focus:border-transparent"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredColleges.map(college => {
          const majorCount = getMajorCount(college)
          const deptCount = college.departments?.length || 0
          const isSchool = college.type === 'school'
          const colorClass = COLLEGE_COLORS[college.id] || 'bg-gray-100 text-gray-800 border-gray-200'

          return (
            <Link
              key={college.id}
              to={`/college/${college.id}`}
              className={`group block p-5 rounded-xl border-2 transition-all hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] ${colorClass}`}
            >
              <div className="flex items-start justify-between mb-3">
                <Building2 className="w-6 h-6 opacity-70" />
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-white/60">
                  {majorCount} 个专业
                </span>
              </div>
              <h2 className="font-bold text-lg mb-1">{college.name}</h2>
              <p className="text-sm opacity-70">
                {isSchool ? '独立学院' : `${deptCount} 个学系`}
              </p>
              <div className="mt-3 flex items-center gap-1 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                查看详情 <ArrowRight className="w-4 h-4" />
              </div>
            </Link>
          )
        })}
      </div>

      {filteredColleges.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          未找到匹配的学院或专业
        </div>
      )}
    </div>
  )
}
