import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ChevronLeft, ChevronRight, MessageCircle, Newspaper, Pause, Play, PlayCircle, Sparkles, Users } from 'lucide-react'
import { campusSpotlights, spotlightAsset } from '../data/campusSpotlights.ts'

const AUTO_ADVANCE_MS = 6500

export default function CampusSpotlightCarousel() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const active = campusSpotlights[activeIndex]

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (isPaused || prefersReducedMotion || campusSpotlights.length <= 1) return

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % campusSpotlights.length)
    }, AUTO_ADVANCE_MS)

    return () => window.clearInterval(timer)
  }, [isPaused])

  const previewImages = useMemo(() => {
    if (active.images?.length) return active.images.slice(0, 4)
    return []
  }, [active])

  const goTo = (index: number) => {
    const next = (index + campusSpotlights.length) % campusSpotlights.length
    setActiveIndex(next)
  }

  return (
    <section className="campus-spotlight-hero" aria-label="Campus spotlight news carousel">
      <div className="campus-spotlight-panel">
        <div className="spotlight-copy">
          <div className="section-eyebrow mb-3">
            <Newspaper className="h-4 w-4" />
            Campus spotlight
          </div>
          <div className="spotlight-kicker">{active.kicker}</div>
          <h1>{active.title}</h1>
          <p>{active.summary}</p>
          <div className="spotlight-tags" aria-label="Highlights">
            {active.tags.slice(0, 4).map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
          <div className="spotlight-actions">
            <Link to={`/spotlight/${active.id}`} className="spotlight-primary-action">
              {active.cta}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              type="button"
              className="spotlight-icon-action"
              onClick={() => setIsPaused((value) => !value)}
              aria-label={isPaused ? '继续轮播' : '暂停轮播'}
            >
              {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <Link to={`/spotlight/${active.id}`} className={`spotlight-visual spotlight-visual-${active.kind}`}>
          {active.kind === 'ocamp' ? (
            <div className="spotlight-image-grid">
              {previewImages.map((image, index) => (
                <img
                  key={image.src}
                  src={spotlightAsset(image.src)}
                  alt={image.alt}
                  className={`spotlight-image-tile spotlight-image-tile-${index + 1}`}
                />
              ))}
            </div>
          ) : active.kind === 'demo' && active.video ? (
            <div className="spotlight-demo-frame">
              <video
                src={spotlightAsset(active.video.src)}
                poster={spotlightAsset(active.video.poster)}
                muted
                loop
                playsInline
                autoPlay
                preload="metadata"
                aria-label={active.video.label}
              />
              <div className="spotlight-demo-play">
                <PlayCircle className="h-9 w-9" />
                <span>Watch demo</span>
              </div>
            </div>
          ) : (
            <div className="wechat-preview-board">
              {active.accounts?.map((account) => (
                <div key={account.name} className="wechat-preview-card">
                  <span className="wechat-preview-icon">
                    {account.name.includes('CSSAUG') ? <Users className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
                  </span>
                  <div>
                    <div className="wechat-preview-name">{account.name}</div>
                    <div className="wechat-preview-audience">{account.audience}</div>
                    <div className="wechat-preview-search">{account.wechat}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="spotlight-visual-caption">
            <Sparkles className="h-4 w-4" />
            点进来看详情
          </div>
        </Link>
      </div>

      <div className="spotlight-carousel-controls">
        <button type="button" onClick={() => goTo(activeIndex - 1)} aria-label="上一条新闻">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="spotlight-dots" role="tablist" aria-label="Campus spotlight slides">
          {campusSpotlights.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={index === activeIndex ? 'spotlight-dot-active' : ''}
              onClick={() => goTo(index)}
              aria-label={`查看 ${item.title}`}
              aria-selected={index === activeIndex}
            />
          ))}
        </div>
        <button type="button" onClick={() => goTo(activeIndex + 1)} aria-label="下一条新闻">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  )
}
