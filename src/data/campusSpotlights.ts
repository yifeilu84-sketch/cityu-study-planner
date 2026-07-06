export type SpotlightKind = 'ocamp' | 'cssa'

export type SpotlightImage = {
  src: string
  alt: string
}

export type SpotlightAccount = {
  name: string
  audience: string
  description: string
  wechat: string
  sourceUrl?: string
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
  images?: SpotlightImage[]
  accounts?: SpotlightAccount[]
  notes: string[]
}

export const campusSpotlights: CampusSpotlight[] = [
  {
    id: 'ocamp-groups',
    kind: 'ocamp',
    eyebrow: 'OCamp 2026',
    title: '我会去参加的 OCamp 小组，欢迎来报名',
    summary: '格兰芬多、斯莱特林、赫奇帕奇小组集合。新生可以提前认识组爸组妈，顺手拿到 Study Planner 内测资源。',
    kicker: 'Freshers bulletin',
    cta: '查看 OCamp 小组',
    detailLead: '这几组是我会去参加/协助的新生 OCamp 小组。想提前认识同学、问选课、问 GE、问专业路线，欢迎报名加入这些组。',
    tags: ['校内知识百科全书', '内测版资源抢先体验', '选课避坑', '新生互助'],
    images: [
      {
        src: 'spotlight/ocamp-glenfen-join-us.jpg',
        alt: '格兰芬多 OCamp 小组招募海报',
      },
      {
        src: 'spotlight/ocamp-slytherin-profile.jpg',
        alt: '斯莱特林 OCamp 小组成员介绍海报',
      },
      {
        src: 'spotlight/ocamp-hufflepuff-profile.jpg',
        alt: '赫奇帕奇 OCamp 小组成员介绍海报',
      },
      {
        src: 'spotlight/ocamp-slytherin-green.jpg',
        alt: '斯莱特林 OCamp 小组绿色主题成员介绍海报',
      },
    ],
    notes: [
      '报名这些组，可以优先体验 Study Planner 的内测功能和新生资源整理。',
      '可以直接问我课程规划、GE 选择、专业要求、科研入口和 CityU 常见问题。',
      '海报中的小组信息以 OCamp 官方报名安排为准。',
    ],
  },
  {
    id: 'cssa-cssaug-wechat',
    kind: 'cssa',
    eyebrow: 'Student community',
    title: '关注 CityU CSSA / CSSAUG 微信公众号',
    summary: 'CSSA 与 CSSAUG 是城大内地学生常用的信息入口之一，适合新生了解迎新、活动、生活服务和校内资讯。',
    kicker: 'WeChat channels',
    cta: '查看公众号介绍',
    detailLead: '如果你刚来 CityU，建议把 CSSA 和 CSSAUG 的公众号都加上。一个更偏全体中国学生学者服务与活动资讯，一个更贴近本科新生生活和迎新活动。',
    tags: ['迎新活动', '生活服务', '校内资讯', '本科新生入口'],
    accounts: [
      {
        name: '香港城市大学 CSSA',
        audience: '本科、硕士、博士与学者均可关注',
        description: '香港城市大学中国学生学者联合会，常发布迎新、讲座、就业、文化和生活类信息。',
        wechat: '微信搜索：香港城市大学CSSA',
        sourceUrl: 'https://hk.linkedin.com/company/chinese-students-and-scholars-association-at-cityuhk',
      },
      {
        name: 'CSSAUG@CityU',
        audience: '更适合本科新生重点关注',
        description: '香港城市大学内地学生学者联谊会本科部，常见于本科迎新、文化活动和新生服务场景。',
        wechat: '微信搜索：CSSAUG@CityU / 香港城市大学内地学生学者联谊会本科部',
        sourceUrl: 'https://www.facebook.com/cssaugcityu/',
      },
    ],
    notes: [
      '微信内搜索账号名称即可关注；如公众号名称调整，请以微信搜索结果和组织官方页面为准。',
      '这些组织的信息适合作为校园生活参考，课程规划仍以本网站数据和学校官方要求交叉核对。',
    ],
  },
]

export function getSpotlightById(id: string) {
  return campusSpotlights.find((item) => item.id === id)
}

export function spotlightAsset(src: string) {
  return `${import.meta.env.BASE_URL}${src}`
}
