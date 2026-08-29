import { X } from 'lucide-react'
import { getCategoryColor, getCategoryLabel } from '../utils/studyPlan'
import { useLanguage } from '../i18n/LanguageContext.tsx'

interface Props {
  code: string
  title: string
  credits: number
  category: string
  officialPlacement?: string
  onClick?: () => void
  onRemove?: () => void
  isDraggable?: boolean
}

const placementTranslations: Record<string, string> = {
  'Year 1 Semester A or B': '官方：大一 Semester A 或 B',
  'Year 2 or 3 Summer': '官方：大二或大三暑期',
  'Year 3 Semester A or B': '官方：大三 Semester A 或 B',
  'Year 4 Semester A or B': '官方：大四 Semester A 或 B',
  'Year 4 Semesters A and B': '官方：跨大四 Semester A 与 B',
}

export default function CourseBadge({ code, title, credits, category, officialPlacement, onClick, onRemove, isDraggable }: Props) {
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
        {officialPlacement && (
          <div className="mt-1.5 border-t border-current/10 pt-1.5 text-[10px] font-medium leading-4 opacity-80">
            {pick(placementTranslations[officialPlacement] || `官方安排：${officialPlacement}`, `Official: ${officialPlacement}`)}
          </div>
        )}
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[10px] opacity-70">{credits} {pick('学分', 'CU')}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/50">{getCategoryLabel(category, language)}</span>
        </div>
      </button>
    </div>
  )
}
