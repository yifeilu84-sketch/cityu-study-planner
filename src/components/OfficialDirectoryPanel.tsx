import { useMemo, useState } from 'react'
import {
  BadgeCheck,
  BookOpen,
  Building2,
  ExternalLink,
  GraduationCap,
  Landmark,
  Network,
  Search,
} from 'lucide-react'
import { cityuOfficialDirectory } from '../data/cityuOfficialDirectory.ts'
import type { OfficialDirectoryLink } from '../data/cityuOfficialDirectory.ts'
import { useLanguage } from '../i18n/LanguageContext.tsx'

type DirectoryView = 'academic' | 'undergraduate' | 'postgraduate' | 'administration'

const normalize = (value: string | undefined) => (value ?? '').normalize('NFKC').toLocaleLowerCase()

const matchesQuery = (item: OfficialDirectoryLink, query: string) => {
  if (!query) return true
  return normalize([item.code, item.name, item.nameZh, item.college, item.department, item.detail].filter(Boolean).join(' ')).includes(query)
}

export default function OfficialDirectoryPanel() {
  const { language, pick } = useLanguage()
  const [activeView, setActiveView] = useState<DirectoryView>('academic')
  const [searchQuery, setSearchQuery] = useState('')
  const query = normalize(searchQuery.trim())

  const tabs: Array<{ id: DirectoryView; label: string; icon: typeof Building2; count: number }> = [
    {
      id: 'academic',
      label: pick('学院与学系', 'Academic units'),
      icon: Building2,
      count:
        cityuOfficialDirectory.academic.colleges.length +
        cityuOfficialDirectory.academic.colleges.reduce((total, college) => total + college.departments.length, 0) +
        cityuOfficialDirectory.academic.otherUnits.length,
    },
    {
      id: 'undergraduate',
      label: pick('本科专业', 'Undergraduate'),
      icon: GraduationCap,
      count: cityuOfficialDirectory.programmes.undergraduate.length,
    },
    {
      id: 'postgraduate',
      label: pick('硕博项目', 'Postgraduate'),
      icon: BookOpen,
      count: cityuOfficialDirectory.programmes.postgraduate.length,
    },
    {
      id: 'administration',
      label: pick('行政与支援', 'Administration'),
      icon: Landmark,
      count: cityuOfficialDirectory.administration.units.length,
    },
  ]

  const filteredColleges = useMemo(
    () =>
      cityuOfficialDirectory.academic.colleges
        .map((college) => {
          const collegeMatches = matchesQuery(college, query)
          const departments = collegeMatches ? college.departments : college.departments.filter((department) => matchesQuery(department, query))
          return { ...college, departments }
        })
        .filter((college) => matchesQuery(college, query) || college.departments.length > 0),
    [query],
  )

  const filteredOtherUnits = useMemo(
    () => cityuOfficialDirectory.academic.otherUnits.filter((unit) => matchesQuery(unit, query)),
    [query],
  )

  const filteredUndergraduate = useMemo(
    () => cityuOfficialDirectory.programmes.undergraduate.filter((programme) => matchesQuery(programme, query)),
    [query],
  )

  const filteredPostgraduate = useMemo(
    () => cityuOfficialDirectory.programmes.postgraduate.filter((programme) => matchesQuery(programme, query)),
    [query],
  )

  const filteredAdministration = useMemo(
    () => cityuOfficialDirectory.administration.units.filter((unit) => matchesQuery(unit, query)),
    [query],
  )

  const localizedName = (item: OfficialDirectoryLink) => (language === 'zh' && item.nameZh ? item.nameZh : item.name)
  const secondaryName = (item: OfficialDirectoryLink) => (language === 'zh' && item.nameZh ? item.name : undefined)

  const renderLink = (item: OfficialDirectoryLink, context?: string) => (
    <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className="official-directory-link-row">
      <span className="official-directory-link-main">
        {item.code ? <span className="official-directory-code">{item.code}</span> : null}
        <span className="official-directory-link-copy">
          <strong>{localizedName(item)}</strong>
          {secondaryName(item) ? <span>{secondaryName(item)}</span> : null}
          {context ? <span>{context}</span> : null}
        </span>
      </span>
      <span className={`official-directory-source official-directory-source-${item.linkKind ?? 'standalone-site'}`}>
        {item.linkKind === 'official-directory' ? pick('官方联络目录', 'Official directory') : pick('独立官网', 'Official site')}
      </span>
      <ExternalLink className="h-4 w-4" aria-hidden="true" />
    </a>
  )

  const renderProgrammeGroups = (programmes: OfficialDirectoryLink[]) => {
    const grouped = new Map<string, OfficialDirectoryLink[]>()
    for (const programme of programmes) {
      const group = programme.college || pick('其他项目', 'Other programmes')
      grouped.set(group, [...(grouped.get(group) ?? []), programme])
    }

    return [...grouped.entries()].map(([collegeName, items]) => {
      const college = cityuOfficialDirectory.academic.colleges.find((item) => item.name === collegeName)
      const heading = college && language === 'zh' ? college.nameZh ?? college.name : collegeName
      return (
        <section className="official-directory-programme-group" key={collegeName}>
          <div className="official-directory-group-heading">
            <h3>{heading}</h3>
            <span>{items.length}</span>
          </div>
          <div className="official-directory-link-list">
            {items.map((programme) =>
              renderLink(
                programme,
                [programme.department, language === 'zh' ? programme.detailZh ?? programme.detail : programme.detail].filter(Boolean).join(' · '),
              ),
            )}
          </div>
        </section>
      )
    })
  }

  const resultCount =
    activeView === 'academic'
      ? filteredColleges.length + filteredColleges.reduce((total, college) => total + college.departments.length, 0) + filteredOtherUnits.length
      : activeView === 'undergraduate'
        ? filteredUndergraduate.length
        : activeView === 'postgraduate'
          ? filteredPostgraduate.length
          : filteredAdministration.length

  return (
    <section className="official-directory" aria-labelledby="official-directory-heading">
      <div className="official-directory-intro">
        <div>
          <div className="section-eyebrow">
            <Network className="h-4 w-4" />
            {pick('CityUHK 官方入口', 'Official CityUHK gateways')}
          </div>
          <h2 id="official-directory-heading">{pick('从这里前往正确的官方网站', 'Go straight to the right official website')}</h2>
          <p>
            {pick(
              '按名称、专业代码、学院或学系搜索。全部链接来自 CityUHK 官方目录与课程资料。',
              'Search by name, programme code, college, or department. Every link comes from an official CityUHK directory or catalogue.',
            )}
          </p>
        </div>
        <div className="official-directory-verified">
          <BadgeCheck className="h-5 w-5" />
          <span>{pick('最后核对', 'Last checked')}</span>
          <strong>{cityuOfficialDirectory.verifiedAt}</strong>
        </div>
      </div>

      <div className="official-directory-gateways" aria-label={pick('官方总入口', 'Official gateway links')}>
        {cityuOfficialDirectory.gateways.map((gateway) => (
          <a key={gateway.id} href={gateway.url} target="_blank" rel="noreferrer">
            <span>{language === 'zh' ? gateway.nameZh : gateway.name}</span>
            <ExternalLink className="h-4 w-4" />
          </a>
        ))}
      </div>

      <div className="official-directory-toolbar">
        <div className="official-directory-tabs" role="tablist" aria-label={pick('官网分类', 'Directory categories')}>
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeView === tab.id}
                className={activeView === tab.id ? 'official-directory-tab-active' : ''}
                onClick={() => setActiveView(tab.id)}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
                <small>{tab.count}</small>
              </button>
            )
          })}
        </div>
        <label className="official-directory-search">
          <Search className="h-4 w-4" />
          <span className="sr-only">{pick('搜索官网', 'Search official links')}</span>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={pick('搜索名称、代码、学院或学系', 'Search name, code, college, or department')}
          />
          <span>{resultCount}</span>
        </label>
      </div>

      <div className="official-directory-results" role="tabpanel">
        {activeView === 'academic' ? (
          <div className="official-directory-academic-list">
            {filteredColleges.map((college) => (
              <section className="official-directory-college" key={college.id}>
                <div className="official-directory-college-heading">
                  <div>
                    <span>{pick('学院 / 学校', 'College / school')}</span>
                    <h3>{localizedName(college)}</h3>
                    {secondaryName(college) ? <p>{secondaryName(college)}</p> : null}
                  </div>
                  <a href={college.url} target="_blank" rel="noreferrer" aria-label={pick(`打开${localizedName(college)}官网`, `Open ${college.name}`)}>
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
                {college.departments.length ? <div className="official-directory-link-list">{college.departments.map((unit) => renderLink(unit))}</div> : null}
              </section>
            ))}
            {filteredOtherUnits.length ? (
              <section className="official-directory-college">
                <div className="official-directory-college-heading">
                  <div>
                    <span>{pick('其他学术单位', 'Other academic units')}</span>
                    <h3>{pick('跨学院学术入口', 'University-wide academic units')}</h3>
                  </div>
                </div>
                <div className="official-directory-link-list">{filteredOtherUnits.map((unit) => renderLink(unit))}</div>
              </section>
            ) : null}
          </div>
        ) : null}

        {activeView === 'undergraduate' ? renderProgrammeGroups(filteredUndergraduate) : null}
        {activeView === 'postgraduate' ? renderProgrammeGroups(filteredPostgraduate) : null}
        {activeView === 'administration' ? (
          <div className="official-directory-admin-list">{filteredAdministration.map((unit) => renderLink(unit))}</div>
        ) : null}

        {resultCount === 0 ? (
          <div className="official-directory-empty">
            <Search className="h-6 w-6" />
            <strong>{pick('没有匹配结果', 'No matching links')}</strong>
            <span>{pick('试试专业代码、英文名称或学院名称。', 'Try a programme code, official English name, or college name.')}</span>
          </div>
        ) : null}
      </div>
    </section>
  )
}
