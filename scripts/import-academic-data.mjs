import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outputPath = resolve(repoRoot, 'src/data/academic-profiles.json')

const sourceCandidates = [
  process.env.ACADEMIC_INDEX_HTML,
  resolve(repoRoot, '../cityuhk-academic/index.html'),
  'C:/Users/lenovo/cityuhk-academic/index.html',
].filter(Boolean)

function cleanText(value) {
  if (value == null) return ''
  return String(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

function slugify(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

const OFFICIAL_PROFILE_OVERRIDES = {
  'bme-sun-dong': {
    name: 'Dong SUN',
    nameCN: '孫東',
    scholarUrl: 'https://scholars.cityu.edu.hk/en/persons/dong-sun/',
  },
  'bme-yu-xinge': {
    name: 'Xinge YU',
    nameCN: '于欣格',
    scholarUrl: 'https://scholars.cityu.edu.hk/en/persons/xinge-yu/',
  },
  'mse-kai-ji-jung': {
    name: 'Ji-jung KAI',
    nameCN: '開執中',
    scholarUrl: 'https://scholars.cityu.edu.hk/en/persons/ji-jung-kai/',
  },
  'prof-butaye-patrick': {
    name: 'Patrick BUTAYE',
    nameCN: '',
    scholarUrl: 'https://scholars.cityu.edu.hk/en/persons/patrick-butaye/',
  },
  'prof-cai-jun': {
    name: 'Junbo WANG',
    nameCN: '王軍波',
    scholarUrl: 'https://scholars.cityu.edu.hk/en/persons/jwang2/',
  },
  'prof-chen-zhiyao': {
    name: 'Zhiyao CHEN',
    nameCN: '陳志遥',
    scholarUrl: 'https://scholars.cityu.edu.hk/en/persons/zchen737/',
  },
  'prof-cheng-edmund': {
    name: 'Edmund CHENG',
    nameCN: '鄭煒',
    scholarUrl: 'https://scholars.cityu.edu.hk/en/persons/wacheng/',
  },
  'prof-fang-meng': {
    name: 'Meng FANG',
    nameCN: '方萌',
    scholarUrl: 'https://scholars.cityu.edu.hk/en/persons/mengfang/',
  },
  'prof-feng-guanhao': {
    name: 'Guanhao Gavin FENG',
    nameCN: '馮冠豪',
    scholarUrl: 'https://scholars.cityu.edu.hk/en/persons/gufeng/',
  },
  'prof-ferrara-federico': {
    name: 'Federico FERRARA',
    nameCN: '',
    scholarUrl: 'https://scholars.cityu.edu.hk/en/persons/federico-ferrara/',
  },
  'prof-gao-siyang': {
    name: 'Siyang GAO',
    nameCN: '高思陽',
    scholarUrl: 'https://scholars.cityu.edu.hk/en/persons/siyangao/',
  },
  'prof-george-bert': {
    name: 'Bert GEORGE',
    nameCN: '',
    scholarUrl: 'https://scholars.cityu.edu.hk/en/persons/brgeorge/',
  },
  'prof-han-xu': {
    name: 'Xu HAN',
    nameCN: '韓旭',
    scholarUrl: 'https://scholars.cityu.edu.hk/en/persons/xuhan25/',
  },
  'prof-he-tianxiang': {
    name: 'Tianxiang HE',
    nameCN: '何天翔',
    scholarUrl: 'https://scholars.cityu.edu.hk/en/persons/tianxiang-he/',
  },
  'prof-huang-tao': {
    name: 'Tao HUANG',
    nameCN: '黃韜',
    scholarUrl: 'https://scholars.cityu.edu.hk/en/persons/taohuang/',
  },
  'prof-kakkar': {
    name: 'Vikas KAKKAR',
    nameCN: '郭偉傑',
    scholarUrl: 'https://scholars.cityu.edu.hk/en/persons/efvikas/',
  },
  'prof-lai-sinchit': {
    name: 'Sin Chit Martin LAI',
    nameCN: '黎善喆',
    scholarUrl: 'https://scholars.cityu.edu.hk/en/persons/sinclai2/',
  },
  'prof-lee-wai-sum': {
    name: 'Wai Sum LEE',
    nameCN: '李蕙心',
    scholarUrl: 'https://scholars.cityu.edu.hk/en/persons/wai-sum-lee/',
  },
  'prof-li-enshen': {
    name: 'Enshen LI',
    nameCN: '李恩深',
    scholarUrl: 'https://scholars.cityu.edu.hk/en/persons/enshenli/',
  },
  'prof-li-yingxiang': {
    name: 'Yingxiang Li',
    nameCN: '李英祥',
    scholarUrl: 'https://scholars.cityu.edu.hk/en/persons/yingxili/',
  },
  'prof-lin-fen': {
    name: 'Fen LIN',
    nameCN: '林芬',
    scholarUrl: 'https://scholars.cityu.edu.hk/en/persons/fen-lin/',
  },
  'prof-liu-guangwu': {
    name: 'Guangwu LIU',
    nameCN: '劉光梧',
    scholarUrl: 'https://scholars.cityu.edu.hk/en/persons/guangwu-liu/',
  },
  'prof-liu-meichun': {
    name: 'Meichun LIU',
    nameCN: '劉美君',
    scholarUrl: 'https://scholars.cityu.edu.hk/en/persons/meichun-liu/',
  },
  'prof-lu-jane': {
    name: 'Jane LU',
    nameCN: '呂文珍',
    scholarUrl: 'https://scholars.cityu.edu.hk/en/persons/jane-lu/',
  },
  'prof-martinsons': {
    name: 'Maris MARTINSONS',
    nameCN: '馬禮士',
    scholarUrl: 'https://scholars.cityu.edu.hk/en/persons/maris-martinsons/',
  },
  'prof-shek-ch': {
    name: 'Chan Hung SHEK',
    nameCN: '石燦鴻',
    scholarUrl: 'https://scholars.cityu.edu.hk/en/persons/apchshek/',
  },
  'prof-sia-choonling': {
    name: 'Choon Ling SIA',
    nameCN: '謝俊霖',
    scholarUrl: 'https://scholars.cityu.edu.hk/en/persons/iscl/',
  },
  'prof-sun-zhankun': {
    name: 'Zhankun SUN',
    nameCN: '孫占坤',
    scholarUrl: 'https://scholars.cityu.edu.hk/en/persons/zhanksun/',
  },
  'prof-tang-shi': {
    name: 'Shi TANG',
    nameCN: '唐詩',
    scholarUrl: 'https://scholars.cityu.edu.hk/en/persons/shitang/',
  },
  'prof-wang-xiaohu': {
    name: 'Xiaohu WANG',
    nameCN: '王小虎',
    scholarUrl: 'https://scholars.cityu.edu.hk/en/persons/xiaohu-wang/',
  },
  'prof-wang-xin': {
    name: 'Xin WANG',
    nameCN: '王鑫',
    scholarUrl: 'https://scholars.cityu.edu.hk/en/persons/xin-wang/',
  },
  'prof-xia-shixiang': {
    name: 'Shixiang XIA',
    nameCN: '夏詩翔',
    scholarUrl: 'https://scholars.cityu.edu.hk/en/persons/shixixia/',
  },
  'prof-yu-chen': {
    name: 'Chen YU',
    nameCN: '于琛',
    scholarUrl: 'https://scholars.cityu.edu.hk/en/persons/chenyu/',
  },
  'prof-zhu-pingan': {
    name: 'Pingan ZHU',
    nameCN: '朱平安',
    scholarUrl: 'https://scholars.cityu.edu.hk/en/persons/pingan-zhu/',
  },
  'dept-class-cah-tsui-lik-hang': {
    name: 'Lik Hang Tsui',
    nameCN: '徐力恆',
    scholarUrl: 'https://scholars.cityu.edu.hk/en/persons/lhtsui/',
  },
  'dept-class-cah-hui-yue-hang': {
    name: 'Jonathan York Heng HUI',
    nameCN: '許約恆',
    scholarUrl: 'https://scholars.cityu.edu.hk/en/persons/jonathui/',
  },
}

const EXTRACTION_NAME_TOKENS = new Set([
  'dept',
  'class',
  'cah',
  'ceng',
  'comp',
  'cs',
  'bms',
  'bme',
  'ns',
  'ace',
  'mne',
  'mse',
  'mae',
  'see',
  'scm',
  'vcs',
  'idph',
  'jcc',
])

const SOURCE_KEY_PREFIX_TOKENS = new Set(['prof', 'cs'])

function hasExtractionToken(value) {
  return cleanText(value)
    .split(/\s+/)
    .some((token) => EXTRACTION_NAME_TOKENS.has(token.toLowerCase()))
}

function formatNamePart(token) {
  if (!token) return ''
  if (token.length === 1) return token.toUpperCase()
  return token[0].toUpperCase() + token.slice(1).toLowerCase()
}

function deriveNameFromSourceKey(sourceKey) {
  const tokens = slugify(sourceKey).split('-').filter(Boolean)

  while (tokens.length > 0 && SOURCE_KEY_PREFIX_TOKENS.has(tokens[0])) {
    tokens.shift()
  }

  while (
    tokens.length > 0 &&
    (/^\d+$/.test(tokens[tokens.length - 1]) || EXTRACTION_NAME_TOKENS.has(tokens[tokens.length - 1]))
  ) {
    tokens.pop()
  }

  if (tokens.length < 2) return ''

  const familyName = tokens[0].toUpperCase()
  const givenNames = tokens.slice(1).map(formatNamePart).filter(Boolean).join(' ')
  return `${givenNames} ${familyName}`.trim()
}

function googleScholarUrlForName(name) {
  return `https://scholar.google.com/scholar?q=${encodeURIComponent(name)}`
}

function cityuScholarSearchUrlForName(name) {
  return `https://scholars.cityu.edu.hk/en/persons/search.html?search=${encodeURIComponent(name).replace(/%20/g, '+')}`
}

function normalizeProfessorIdentity(professorKey, professor) {
  const override = OFFICIAL_PROFILE_OVERRIDES[professorKey]
  const sourceName = cleanText(professor.name)
  const tokenCleanedName = hasExtractionToken(sourceName) ? deriveNameFromSourceKey(professorKey) : ''
  const name = override?.name ?? (tokenCleanedName || sourceName)
  const nameCN = override && Object.hasOwn(override, 'nameCN') ? override.nameCN : cleanText(professor.nameCN)
  const sourceScholarUrl = professor.scholarUrl ?? ''
  const scholarUrl = override?.scholarUrl ?? (sourceScholarUrl.includes('/search.html') ? cityuScholarSearchUrlForName(name) : sourceScholarUrl)
  const googleScholar =
    override || tokenCleanedName || hasExtractionToken(decodeURIComponent(professor.googleScholar ?? ''))
      ? googleScholarUrlForName(name)
      : professor.googleScholar ?? ''

  return { name, nameCN, scholarUrl, googleScholar }
}

function findSourcePath() {
  return sourceCandidates.find((candidate) => existsSync(candidate))
}

function extractAcademicObject(html) {
  const marker = 'const D='
  const markerIndex = html.indexOf(marker)
  if (markerIndex < 0) {
    throw new Error('Unable to find embedded academic data marker: const D=')
  }

  const start = markerIndex + marker.length
  let depth = 0
  let inString = false
  let escaping = false

  for (let index = start; index < html.length; index += 1) {
    const char = html[index]

    if (inString) {
      if (escaping) {
        escaping = false
      } else if (char === '\\') {
        escaping = true
      } else if (char === '"') {
        inString = false
      }
      continue
    }

    if (char === '"') {
      inString = true
    } else if (char === '{') {
      depth += 1
    } else if (char === '}') {
      depth -= 1
      if (depth === 0) {
        return JSON.parse(html.slice(start, index + 1))
      }
    }
  }

  throw new Error('Unable to close embedded academic data object.')
}

function normalizeAcademicData(rawData) {
  const colleges = []
  const profiles = []
  const usedIds = new Set()

  const makeProfileId = (departmentId, professorKey, name) => {
    const base = slugify(`${departmentId}-${professorKey || name}`) || `profile-${profiles.length + 1}`
    let candidate = base
    let index = 2
    while (usedIds.has(candidate)) {
      candidate = `${base}-${index}`
      index += 1
    }
    usedIds.add(candidate)
    return candidate
  }

  for (const [collegeId, college] of Object.entries(rawData)) {
    const departments = []

    for (const [departmentId, department] of Object.entries(college.departments ?? {})) {
      const profileIds = []

      for (const [professorKey, professor] of Object.entries(department.professors ?? {})) {
        const id = makeProfileId(departmentId, professorKey, professor.name)
        const identity = normalizeProfessorIdentity(professorKey, professor)
        const interests = (professor.interests ?? []).map(cleanText).filter(Boolean)
        const students = (professor.students ?? [])
          .map((student) => ({
            name: cleanText(student.name),
            topic: cleanText(student.topic),
          }))
          .filter((student) => student.name)
        const topPublications = (professor.topPublications ?? [])
          .map((publication) => ({
            title: cleanText(publication.title),
            journal: cleanText(publication.journal),
            year: publication.year ?? null,
            cites: publication.cites ?? null,
            url: publication.url ?? '',
          }))
          .filter((publication) => publication.title)
        const phdStudents = (professor.phdStudents ?? []).map(cleanText).filter(Boolean)

        const profile = {
          id,
          sourceKey: professorKey,
          name: identity.name,
          nameCN: identity.nameCN,
          title: cleanText(professor.title),
          background: cleanText(professor.background),
          interests,
          ugWelcome: Boolean(professor.ugWelcome),
          students,
          studentCount: students.length,
          phdStudents,
          topPublications,
          publicationCount: topPublications.length,
          scholarUrl: identity.scholarUrl,
          googleScholar: identity.googleScholar,
          url: professor.url ?? '',
          collegeId,
          collegeName: cleanText(college.name),
          collegeNameEn: cleanText(college.nameEn),
          departmentId,
          departmentName: cleanText(department.name),
          departmentNameEn: cleanText(department.nameEn),
          departmentUrl: department.url ?? '',
        }

        profiles.push(profile)
        profileIds.push(id)
      }

      departments.push({
        id: departmentId,
        name: cleanText(department.name),
        nameEn: cleanText(department.nameEn),
        url: department.url ?? '',
        profileIds,
      })
    }

    colleges.push({
      id: collegeId,
      name: cleanText(college.name),
      nameEn: cleanText(college.nameEn),
      icon: college.icon ?? '',
      url: college.url ?? '',
      departments,
    })
  }

  const summary = {
    sourceRepository: 'cityuhk-academic',
    sourceUrl: 'https://yifeilu84-sketch.github.io/cityuhk-academic/',
    sourceFile: 'cityuhk-academic/index.html',
    collegeCount: colleges.length,
    departmentCount: colleges.reduce((sum, college) => sum + college.departments.length, 0),
    professorCount: profiles.length,
    studentCount: profiles.reduce((sum, profile) => sum + profile.studentCount, 0),
    publicationCount: profiles.reduce((sum, profile) => sum + profile.publicationCount, 0),
  }

  return { summary, colleges, profiles }
}

const sourcePath = findSourcePath()

if (!sourcePath) {
  if (existsSync(outputPath)) {
    console.log('Academic source repository not found; keeping existing src/data/academic-profiles.json.')
    process.exit(0)
  }
  throw new Error(`Academic source repository not found. Tried: ${sourceCandidates.join(', ')}`)
}

const rawData = extractAcademicObject(readFileSync(sourcePath, 'utf8'))
const normalized = normalizeAcademicData(rawData)
writeFileSync(outputPath, `${JSON.stringify(normalized, null, 2)}\n`)
console.log(
  `Imported ${normalized.summary.professorCount} academic profiles, ` +
  `${normalized.summary.departmentCount} departments and ${normalized.summary.publicationCount} publications.`
)
