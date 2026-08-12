import { X } from 'lucide-react'
import { getCategoryColor, getCategoryLabel } from '../utils/studyPlan'
import { useLanguage } from '../i18n/LanguageContext.tsx'

interface Props {
  code: string
  title: string
  credits: number
  category: string
  onClick?: () => void
  onRemove?: () => void
  isDraggable?: boolean
}

export default function CourseBadge({ code, title, credits, category, onClick, onRemove, isDraggable }: Props) {
  const { language, pick } = useLanguage()

  return (
    <div
      className={`w-full text-left p-2.5 rounded-lg border text-sm transition-all hover:shadow-md active:scale-[0.98] ${
        isDraggable ? 'cursor-grab active:cursor-grabbing' : ''
      } ${getCategoryColor(category)} relative group`}
    >
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          className="absolute top-1 right-1 p-1 bg-white/80 rounded-full opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-red-100"
          title={pick('移除课程', 'Remove course')}
          aria-label={pick(`移除 ${title}`, `Remove ${title}`)}
        >
          <X className="w-3.5 h-3.5 text-red-500" />
        </button>
      )}
      <button onClick={onClick} className="w-full text-left">
        <div className="font-bold text-xs mb-0.5">{code}</div>
        <div className="text-xs leading-tight line-clamp-2">{title}</div>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[10px] opacity-70">{credits} {pick('学分', 'CU')}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/50">{getCategoryLabel(category, language)}</span>
        </div>
      </button>
    </div>
  )
}
