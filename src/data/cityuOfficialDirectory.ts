import academicProfilesJson from './academic-profiles.json' with { type: 'json' }
import allMajorsJson from './all-majors.json' with { type: 'json' }
import postgraduateProgrammesJson from './postgraduate-programmes.json' with { type: 'json' }

export type OfficialLinkKind = 'standalone-site' | 'official-directory'

export type OfficialDirectoryLink = {
  id: string
  name: string
  nameZh?: string
  url: string
  code?: string
  college?: string
  department?: string
  detail?: string
  detailZh?: string
  linkKind?: OfficialLinkKind
}

export type OfficialAcademicCollege = OfficialDirectoryLink & {
  departments: OfficialDirectoryLink[]
}

type AcademicProfilesSource = {
  colleges: Array<{
    id: string
    name: string
    nameEn: string
    url: string
    departments: Array<{
      id: string
      name: string
      nameEn: string
      url: string
    }>
  }>
}

type UndergraduateProgrammeSource = {
  code: string
  title: string
  url: string
  degree: string
  college: string
  department: string
}

type PostgraduateProgrammeSource = {
  code: string
  title: string
  url: string
  award: string
  type: string
  college: string
  department: string
}

const ADMIN_DIRECTORY_URL = 'https://www.cityu.edu.hk/en/directories/admin'
const ACADEMIC_DIRECTORY_URL = 'https://www.cityu.edu.hk/academic/colleges-schools-and-departments'
const ACADEMIC_URL_OVERRIDES: Record<string, string> = {
  'college-comp': 'https://www.cityu.edu.hk/cc/',
  'dept-class-en': 'https://www.en.cityu.edu.hk/',
}

const academicProfiles = academicProfilesJson as AcademicProfilesSource
const undergraduateProgrammeSource = allMajorsJson as UndergraduateProgrammeSource[]
const postgraduateProgrammeSource = postgraduateProgrammesJson as PostgraduateProgrammeSource[]

const colleges: OfficialAcademicCollege[] = academicProfiles.colleges.map((college) => ({
  id: college.id,
  name: college.nameEn,
  nameZh: college.name,
  url: ACADEMIC_URL_OVERRIDES[college.id] ?? college.url,
  linkKind: 'standalone-site',
  departments: college.departments
    .filter((department) => department.nameEn !== college.nameEn)
    .map((department) => ({
      id: department.id,
      name: department.nameEn,
      nameZh: department.name,
      url: ACADEMIC_URL_OVERRIDES[department.id] ?? department.url,
      linkKind: 'standalone-site',
    })),
}))

const classCollege = colleges.find((college) => college.name === 'College of Liberal Arts and Social Sciences')
if (classCollege && !classCollege.departments.some((unit) => unit.id === 'academic-language-centre')) {
  classCollege.departments.push({
    id: 'academic-language-centre',
    name: 'Chan Feng Men-ling Chan Shuk-lin Language Centre',
    nameZh: '陈凤梅灵陈淑莲语文中心',
    url: 'https://www.cityu.edu.hk/lc/',
    linkKind: 'standalone-site',
  })
}

colleges.push({
  id: 'college-sgs',
  name: 'Chow Yei Ching School of Graduate Studies',
  nameZh: '周亦卿研究生院',
  url: 'https://www.cityu.edu.hk/en/sgs/',
  linkKind: 'standalone-site',
  departments: [],
})

const undergraduate = undergraduateProgrammeSource.map<OfficialDirectoryLink>((programme) => ({
  id: `ug-${programme.code.toLowerCase()}`,
  code: programme.code,
  name: programme.title,
  url: programme.url,
  college: programme.college,
  department: programme.department,
  detail: programme.degree,
  detailZh: '本科课程',
  linkKind: 'standalone-site',
}))

const postgraduate = postgraduateProgrammeSource.map<OfficialDirectoryLink>((programme) => ({
  id: `pg-${programme.code.toLowerCase()}`,
  code: programme.code,
  name: programme.title,
  url: programme.url,
  college: programme.college,
  department: programme.department,
  detail: programme.award,
  detailZh: programme.type === 'taught-master' ? '授课型硕士' : programme.type === 'professional-doctorate' ? '专业博士' : '研究型学位',
  linkKind: 'standalone-site',
}))

