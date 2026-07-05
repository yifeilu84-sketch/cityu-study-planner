import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, BookOpen, ExternalLink, GraduationCap, Microscope, Users } from 'lucide-react'
import academicProfilesJson from '../data/academic-profiles.json'
import type { AcademicProfilesData } from '../types'

const academicData = academicProfilesJson as AcademicProfilesData

function sourceLinks(profile: NonNullable<AcademicProfilesData['profiles'][number]>) {
  return [
    { label: 'Official profile', url: profile.url },
    { label: 'CityU Scholars', url: profile.scholarUrl },
    { label: 'Google Scholar', url: profile.googleScholar },
    { label: 'Department', url: profile.departmentUrl },
  ].filter((item): item is { label: string; url: string } => Boolean(item.url))
}

export default function AcademicProfilePage() {
  const { profileId } = useParams()
  const profile = academicData.profiles.find((item) => item.id === profileId)

  if (!profile) {
    return (
      <div className="space-y-4">
        <Link to="/academic" className="inline-flex items-center gap-1 text-gray-500 hover:text-cityu-accent transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" />
          Back to academic directory
        </Link>
        <section className="surface-panel p-6 text-center text-gray-500">
          Academic profile not found.
        </section>
      </div>
    )
  }

  const links = sourceLinks(profile)

  return (
    <div className="space-y-5">
      <Link to="/academic" className="inline-flex items-center gap-1 text-gray-500 hover:text-cityu-accent transition-colors text-sm">
        <ArrowLeft className="w-4 h-4" />
        Back to academic directory
      </Link>

      <section className="surface-panel p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="rounded bg-cityu-accent/10 px-2 py-0.5 text-xs font-bold text-cityu-accent">
                {profile.departmentNameEn || profile.departmentName}
              </span>
              {profile.ugWelcome ? (
                <span className="rounded border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                  Undergraduate projects welcome
                </span>
              ) : null}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-cityu-dark">{profile.name}</h1>
            {profile.nameCN ? <p className="mt-1 text-gray-500">{profile.nameCN}</p> : null}
            {profile.title ? <p className="mt-3 text-sm sm:text-base text-gray-700 max-w-4xl leading-relaxed">{profile.title}</p> : null}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:min-w-[220px]">
            <div className="metric-card text-center">
              <div className="metric-value">{profile.studentCount}</div>
              <div className="metric-label">Students</div>
            </div>
            <div className="metric-card text-center">
              <div className="metric-value">{profile.publicationCount}</div>
              <div className="metric-label">Papers</div>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div>
            <div className="text-xs uppercase text-gray-400">College / School</div>
            <div className="font-medium text-gray-800">{profile.collegeNameEn || profile.collegeName}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-gray-400">Department</div>
            <div className="font-medium text-gray-800">{profile.departmentNameEn || profile.departmentName}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-gray-400">Source</div>
            <div className="font-medium text-gray-800">{academicData.summary.sourceRepository}</div>
          </div>
        </div>

        {profile.background ? (
          <p className="mt-5 rounded-lg border border-gray-100 bg-gray-50 p-4 text-sm leading-relaxed text-gray-700">
            {profile.background}
          </p>
        ) : null}
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.9fr)] gap-5">
        <div className="space-y-5">
          <section className="surface-panel p-4 sm:p-5">
            <h2 className="font-bold text-gray-800 flex items-center gap-2 mb-3">
              <Microscope className="w-5 h-5 text-cityu-accent" />
              Research Interests
            </h2>
            {profile.interests.length ? (
              <div className="space-y-2">
                {profile.interests.map((interest) => (
                  <div key={interest} className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm leading-relaxed text-gray-700">
                    {interest}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No structured research interests are available in the imported source.</p>
            )}
          </section>

          <section className="surface-panel p-4 sm:p-5">
            <h2 className="font-bold text-gray-800 flex items-center gap-2 mb-3">
              <BookOpen className="w-5 h-5 text-cityu-accent" />
              Representative Publications
            </h2>
            {profile.topPublications.length ? (
              <div className="space-y-3">
                {profile.topPublications.map((publication, index) => {
                  const content = (
                    <>
                      <div className="font-semibold text-gray-800">{publication.title}</div>
                      <div className="mt-1 text-xs text-gray-500">
                        {[publication.journal, publication.year, publication.cites != null ? `${publication.cites} cites` : ''].filter(Boolean).join(' · ')}
                      </div>
                    </>
                  )

                  return publication.url ? (
                    <a
                      key={`${publication.title}-${index}`}
                      href={publication.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="interactive-card block p-3"
                    >
                      {content}
                    </a>
                  ) : (
                    <div key={`${publication.title}-${index}`} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                      {content}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No representative publications are available in the imported source.</p>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <section className="surface-panel p-4">
            <h2 className="font-bold text-gray-800 flex items-center gap-2 mb-3">
              <Users className="w-5 h-5 text-cityu-accent" />
              Public Student Topics
            </h2>
            {profile.students.length ? (
              <div className="space-y-2">
                {profile.students.map((student) => (
                  <div key={`${student.name}-${student.topic}`} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                    <div className="font-semibold text-sm text-gray-800">{student.name}</div>
                    {student.topic ? <div className="mt-1 text-xs text-gray-500 leading-relaxed">{student.topic}</div> : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No public student-topic entries are available.</p>
            )}
          </section>

          <section className="surface-panel p-4">
            <h2 className="font-bold text-gray-800 flex items-center gap-2 mb-3">
              <GraduationCap className="w-5 h-5 text-cityu-accent" />
              Sources
            </h2>
            <div className="space-y-2">
              {links.map((link) => (
                <a
                  key={`${link.label}-${link.url}`}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="interactive-card flex items-start justify-between gap-2 p-3 text-sm"
                >
                  <span className="font-medium text-gray-700">{link.label}</span>
                  <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0" />
                </a>
              ))}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-gray-500">
              Data is imported from the companion academic directory and should be used as a research reference.
            </p>
          </section>
        </aside>
      </section>
    </div>
  )
}
