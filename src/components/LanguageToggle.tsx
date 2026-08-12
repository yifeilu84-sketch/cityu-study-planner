import { Languages } from 'lucide-react'
import { useLanguage } from '../i18n/LanguageContext.tsx'

interface Props {
  compact?: boolean
}

export default function LanguageToggle({ compact = false }: Props) {
  const { language, setLanguage, pick } = useLanguage()

  return (
    <div
      className={`language-toggle ${compact ? 'language-toggle-compact' : ''}`}
      role="group"
      aria-label={pick('切换网站语言', 'Switch site language')}
    >
      <Languages className="language-toggle-icon" aria-hidden="true" />
      <button
        type="button"
        className={language === 'zh' ? 'language-toggle-active' : ''}
        onClick={() => setLanguage('zh')}
        aria-pressed={language === 'zh'}
        aria-label={pick('切换为中文', 'Switch to Chinese')}
        title={pick('切换为中文', 'Switch to Chinese')}
      >
        中
      </button>
      <button
        type="button"
        className={language === 'en' ? 'language-toggle-active' : ''}
        onClick={() => setLanguage('en')}
        aria-pressed={language === 'en'}
        aria-label={pick('切换为英文', 'Switch to English')}
        title={pick('切换为英文', 'Switch to English')}
      >
        EN
      </button>
    </div>
  )
}
