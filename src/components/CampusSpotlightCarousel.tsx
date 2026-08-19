import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Building2,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Landmark,
  Link2,
  Newspaper,
  Pause,
  Play,
  PlayCircle,
  Sparkles,
} from 'lucide-react'
import { campusSpotlights, localizeSpotlight, spotlightAsset } from '../data/campusSpotlights.ts'
import { useLanguage } from '../i18n/LanguageContext.tsx'

const AUTO_ADVANCE_MS = 6500
const DIRECTORY_ICONS = [Building2, GraduationCap, Landmark]

export default function CampusSpotlightCarousel() {
  const { language, pick } = useLanguage()
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const active = localizeSpotlight(campusSpotlights[activeIndex], language)

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (isPaused || prefersReducedMotion || campusSpotlights.length <= 1) return

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % campusSpotlights.length)
    }, AUTO_ADVANCE_MS)

    return () => window.clearInterval(timer)
  }, [isPaused])

  const goTo = (index: number) => {
    const next = (index + campusSpotlights.length) % campusSpotlights.length
    setActiveIndex(next)
  }

  return (
    <section className="campus-spotlight-hero" aria-label={pick('校园焦点新闻轮播', 'Campus spotlight news carousel')}>
      <div className="campus-spotlight-panel">
        <div className="spotlight-copy">
          <div className="section-eyebrow mb-3">
            <Newspaper className="h-4 w-4" />
            {pick('校园焦点', 'Campus spotlight')}
          </div>
          <div className="spotlight-kicker">{active.kicker}</div>
          <h1>{active.title}</h1>
          <p>{active.summary}</p>
          <div className="spotlight-tags" aria-label={pick('内容标签', 'Highlights')}>
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
              aria-label={isPaused ? pick('继续轮播', 'Resume carousel') : pick('暂停轮播', 'Pause carousel')}
            >
              {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <Link to={`/spotlight/${active.id}`} className={`spotlight-visual spotlight-visual-${active.kind}`}>
          {active.kind === 'demo' && active.video ? (
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
                <span>{pick('观看演示', 'Watch demo')}</span>
              </div>
            </div>
          ) : (
            <div className="spotlight-directory-preview">
              <div className="spotlight-directory-preview-heading">
                <span className="spotlight-directory-preview-mark">
                  <Link2 className="h-5 w-5" />
                </span>
                <div>
                  <span>{pick('CITYUHK 官方网站', 'OFFICIAL CITYUHK LINKS')}</span>
                  <strong>{pick('一页直达', 'One directory')}</strong>
                </div>
              </div>
              <div className="spotlight-directory-metrics">
                {active.metrics?.map((metric, index) => {
                  const MetricIcon = DIRECTORY_ICONS[index] ?? Link2
                  return (
                    <div key={metric.label}>
                      <MetricIcon className="h-5 w-5" />
                      <strong>{metric.value}</strong>
                      <span>{metric.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          <div className="spotlight-visual-caption">
            <Sparkles className="h-4 w-4" />
            {pick('点进来查看详情', 'Open story')}
          </div>
        </Link>
      </div>

      <div className="spotlight-carousel-controls">
        <button type="button" onClick={() => goTo(activeIndex - 1)} aria-label={pick('上一条新闻', 'Previous story')}>
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="spotlight-dots" role="tablist" aria-label={pick('校园焦点新闻', 'Campus spotlight slides')}>
          {campusSpotlights.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={index === activeIndex ? 'spotlight-dot-active' : ''}
              onClick={() => goTo(index)}
              aria-label={pick(`查看 ${item.title}`, `View ${localizeSpotlight(item, 'en').title}`)}
              aria-selected={index === activeIndex}
            />
          ))}
        </div>
        <button type="button" onClick={() => goTo(activeIndex + 1)} aria-label={pick('下一条新闻', 'Next story')}>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  )
}