const administrationUnits: OfficialDirectoryLink[] = [
  ['arro', 'Academic Regulations and Records Office', '教务处', 'https://www.cityu.edu.hk/arro/'],
  ['admo', 'Admissions Office', '招生处', 'https://www.cityu.edu.hk/admo/'],
  ['aro', 'Alumni Relations Office', '校友联络处', 'https://www.cityu.edu.hk/aro/'],
  ['cdo', 'Campus Development Office', '校园发展处', 'https://www.cityu.edu.hk/cdo/'],
  ['upress', 'City University of Hong Kong Press', '香港城市大学出版社', 'https://www.cityu.edu.hk/upress/'],
  ['ciro', 'Communications and Institutional Research Office', '传讯及机构研究处', 'https://www.cityu.edu.hk/ciro/'],
  ['csc', 'Computing Services Centre', '电脑服务中心', 'https://www.cityu.edu.hk/csc/'],
  ['it-service-desk', 'IT Service Desk', '资讯科技服务台', 'https://www.cityu.edu.hk/csc/'],
  ['cuc', 'Council Secretariat', '校董会秘书处', 'https://www.cityu.edu.hk/cuc/'],
  ['cxo', 'Cultural Exchange Oasis', '文华汇', 'https://www.cityu.edu.hk/cxo/'],
  ['do', 'Development Office', '发展处', 'https://www.cityu.edu.hk/do/en/'],
  ['esu', 'Enterprise Solutions Office', '企业方案处', 'https://www.cityu.edu.hk/esu/'],
  ['fmo', 'Facilities Management Office', '设施管理处', 'https://www.cityu.edu.hk/fmo/'],
  ['fo', 'Finance Office', '财务处', 'https://www.cityu.edu.hk/fo/'],
  ['geo', 'Global Engagement Office', '环球事务处', 'https://www.cityu.edu.hk/geo/'],
  ['hro', 'Human Resources Office', '人力资源处', 'https://www.cityu.edu.hk/hro/'],
  ['bg', 'Indra and Harry Banga Gallery', '般哥展览馆', 'https://www.cityu.edu.hk/bg/'],
  ['iaud', 'Internal Audit Office', '内部审计处', ADMIN_DIRECTORY_URL],
  ['kto', 'Knowledge Transfer Office', '知识转移处', 'https://www.cityu.edu.hk/kto/'],
  ['lco', 'Legal Counsel Office', '法律顾问办公室', ADMIN_DIRECTORY_URL],
  ['op', 'Office of the President', '校长室', 'https://www.cityu.edu.hk/op/'],
  ['pvdp', 'Office of the Provost and Deputy President', '首席及常务副校长室', 'https://www.cityu.edu.hk/pvdp/'],
  ['svie', 'Office of the Senior Vice-President (Innovation and Enterprise)', '高级副校长室（创新及企业）', 'https://www.cityu.edu.hk/en/svie/about-us'],
  ['vpad', 'Office of the Vice-President (Administration)', '副校长室（行政）', 'https://www.cityu.edu.hk/vpad/'],
  ['vpce', 'Office of the Vice-President (Community Engagement)', '副校长室（社区联繫及协作）', 'https://www.cityu.edu.hk/vpce/'],
  ['vpms', 'Office of the Vice-President (Mainland Strategy)', '副校长室（内地策略）', ADMIN_DIRECTORY_URL],
  ['vpre', 'Office of the Vice-President (Research)', '副校长室（研究）', 'https://www.cityu.edu.hk/vpre/'],
  ['vpti', 'Office of the Vice-President (Talent and International Strategy)', '副校长室（人才及国际策略）', ADMIN_DIRECTORY_URL],
  ['ro', 'Research Grants and Contracts Office', '研究资助及合约处', 'https://www.cityu.edu.hk/ro/'],
  ['lib', 'Run Run Shaw Library', '邵逸夫图书馆', 'https://www.cityu.edu.hk/lib/'],
  ['sds', 'Student Development Services', '学生发展处', 'https://www.cityu.edu.hk/sds/'],
  ['career', 'Career and Leadership Centre', '事业及领袖发展中心', 'https://www.cityu.edu.hk/en/sds/career-leadership/about-us'],
  ['counselling', 'Counselling Services', '辅导服务', 'https://www.cityu.edu.hk/sds/counselling-service/psychological-counselling'],
  ['physical-education', 'Physical Education', '体育部', 'https://www.cityu.edu.hk/en/sds/physical-education-wellness-and-sports/'],
  ['sro', 'Student Residence Office', '学生宿舍处', 'https://www.cityu.edu.hk/sro/'],
  ['ted', 'Talent and Education Development Office', '人才及教育发展处', 'https://www.cityu.edu.hk/ted/'],
].map(([id, name, nameZh, url]) => ({
  id: `admin-${id}`,
  name,
  nameZh,
  url,
  linkKind: url === ADMIN_DIRECTORY_URL ? 'official-directory' : 'standalone-site',
}))

export const cityuOfficialDirectory = {
  verifiedAt: '2026-08-19',
  academic: {
    sourceUrl: ACADEMIC_DIRECTORY_URL,
    colleges,
    otherUnits: [
      {
        id: 'academic-academy-of-innovation',
        name: 'CityUHK Academy of Innovation',
        nameZh: '香港城市大学创新学院',
        url: 'https://www.cityu.edu.hk/svie/academy-of-innovation',
        linkKind: 'standalone-site' as const,
      },
    ],
  },
  programmes: {
    undergraduateSourceUrl: 'https://www.cityu.edu.hk/admo/programmes',
    postgraduateSourceUrl: 'https://www.cityu.edu.hk/en/pg/programme-search',
    undergraduate,
    postgraduate,
  },
  administration: {
    sourceUrl: ADMIN_DIRECTORY_URL,
    units: administrationUnits,
  },
  gateways: [
    {
      id: 'gateway-academic',
      name: 'Colleges, Schools and Departments',
      nameZh: '学院、学校与学系总览',
      url: ACADEMIC_DIRECTORY_URL,
    },
    {
      id: 'gateway-ug',
      name: 'Undergraduate Programme List',
      nameZh: '本科专业总览',
      url: 'https://www.cityu.edu.hk/admo/programmes',
    },
    {
      id: 'gateway-pg',
      name: 'Postgraduate Programme Search',
      nameZh: '硕博项目检索',
      url: 'https://www.cityu.edu.hk/en/pg/programme-search',
    },
    {
      id: 'gateway-admin',
      name: 'Administrative and Supporting Units',
      nameZh: '行政与支援部门总览',
      url: ADMIN_DIRECTORY_URL,
    },
  ],
}

export type CityuOfficialDirectory = typeof cityuOfficialDirectory
