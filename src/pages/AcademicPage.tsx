import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, ExternalLink, Microscope, Search, Users } from 'lucide-react'
import academicProfilesJson from '../data/academic-profiles.json'
import type { AcademicProfilesData } from '../types'
import { searchAcademicProfiles } from '../utils/academicProfiles.ts'

const academicData = academicProfilesJson as AcademicProfilesData

export default function AcademicPage() {
  const [search, setSearch] = useState('')
  const [collegeId, setCollegeId] = useState('all')
  const [departmentId, setDepartmentId] = useState('all')
  const [ugOnly, setUgOnly] = useState(false)

  const departments = useMemo(() => {
    const selectedCollege = academicData.colleges.find((college) => college.id === collegeId)
    return selectedCollege
      ? selectedCollege.departments
      : academicData.colleges.flatMap((college) => college.departments)
  }, [collegeId])

  const visibleProfiles = useMemo(() => searchAcademicProfiles(academicData.profiles, search, {
    limit: search.trim() ? 80 : 36,
    collegeId: collegeId === 'all' ? undefined : collegeId,
    departmentId: departmentId === 'all' ? undefined : departmentId,
    ugOnly,
  }), [collegeId, departmentId, search, ugOnly])

  const resetDepartment = (nextCollegeId: string) => {
    setCollegeId(nextCollegeId)
    setDepartmentId('all')
  }

  return (
    <div className="space-y-5">
      <section className="dashboard-hero p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <div className="section-eyebrow mb-2">
              <Microscope className="w-4 h-4" />
              Research Reference
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-cityu-dark">CityUHK Academic Directory</h1>
            <p className="mt-2 text-sm text-gray-600 max-w-3xl leading-relaxed">
              Professor, research-interest, student, and publication references imported from the companion cityuhk-academic repository.
              This page is for research exploration and supervisor/topic discovery, not programme requirement verification.
            </p>
          </div>
          <a
            href={academicData.summary.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-cityu-dark px-4 py-2.5 text-sm font-semibold text-white hover:bg-cityu-purple transition-colors"
          >
            Open original site
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        <div className="mt-5 grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="metric-card">
            <div className="metric-value">{academicData.summary.collegeCount}</div>
            <div className="metric-label">Colleges</div>
          </div>
          <div className="metric-card">
            <div className="metric-value">{academicData.summary.departmentCount}</div>
            <div className="metric-label">Departments</div>
          </div>
          <div className="metric-card">
            <div className="metric-value">{academicData.summary.professorCount}</div>
            <div className="metric-label">Professors</div>
          </div>
          <div className="metric-card">
            <div className="metric-value">{academicData.summary.studentCount}</div>
            <div className="metric-label">Students</div>
          </div>
          <div className="metric-card">
            <div className="metric-value">{academicData.summary.publicationCount}</div>
            <div className="metric-label">Publications</div>
          </div>
        </div>
      </section>

      <section className="control-surface">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_220px_220px_auto] gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search professor, research area, department, publication..."
              className="w-full rounded-lg border border-gray-200 py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-cityu-accent"
            />
          </div>
          <select
            value={collegeId}
            onChange={(event) => resetDepartment(event.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cityu-accent"
          >
            <option value="all">All colleges</option>
            {academicData.colleges.map((college) => (
              <option key={college.id} value={college.id}>{college.nameEn || college.name}</option>
            ))}
          </select>
          <select
            value={departmentId}
            onChange={(event) => setDepartmentId(event.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cityu-accent"
          >
            <option value="all">All departments</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>{department.nameEn || department.name}</option>
            ))}
          </select>
          <label className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={ugOnly}
              onChange={(event) => setUgOnly(event.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-cityu-accent focus:ring-cityu-accent"
            />
            UG welcome
          </label>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-5">
        <aside className="surface-panel p-4 h-fit">
          <h2 className="font-bold text-gray-800 mb-3">Academic Units</h2>
          <div className="space-y-2">
            {academicData.colleges.map((college) => (
              <button
                key={college.id}
                type="button"
                onClick={() => resetDepartment(college.id)}
                className={`w-full rounded-lg border p-3 text-left transition-colors ${
                  collegeId === college.id
                    ? 'border-cityu-accent bg-cityu-accent/5'
                    : 'interactive-card hover:text-cityu-accent'
                }`}
              >
                <div className="font-semibold text-sm text-gray-800">{college.nameEn || college.name}</div>
                <div className="mt-1 text-xs text-gray-500">
                  {college.departments.length} departments · {college.departments.reduce((sum, department) => sum + department.profileIds.length, 0)} profiles
                </div>
              </button>
            ))}
          </div>
        </aside>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-bold text-gray-800">{visibleProfiles.length} matching profiles</h2>
            <span className="text-xs text-gray-500">Source: {academicData.summary.sourceRepository}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {visibleProfiles.map((profile) => (
              <Link
                key={profile.id}
                to={`/academic/${profile.id}`}
                className="interactive-card block p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-bold text-gray-900 truncate">{profile.name}</div>
                    {profile.nameCN ? <div className="text-xs text-gray-500">{profile.nameCN}</div> : null}
                  </div>
                  {profile.ugWelcome ? (
                    <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">UG</span>
                  ) : null}
                </div>
                {profile.title ? <p className="mt-2 text-sm text-gray-700 line-clamp-2">{profile.title}</p> : null}
                <div className="mt-3 text-xs text-gray-500">{profile.departmentNameEn || profile.departmentName}</div>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                  <span className="inline-flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {profile.studentCount}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5" />
                    {profile.publicationCount}
                  </span>
                </div>
                {profile.interests?.length ? (
                  <p className="mt-3 text-xs leading-relaxed text-gray-600 line-clamp-3">
                    {profile.interests.slice(0, 2).join(' / ')}
                  </p>
                ) : null}
                <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-cityu-accent">
                  View profile
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </Link>
            ))}
          </div>

          {visibleProfiles.length === 0 ? (
            <div className="surface-panel border-dashed p-8 text-center text-sm text-gray-500">
              No matching academic profiles. Try a broader research keyword or reset the filters.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  )
}
