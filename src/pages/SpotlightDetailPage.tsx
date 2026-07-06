import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ExternalLink, MessageCircle, Newspaper, PlayCircle, Sparkles, Users } from 'lucide-react'
import { getSpotlightById, spotlightAsset } from '../data/campusSpotlights.ts'

export default function SpotlightDetailPage() {
  const { spotlightId } = useParams<{ spotlightId: string }>()
  const spotlight = spotlightId ? getSpotlightById(spotlightId) : undefined

  if (!spotlight) {
    return (
      <div className="surface-panel p-6 text-center">
        <h1 className="text-2xl font-bold text-cityu-dark">News item not found</h1>
        <Link to="/" className="mt-4 inline-flex items-center gap-2 text-cityu-accent hover:underline">
          <ArrowLeft className="h-4 w-4" />
          返回首页
        </Link>
      </div>
    )
  }

  return (
    <article className="spotlight-detail">
      <Link to="/" className="inline-flex items-center gap-1 text-gray-500 hover:text-cityu-accent mb-4 sm:mb-6 transition-colors text-sm sm:text-base">
        <ArrowLeft className="w-4 h-4" />
        返回首页
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

      {spotlight.images?.length ? (
        <section className="spotlight-detail-section">
          <div className="spotlight-section-heading">
            <Sparkles className="h-5 w-5" />
            <h2>OCamp 小组海报</h2>
          </div>
          <div className="spotlight-poster-grid">
            {spotlight.images.map((image) => (
              <a key={image.src} href={spotlightAsset(image.src)} target="_blank" rel="noreferrer" className="spotlight-poster-card">
                <img src={spotlightAsset(image.src)} alt={image.alt} />
              </a>
            ))}
          </div>
        </section>
      ) : null}

      {spotlight.video ? (
        <section className="spotlight-detail-section">
          <div className="spotlight-section-heading">
            <PlayCircle className="h-5 w-5" />
            <h2>网站使用演示</h2>
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

      {spotlight.accounts?.length ? (
        <section className="spotlight-detail-section">
          <div className="spotlight-section-heading">
            <MessageCircle className="h-5 w-5" />
            <h2>公众号入口</h2>
          </div>
          <div className="wechat-account-grid">
            {spotlight.accounts.map((account) => (
              <div key={account.name} className="wechat-account-card">
                <span className="wechat-account-icon">
                  {account.name.includes('CSSAUG') ? <Users className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
                </span>
                <div>
                  <h3>{account.name}</h3>
                  <p className="wechat-account-audience">{account.audience}</p>
                  <p>{account.description}</p>
                  <div className="wechat-search-box">{account.wechat}</div>
                  {account.sourceUrl ? (
                    <a href={account.sourceUrl} target="_blank" rel="noreferrer" className="wechat-source-link">
                      参考官方/组织页面
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="spotlight-detail-section">
        <div className="spotlight-section-heading">
          <Sparkles className="h-5 w-5" />
          <h2>补充说明</h2>
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
