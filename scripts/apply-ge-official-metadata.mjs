import { readFileSync, writeFileSync } from 'node:fs'

const coursesPath = 'src/data/courses.json'
const officialGEPath = 'src/data/ge-official-courses.json'
const expectedAreaCounts = {
  'Area 1': 53,
  'Area 2': 55,
  'Area 3': 63,
  'University Req.': 9,
}

const courses = JSON.parse(readFileSync(coursesPath, 'utf8'))
const officialCourses = JSON.parse(readFileSync(officialGEPath, 'utf8'))

function countByArea(items) {
  return items.reduce((counts, item) => {
    counts[item.area] = (counts[item.area] ?? 0) + 1
    return counts
  }, {})
}

function assertOfficialListShape() {
  const codes = new Set(officialCourses.map((course) => course.code))
  if (officialCourses.length !== 180 || codes.size !== officialCourses.length) {
    throw new Error(`Expected 180 unique official GE courses, found ${officialCourses.length} rows and ${codes.size} unique codes.`)
  }

  const areaCounts = countByArea(officialCourses)
  for (const [area, expected] of Object.entries(expectedAreaCounts)) {
    if (areaCounts[area] !== expected) {
      throw new Error(`Expected ${expected} official GE courses in ${area}, found ${areaCounts[area] ?? 0}.`)
    }
  }
}

function standardPdfUrl(code) {
  return `https://www.cityu.edu.hk/ug/202526/course/${code}.pdf`
}

function termsLabel(terms) {
  return Array.isArray(terms) && terms.length > 0 ? terms.join(', ') : ''
}

function officialAssessment(official, existingAssessment = {}) {
  const assessment = { ...existingAssessment }
  const withExam = official.withExam === 'Yes' ? 'Yes' : 'No'

  if (!assessment.exam) {
    assessment.exam = withExam === 'Yes'
      ? 'With final exam; check official GE course page/PDF for exact weighting'
      : '0%'
  }

  if (!assessment.continuous && withExam === 'No') {
    assessment.continuous = '100%'
  }

  if (!assessment.details && !assessment.breakdown) {
    const terms = termsLabel(official.terms) || 'not listed in the captured GE Search terms'
    assessment.details = [
      `Official CityU GE Search metadata: ${official.area}; Offering Unit: ${official.offeringUnit || 'N/A'}; Level: ${official.level || 'N/A'}; Terms: ${terms}; With Exam: ${withExam}.`,
      'Detailed continuous-assessment task breakdown should be checked against the official course syllabus PDF when available.',
    ].join(' ')
  }

  return assessment
}

function mergeGECourse(official) {
  const existing = courses[official.code] ?? {}
  const existingAssessment = existing.assessment && typeof existing.assessment === 'object'
    ? existing.assessment
    : {}
  const assessment = officialAssessment(official, existingAssessment)

  courses[official.code] = {
    ...existing,
    code: official.code,
    title: official.title || existing.title || official.code,
    credits: existing.credits ?? 3,
    department: existing.department || official.offeringUnit || 'Gateway Education',
    prerequisites: Array.isArray(existing.prerequisites) ? existing.prerequisites : [],
    prerequisitesRaw: existing.prerequisitesRaw ?? '',
    semester: existing.semester || termsLabel(official.terms),
    assessment,
    pdfUrl: existing.pdfUrl || standardPdfUrl(official.code),
    courseUrl: official.geInfoUrl,
    description: existing.description ?? '',
    area: official.area,
    geArea: official.area,
    offeringUnit: official.offeringUnit,
    geLevel: official.level,
    geTerms: official.terms,
    geWithExam: official.withExam,
    geSource: 'CityU GE Search',
    geSourceUrl: official.geInfoUrl,
  }
}

assertOfficialListShape()

for (const official of officialCourses) {
  mergeGECourse(official)
}

writeFileSync(coursesPath, `${JSON.stringify(courses, null, 2)}\n`)
console.log(`Applied official GE metadata for ${officialCourses.length} courses.`)
