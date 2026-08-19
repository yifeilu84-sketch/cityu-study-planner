import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Newspaper, PlayCircle, Sparkles } from 'lucide-react'
import OfficialDirectoryPanel from '../components/OfficialDirectoryPanel.tsx'
import { getSpotlightById, localizeSpotlight, spotlightAsset } from '../data/campusSpotlights.ts'
import { useLanguage } from '../i18n/LanguageContext.tsx'

export default function SpotlightDetailPage() {
  const { language, pick } = useLanguage()
  const { spotlightId } = useParams<{ spotlightId: string }>()
  const sourceSpotlight = spotlightId ? getSpotlightById(spotlightId) : undefined
  const spotlight = sourceSpotlight ? localizeSpotlight(sourceSpotlight, language) : undefined

  if (!spotlight) {
    return (
      <div className="surface-panel p-6 text-center">
        <h1 className="text-2xl font-bold text-cityu-dark">{pick('未找到这条新闻', 'News item not found')}</h1>
        <Link to="/" className="mt-4 inline-flex items-center gap-2 text-cityu-accent hover:underline">
          <ArrowLeft className="h-4 w-4" />
          {pick('返回首页', 'Back to Home')}
        </Link>
      </div>
    )
  }

  return (
    <article className="spotlight-detail">
      <Link to="/" className="inline-flex items-center gap-1 text-gray-500 hover:text-cityu-accent mb-4 sm:mb-6 transition-colors text-sm sm:text-base">
        <ArrowLeft className="w-4 h-4" />
        {pick('返回首页', 'Back to Home')}
      </Link>

      <header className={`spotlight-detail-hero spotlight-detail-hero-${spotlight.kind}`}>
        <div className="section-eyebrow mb-3">
          <Newspaper className="h-4 w-4" />
          {spotlight.eyebrow}
        </div>
        <h1>{spotlight.title}</h1>
        <p>{spotlight.detailLead}</p>
        <div className="spotlight-tags">
          {spotlight.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      </header>

      {spotlight.video ? (
        <section className="spotlight-detail-section">
          <div className="spotlight-section-heading">
            <PlayCircle className="h-5 w-5" />
            <h2>{pick('网站使用演示', 'Website Walkthrough')}</h2>
          </div>
          <div className="spotlight-detail-video">
            <video
              src={spotlightAsset(spotlight.video.src)}
              poster={spotlightAsset(spotlight.video.poster)}
              controls
              playsInline
              preload="metadata"
              aria-label={spotlight.video.label}
            />
          </div>
        </section>
      ) : null}

      {spotlight.kind === 'directory' ? <OfficialDirectoryPanel /> : null}

      <section className="spotlight-detail-section">
        <div className="spotlight-section-heading">
          <Sparkles className="h-5 w-5" />
          <h2>{pick('补充说明', 'Additional Notes')}</h2>
        </div>
        <div className="spotlight-note-list">
          {spotlight.notes.map((note) => (
            <div key={note}>{note}</div>
          ))}
        </div>
      </section>
    </article>
  )
}
