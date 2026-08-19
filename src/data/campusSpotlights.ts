export type SpotlightKind = 'demo' | 'directory'

export type SpotlightVideo = {
  src: string
  poster: string
  label: string
  labelEn?: string
}

export type SpotlightMetric = {
  value: string
  label: string
  labelEn?: string
}

export type CampusSpotlight = {
  id: string
  kind: SpotlightKind
  eyebrow: string
  title: string
  summary: string
  kicker: string
  cta: string
  detailLead: string
  tags: string[]
  video?: SpotlightVideo
  metrics?: SpotlightMetric[]
  notes: string[]
  eyebrowEn?: string
  titleEn?: string
  summaryEn?: string
  kickerEn?: string
  ctaEn?: string
  detailLeadEn?: string
  tagsEn?: string[]
  notesEn?: string[]
}

export const campusSpotlights: CampusSpotlight[] = [
  {
    id: 'site-demo-video',
    kind: 'demo',
    eyebrow: 'Product walkthrough',
    title: '3 分钟完整演示 Study Planner',
    summary: '慢速演示全站搜索、本科 study plan、毕业要求自检、DIY 编辑、GE 筛选、专业对比、硕博项目、科研参考和数据来源覆盖。',
    kicker: 'Site demo',
    cta: '观看使用演示',
    detailLead: '这段演示视频使用真实页面录制，按易于阅读的节奏展示从首页检索到专业规划、GE 选择、硕博目录、科研参考和来源核验的完整路径。',
    tags: ['全站搜索', 'GE 筛选', '专业对比', '硕博项目'],
    video: {
      src: 'spotlight/cityu-study-planner-demo.webm',
      poster: 'spotlight/cityu-study-planner-demo-poster.png',
      label: 'CityU Study Planner 使用演示视频',
      labelEn: 'CityU Study Planner product walkthrough',
    },
    notes: [
      '视频中的数据和页面会随网站持续更新；具体课程和毕业要求仍以页面中的来源标注与 CityUHK 官方资料为准。',
      '新生可以先看首页搜索、GE 选课助手和专业详情页；硕博同学可重点查看 postgraduate 与 academic directory。',
      '演示视频为浏览器实录，展示的是网站实际可操作流程。',
    ],
    eyebrowEn: 'Product walkthrough',
    titleEn: 'A complete three-minute Study Planner tour',
    summaryEn: 'A paced walkthrough of site-wide search, undergraduate plans, graduation checks, DIY editing, GE filters, programme comparison, postgraduate study, research reference, and source coverage.',
    kickerEn: 'Site demo',
    ctaEn: 'Watch the walkthrough',
    detailLeadEn: 'This recording uses the live website and gives each workflow enough time to read, from homepage search through programme planning, GE selection, postgraduate study, research reference, and source verification.',
    tagsEn: ['Site-wide search', 'GE filters', 'Major comparison', 'Postgraduate programmes'],
    notesEn: [
      'The site and its data continue to evolve. Always cross-check courses and graduation requirements against the source labels and official CityUHK information.',
      'New students can begin with homepage search, the GE Explorer, and undergraduate programme pages. Postgraduate users may prefer the postgraduate and academic directories.',
      'The video is a real browser recording of the website’s interactive workflows.',
    ],
  },
  {
    id: 'cityu-official-directory',
    kind: 'directory',
    eyebrow: 'Official CityUHK links',
    title: 'CityUHK 学院、学系、专业与行政部门导航',
    summary: '集中查找学院与学系官网、本科和硕博专业页面，以及行政与学生支援部门入口。所有链接只指向 CityUHK 官方域名。',
    kicker: 'Official directory',
    cta: '打开官网导航',
    detailLead: '按类别或关键词查找 CityUHK 官方网站。专业链接来自本科课程目录和硕博项目目录；行政单位如无独立公开网站，则明确链接至大学官方联络目录。',
    tags: ['学院与学系', '本科专业', '硕博项目', '行政与支援'],
    metrics: [
      { value: '11 + 30', label: '学院 / 学校与学术单位', labelEn: 'Colleges, schools & academic units' },
      { value: '63 + 102', label: '本科与硕博专业', labelEn: 'UG & postgraduate programmes' },
      { value: '36', label: '行政与支援单位', labelEn: 'Administrative & support units' },
    ],
    notes: [
      '本页以 CityUHK 官方学院与学系目录、本科招生及课程目录、硕博项目检索和行政部门目录为基准。',
      '独立官网与官方目录入口会分别标注；目录入口仍由 CityUHK 维护，并提供该部门的最新联络资料。',
      '专业名称和代码保留官网写法，便于与申请系统、课程目录和学院资料交叉核对。',
    ],
    eyebrowEn: 'Official CityUHK links',
    titleEn: 'CityUHK colleges, departments, programmes, and services',
    summaryEn: 'Find official college and department sites, undergraduate and postgraduate programme pages, and administrative or student-support services in one place.',
    kickerEn: 'Official directory',
    ctaEn: 'Open official directory',
    detailLeadEn: 'Search CityUHK official websites by category or keyword. Programme links come from the undergraduate catalogue and postgraduate directory; units without a standalone public site are clearly linked to the official university contact directory.',
    tagsEn: ['Colleges & departments', 'Undergraduate', 'Postgraduate', 'Administration'],
    notesEn: [
      'This page is based on CityUHK’s official academic directory, undergraduate admissions and catalogue, postgraduate programme search, and administrative directory.',
      'Standalone sites and official-directory entries are labelled separately. Directory entries remain maintained by CityUHK and provide current contact information.',
      'Official programme names and codes are retained for easier cross-checking with admissions and catalogue records.',
    ],
  },
]

export function getSpotlightById(id: string) {
  return campusSpotlights.find((item) => item.id === id)
}

export function localizeSpotlight(item: CampusSpotlight, language: 'zh' | 'en'): CampusSpotlight {
  if (language === 'zh') return item
  return {
    ...item,
    eyebrow: item.eyebrowEn ?? item.eyebrow,
    title: item.titleEn ?? item.title,
    summary: item.summaryEn ?? item.summary,
    kicker: item.kickerEn ?? item.kicker,
    cta: item.ctaEn ?? item.cta,
    detailLead: item.detailLeadEn ?? item.detailLead,
    tags: item.tagsEn ?? item.tags,
    notes: item.notesEn ?? item.notes,
    video: item.video ? { ...item.video, label: item.video.labelEn ?? item.video.label } : undefined,
    metrics: item.metrics?.map((metric) => ({ ...metric, label: metric.labelEn ?? metric.label })),
  }
}

export function spotlightAsset(src: string) {
  return `${import.meta.env.BASE_URL}${src}`
}
