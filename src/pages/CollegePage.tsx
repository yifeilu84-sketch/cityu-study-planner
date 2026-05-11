import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, GraduationCap, BookOpen } from 'lucide-react'
import majorIndex from '../data/majors-index.json'

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

  return (
    <div>
      <Link to="/" className="inline-flex items-center gap-1 text-gray-500 hover:text-cityu-accent mb-4 sm:mb-6 transition-colors text-sm sm:text-base">
        <ArrowLeft className="w-4 h-4" />
        返回首页
      </Link>

      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-cityu-dark mb-2">{college.name}</h1>
        <p className="text-gray-500">
          {isSchool ? `${majors.length} 个本科专业` : `${(college.departments || []).length} 个学系 · ${majors.length} 个本科专业`}
        </p>
      </div>

      <div className="space-y-8">
        {isSchool ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {majors.map(major => (
                <Link
                  key={major.code}
                  to={`/major/${major.code}`}
                  className="group flex items-center gap-3 p-4 rounded-lg border border-gray-100 hover:border-cityu-accent hover:shadow-sm transition-all active:bg-gray-50"
                >
                  <GraduationCap className="w-5 h-5 text-gray-400 group-hover:text-cityu-accent transition-colors" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-800 group-hover:text-cityu-accent transition-colors truncate">
                      {major.title}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{major.code}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          (college.departments || []).map(dept => (
            <div key={dept.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-cityu-accent" />
                {dept.name}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {dept.majors.map(major => (
                  <Link
                    key={major.code}
                    to={`/major/${major.code}`}
                    className="group flex items-center gap-3 p-4 rounded-lg border border-gray-100 hover:border-cityu-accent hover:shadow-sm transition-all"
                  >
                    <GraduationCap className="w-5 h-5 text-gray-400 group-hover:text-cityu-accent transition-colors" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-800 group-hover:text-cityu-accent transition-colors truncate">
                        {major.title}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">{major.code}</div>
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
