import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, GraduationCap, BookOpen } from 'lucide-react'
import type { CSSProperties } from 'react'
import majorIndex from '../data/majors-index.json'
import { getCollegeThemeStyle } from '../utils/collegeThemes.ts'

export default function CollegePage() {
  const { collegeId } = useParams<{ collegeId: string }>()
  const college = majorIndex.colleges.find(c => c.id === collegeId)

  if (!college) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-gray-600">学院未找到</h2>
        <Link to="/" className="text-cityu-accent mt-4 inline-block hover:underline">
          返回首页
        </Link>
      </div>
    )
  }

  const isSchool = college.type === 'school'
  const majors = (college.majors && college.majors.length > 0)
    ? college.majors
    : (college.departments || []).flatMap(d => d.majors)
  const themeStyle = getCollegeThemeStyle(college.id) as CSSProperties

  return (
    <div>
      <Link to="/" className="inline-flex items-center gap-1 text-gray-500 hover:text-cityu-accent mb-4 sm:mb-6 transition-colors text-sm sm:text-base">
        <ArrowLeft className="w-4 h-4" />
        返回首页
      </Link>

      <div className="college-detail-hero mb-6 sm:mb-8" style={themeStyle}>
        <div>
          <div className="section-eyebrow mb-3">
            <GraduationCap className="h-4 w-4" />
            Undergraduate programme directory
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-cityu-dark mb-2">{college.name}</h1>
          <p className="text-gray-600">
            {isSchool ? `${majors.length} 个本科专业` : `${(college.departments || []).length} 个学系 · ${majors.length} 个本科专业`}
          </p>
        </div>
        <div className="college-hero-stat">
          <span>{majors.length}</span>
          <small>UG Majors</small>
        </div>
      </div>

      <div className="space-y-8">
        {isSchool ? (
          <div className="college-section-panel">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {majors.map(major => (
                <Link
                  key={major.code}
                  to={`/major/${major.code}`}
                  className="major-link-card group"
                >
                  <GraduationCap className="w-5 h-5 text-gray-400 group-hover:text-cityu-accent transition-colors" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-800 group-hover:text-cityu-accent transition-colors truncate">
                      {major.title}
                    </div>
                    <div className="major-code-chip">{major.code}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          (college.departments || []).map(dept => (
            <div key={dept.id} className="college-section-panel">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-cityu-accent" />
                {dept.name}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {dept.majors.map(major => (
                  <Link
                    key={major.code}
                    to={`/major/${major.code}`}
                    className="major-link-card group"
                  >
                    <GraduationCap className="w-5 h-5 text-gray-400 group-hover:text-cityu-accent transition-colors" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-800 group-hover:text-cityu-accent transition-colors truncate">
                        {major.title}
                      </div>
                      <div className="major-code-chip">{major.code}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
