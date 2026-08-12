import { Link } from 'react-router-dom'
import { ExternalLink, Microscope, Users } from 'lucide-react'
import type { AcademicProfile } from '../types'
import { useLanguage } from '../i18n/LanguageContext.tsx'
import { localizeAcademicProfile } from '../i18n/content.ts'

interface ResearchReferencePanelProps {
  profiles: AcademicProfile[]
  heading?: string
  description?: string
  compact?: boolean
}

export default function ResearchReferencePanel({
  profiles,
  heading,
  description,
  compact = false,
}: ResearchReferencePanelProps) {
  const { language, pick } = useLanguage()

  if (profiles.length === 0) {
    return null
  }

  const localizedHeading = heading ?? pick('科研参考', 'Research Reference')
  const localizedDescription = description ?? pick(
    '来自配套学术目录的相关 CityUHK 教师资料，可用于 FYP、RA、导师及研究课题探索。',
    'Related CityUHK academic profiles from the companion academic directory. Use this as a research reference for FYP, RA, supervisor, and topic exploration.',
  )

  return (
    <section className="surface-panel p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="font-bold text-gray-800 flex items-center gap-2">
            <Microscope className="w-5 h-5 text-cityu-accent" />
            {localizedHeading}
          </h2>
          <p className="mt-1 text-sm text-gray-500 leading-relaxed">{localizedDescription}</p>
        </div>
        <Link
          to="/academic"
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-cityu-accent hover:text-cityu-accent"
        >
          {pick('查看全部', 'Browse all')}
          <ExternalLink className="w-4 h-4" />
        </Link>
      </div>

      <div className={compact ? 'space-y-2' : 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3'}>
        {profiles.map((profile) => {
          const localizedProfile = localizeAcademicProfile(profile, language)
          return (
            <Link
              key={profile.id}
              to={`/academic/${profile.id}`}
              className="interactive-card block p-3"
            >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-bold text-sm text-gray-900 truncate">{localizedProfile.name}</div>
                {localizedProfile.nameCN ? <div className="text-xs text-gray-500">{localizedProfile.nameCN}</div> : null}
              </div>
              <span className="rounded bg-cityu-accent/10 px-2 py-0.5 text-xs font-semibold text-cityu-accent">
                {pick(`${profile.publicationCount} 篇`, `${profile.publicationCount} pubs`)}
              </span>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              {pick(profile.departmentName || profile.departmentNameEn, profile.departmentNameEn || profile.departmentName)}
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
              <Users className="w-3.5 h-3.5" />
              <span>{pick(`${profile.studentCount} 位公开学生`, `${profile.studentCount} public students`)}</span>
              {profile.ugWelcome ? <span className="text-emerald-700">{pick('欢迎本科生', 'UG welcome')}</span> : null}
            </div>
            {localizedProfile.interests.length ? (
              <div className="mt-2 line-clamp-2 text-xs leading-relaxed text-gray-600">
                {localizedProfile.interests.slice(0, 2).join(' / ')}
              </div>
            ) : null}
            </Link>
          )
        })}
      </div>
    </section>
  )
}
