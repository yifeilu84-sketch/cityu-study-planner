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
          name: cleanText(professor.name),
          nameCN: cleanText(professor.nameCN),
          title: cleanText(professor.title),
          background: cleanText(professor.background),
          interests,
          ugWelcome: Boolean(professor.ugWelcome),
          students,
          studentCount: students.length,
          phdStudents,
          topPublications,
          publicationCount: topPublications.length,
          scholarUrl: professor.scholarUrl ?? '',
          googleScholar: professor.googleScholar ?? '',
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
