import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { generateStudyPlan, getAllMajorCourses } from '../src/utils/studyPlan.ts'
import { buildCoursePool } from '../src/utils/editPlan.ts'

const majors = JSON.parse(readFileSync(new URL('../src/data/all-majors.json', import.meta.url), 'utf8'))
const courses = JSON.parse(readFileSync(new URL('../src/data/courses.json', import.meta.url), 'utf8'))
const officialGECourses = JSON.parse(readFileSync(new URL('../src/data/ge-official-courses.json', import.meta.url), 'utf8'))

function major(code) {
  const found = majors.find((item) => item.code === code)
  assert.ok(found, `Expected ${code} to exist in all-majors.json`)
  return found
}

function semesterCodes(code, year, sem) {
  return major(code).studyPlan?.[`year${year}`]?.[sem]?.courses.map((course) => course.code) ?? []
}

function planCourseCodes(item) {
  return Object.values(item.studyPlan ?? {})
    .flatMap((year) => Object.values(year))
    .flatMap((semester) => semester.courses.map((course) => course.code))
}

function isGeneric(code) {
  return /^(GE(-|$)|GE Area|GE-Area|GE-DR|GE-COL|GE-ELECTIVE|ELECTIVE|MAJOR-ELECT|FREE|MINOR|COLLEGE|COL-ELEC|LAW-ELECTIVE|CRS-ELECTIVE|CS-E|DR-|FIN-ELECTIVE|EVE-ELECTIVE|AC-ELECTIVE)/i.test(code)
}

function countByArea(items) {
  return items.reduce((counts, item) => {
    counts[item.area] = (counts[item.area] ?? 0) + 1
    return counts
  }, {})
}

test('major course list includes real courses that appear only in the official study plan', () => {
  const bme = major('BENG1_BME-1')
  const codes = new Set(getAllMajorCourses(bme).map((course) => course.code))

  assert.ok(codes.has('PHY1201'), 'BME Year 1 Sem A physics course should be visible in the course list')
  assert.ok(codes.has('CHEM1200'), 'BME Year 1 Sem A biology course should be visible in the course list')
  assert.ok(codes.has('CHEM1300'), 'BME Year 1 Sem B chemistry course should be visible in the course list')
})

test('EE flowchart majors keep 2026/27 course placement from the official diagrams', () => {
  assert.deepEqual(semesterCodes('BENG1_CDE-1', 2, 'semA'), ['MA2001', 'EE3001', 'CS2311', 'EE2000'])
  assert.deepEqual(semesterCodes('BENG1_CDE-1', 3, 'semB'), ['EE4146', 'CS3402', 'EE3220', 'EE3315'])

  assert.deepEqual(semesterCodes('BENG1_ELEL-1', 2, 'semA'), ['MA2001', 'EE2108', 'EE2005', 'CS2311'])
  assert.deepEqual(semesterCodes('BENG1_ELEL-1', 2, 'semB'), ['EE3121', 'EE3210', 'EE2104', 'EE2000'])

  assert.deepEqual(semesterCodes('BENG1_INFE-1', 2, 'semB'), ['EE3331', 'EE3009', 'EE2303', 'EE2004', 'EE2005'])
  assert.deepEqual(semesterCodes('BENG1_INFE-1', 3, 'semA'), ['EE3210', 'EE3301', 'CS3402', 'EE2331', 'EE3070'])

  assert.deepEqual(semesterCodes('BENG1_MEE-1', 2, 'semB'), ['EE2800', 'EE3121', 'EE3210', 'EE2104'])
  assert.deepEqual(semesterCodes('BENG1_MEE-1', 3, 'semA'), ['EE3800', 'EE3008', 'EE3801', 'EE2004'])
})

test('official summer training slots are generated from study plans', () => {
  const generated = generateStudyPlan(major('BENG1_CDE-1'), courses)
  const year3Summer = generated.find((semester) => semester.year === 3 && semester.sem === 'Summer')

  assert.deepEqual(year3Summer?.courses.map((course) => course.code), ['EE4090'])
})

test('latest INFE v3 course appears in the searchable course list', () => {
  const infeCourses = getAllMajorCourses(major('BENG1_INFE-1'))
  const ee2303 = infeCourses.find((course) => course.code === 'EE2303')

  assert.equal(ee2303?.title, 'Applied AI Systems in Information Engineering: Lifecycle and Human-Centered Design')
})

test('MGT 2025/26 normative plan follows the supplied HRM/SIM schedule', () => {
  const mgt = major('BBA1_MGMT-1')
  const allPlanCourses = Object.values(mgt.studyPlan)
    .flatMap((year) => Object.values(year))
    .flatMap((semester) => semester.courses.map((course) => course.code))
  const totalPlanCredits = Object.values(mgt.studyPlan)
    .flatMap((year) => Object.values(year))
    .reduce((sum, semester) => sum + semester.credits, 0)
  const mgtCourseList = new Set(getAllMajorCourses(mgt).map((course) => course.code))

  assert.equal(mgt.totalCredits, 121)
  assert.equal(totalPlanCredits, 121)
  assert.deepEqual(semesterCodes('BBA1_MGMT-1', 2, 'semA'), ['CB2402', 'CB2101', 'CB2200', 'MGT3306', 'MGT2324'])
  assert.deepEqual(semesterCodes('BBA1_MGMT-1', 3, 'semB'), ['GE-COL', 'STREAM-ELECT1', 'MAJOR-ELECT1', 'COL-ELEC1', 'MINOR3'])
  assert.equal(allPlanCourses.filter((code) => code === 'GE1401').length, 1)
  assert.equal(allPlanCourses.filter((code) => code === 'GE2402').length, 1)
  assert.equal(allPlanCourses.includes('CHIN1001'), false)
  assert.ok(mgtCourseList.has('CB2240'))
  assert.ok(mgtCourseList.has('CB2203'))
  assert.equal(mgt.streams.find((stream) => stream.code === 'HRM')?.studyPlan.year3.semB.courses[1].title, 'HRM Stream Elective')
  assert.equal(mgt.streams.find((stream) => stream.code === 'SIM')?.studyPlan.year3.semB.courses[1].title, 'SIM Stream Elective')
})

test('official double degree programmes from ADMO are present with five-year study plans', () => {
  const doubleDegreeCodes = [
    'DBSCBSC1_D008-0',
    'DEVEFIN1_D009-0',
    'DBSSLLB1_D007-0',
    'DLLBBBA1_D005-0',
  ]

  for (const code of doubleDegreeCodes) {
    const item = major(code)
    const generated = generateStudyPlan(item, courses)
    assert.ok(item.title.includes(' and '), `${code} should be a named double degree`)
    assert.ok(item.studyPlan.year5, `${code} should keep its fifth year`)
    assert.equal(generated.some((semester) => semester.year === 5), true, `${code} should render Year 5`)
    assert.ok(planCourseCodes(item).some((courseCode) => !isGeneric(courseCode)), `${code} should include official planned courses`)
  }

  assert.deepEqual(semesterCodes('DBSCBSC1_D008-0', 5, 'semA'), ['CB4001', 'EN4262', 'EF4821', 'GE-2'])
  assert.deepEqual(semesterCodes('DEVEFIN1_D009-0', 5, 'semB'), ['SEE4001', 'SEE4204', 'SEE4996', 'FIN-ELECTIVE'])
  assert.deepEqual(semesterCodes('DBSSLLB1_D007-0', 5, 'semB'), ['SS4296', 'SS4718', 'LW4616'])
  assert.deepEqual(semesterCodes('DLLBBBA1_D005-0', 5, 'semA'), ['AC-ELECTIVE1', 'AC-ELECTIVE2', 'COLLEGE-SPECIFIED1', 'LW4658'])
})

test('flagship pathways without explicit official semester plans use empty DIY planning grids', () => {
  const flagshipCodes = ['CBIO_BIO3-1', 'CC_ACT-1', 'CENG_PRIME-1', 'SCM_CREATE-1', 'CSCI_GREAT-1']

  for (const code of flagshipCodes) {
    const item = major(code)
    assert.equal(item.studyPlanStatus, 'diy')
    const generated = generateStudyPlan(item, courses)
    assert.equal(generated.length, 12, `${code} should provide four empty years including summers`)
    assert.equal(generated.every((semester) => semester.courses.length === 0 && semester.totalCredits === 0), true)
    assert.ok(item.streams?.length > 0, `${code} should expose official underlying majors as streams`)
    const pool = buildCoursePool(item, courses, undefined, 0)
    assert.ok(pool.length > 0, `${code} first stream should expose required courses for DIY planning`)
  }
})

test('catalogue-derived plans are labelled as DIY references instead of official plans', () => {
  const derivedCodes = ['BBA1_BE2-1', 'BBA1_FIN3-1', 'BBA1_MKT1-1', 'BA1_TVB-1', 'BA1_MDCM-1', 'BSS1_IRGA-1']

  for (const code of derivedCodes) {
    const item = major(code)
    assert.equal(item.studyPlanStatus, 'derived', `${code} should be marked as derived from graduation requirements`)
    assert.ok(item.notes.some((note) => note.includes('DIY reference')), `${code} should tell students to DIY-check the plan`)
    assert.ok(planCourseCodes(item).length > 0, `${code} should still expose the arranged reference plan`)
  }
})

test('Artificial Intelligence in Business replaces the old Information Management display name', () => {
  const aib = major('BBA1_IFMG-1')
  assert.equal(aib.title, 'Bachelor of Business Administration in Artificial Intelligence in Business')
  assert.equal(aib.notes.some((note) => note.includes('Information Management')), true)
})

test('free-combination GE courses and new double-degree courses have verified course assessment data', () => {
  const gePool = buildCoursePool(major('BENG1_BME-1'), courses).filter((course) => /^GE\d{4}$/.test(course.code))
  const gePoolCodes = new Set(gePool.map((course) => course.code))
  assert.equal(gePool.length, officialGECourses.length, 'GE pool should mirror the full official GE Search list')
  for (const officialCourse of officialGECourses) {
    assert.ok(gePoolCodes.has(officialCourse.code), `${officialCourse.code} should be available in free-combination GE choices`)
  }

  const requiredCodes = new Set([
    ...gePool.map((course) => course.code),
    'GE2262',
    'GE2263',
    'CS2611',
    'EN4262',
    'AC3390',
    'CB3043',
  ])

  const missing = []
  for (const code of requiredCodes) {
    const course = courses[code]
    if (!course) {
      missing.push(`${code}: missing course`)
      continue
    }
    const hasAssessment = Boolean(course.assessment?.continuous || course.assessment?.exam || course.assessment?.details || course.assessment?.breakdown)
    const isGE = /^GE\d{4}$/.test(code)
    if (!course.courseUrl || !hasAssessment || (!isGE && !course.pdfUrl)) {
      missing.push(`${code}: incomplete official course detail`)
    }
  }

  assert.deepEqual(missing, [])
})

test('new official programmes do not expose real course codes without course detail records', () => {
  const programmeCodes = [
    'DBSCBSC1_D008-0',
    'DEVEFIN1_D009-0',
    'DBSSLLB1_D007-0',
    'DLLBBBA1_D005-0',
    'CBIO_BIO3-1',
    'CC_ACT-1',
    'CENG_PRIME-1',
    'SCM_CREATE-1',
    'CSCI_GREAT-1',
  ]

  const missing = []
  for (const code of programmeCodes) {
    const item = major(code)
    const candidateCodes = new Set(item.allCourses ?? [])
    for (const year of Object.values(item.studyPlan ?? {})) {
      for (const semester of Object.values(year)) {
        for (const plannedCourse of semester.courses ?? []) {
          candidateCodes.add(plannedCourse.code)
        }
      }
    }
    for (const stream of item.streams ?? []) {
      for (const streamCourse of stream.allCourses ?? []) {
        candidateCodes.add(streamCourse)
      }
    }

    for (const rawCode of candidateCodes) {
      const lookupCode = rawCode.trim().split(/[\s/]+/)[0]
      if (!lookupCode || isGeneric(lookupCode)) continue
      if (!courses[lookupCode]) missing.push(`${code}: ${lookupCode}`)
    }
  }

  assert.deepEqual(missing, [])
})

test('source labels distinguish official, structure, derived, and diy plans', async () => {
  const { getStudyPlanSourceStatus } = await import('../src/utils/sourceStatus.ts')

  assert.equal(getStudyPlanSourceStatus(major('BENG1_BME-1')).kind, 'official')
  assert.equal(getStudyPlanSourceStatus(major('BENG1_CDE-1')).kind, 'structure')
  assert.equal(getStudyPlanSourceStatus(major('BBA1_BE2-1')).kind, 'derived')
  assert.equal(getStudyPlanSourceStatus(major('CBIO_BIO3-1')).kind, 'diy')
})

test('graduation audit catches removed required course and GE area gaps', async () => {
  const { auditGraduationPlan } = await import('../src/utils/graduationAudit.ts')
  const bme = major('BENG1_BME-1')
  const plan = generateStudyPlan(bme, courses).map((semester) => {
    const keptCourses = semester.courses.filter((course) => course.code !== 'GE1401')
    return {
      ...semester,
      courses: keptCourses,
      totalCredits: keptCourses.reduce((sum, course) => sum + course.credits, 0),
    }
  })

  const audit = auditGraduationPlan(bme, courses, plan)

  assert.equal(audit.status, 'danger')
  assert.ok(audit.ge.missingRequiredCodes.includes('GE1401'))
  assert.ok(audit.ge.missingAreas.includes('Area 1'))
  assert.ok(audit.ge.missingAreas.includes('Area 2'))
  assert.ok(audit.ge.missingAreas.includes('Area 3'))
  assert.ok(audit.sections.some((section) => section.missingCourseCodes.includes('GE1401')))
})

test('graduation audit marks derived and diy plans as advisory', async () => {
  const { auditGraduationPlan } = await import('../src/utils/graduationAudit.ts')
  const derivedMajor = major('BBA1_BE2-1')
  const diyMajor = major('CBIO_BIO3-1')

  const derived = auditGraduationPlan(derivedMajor, courses, generateStudyPlan(derivedMajor, courses))
  const diy = auditGraduationPlan(diyMajor, courses, generateStudyPlan(diyMajor, courses), 0)

  assert.equal(derived.source.kind, 'derived')
  assert.equal(derived.source.advisory, true)
  assert.equal(diy.source.kind, 'diy')
  assert.equal(diy.source.advisory, true)
  assert.ok(diy.warnings.some((warning) => warning.kind === 'source-confidence' && warning.message.includes('DIY')))
})

test('graduation audit detects duplicate courses and prerequisite ordering', async () => {
  const { auditGraduationPlan } = await import('../src/utils/graduationAudit.ts')
  const bme = major('BENG1_BME-1')
  const plan = generateStudyPlan(bme, courses)
  const duplicated = plan[0].courses[0]
  const coursesForTest = {
    ...courses,
    TEST2000: {
      code: 'TEST2000',
      title: 'Synthetic Prerequisite Check',
      credits: 3,
      department: 'Test',
      prerequisites: ['TEST1000'],
      prerequisitesRaw: 'TEST1000',
      semester: '',
      assessment: {},
      pdfUrl: '',
      courseUrl: '',
    },
  }

  plan[0].courses.push({ ...duplicated })
  plan[0].courses.push({
    code: 'TEST2000',
    title: 'Synthetic Prerequisite Check',
    credits: 3,
    category: 'majorCore',
    semester: '',
  })
  plan[0].totalCredits += duplicated.credits + 3

  const audit = auditGraduationPlan(bme, coursesForTest, plan)

  assert.equal(audit.duplicates.some((item) => item.code === duplicated.code), true)
  assert.equal(audit.warnings.some((warning) => warning.kind === 'prerequisite' && warning.codes.includes('TEST2000')), true)
})

test('graduation audit accepts split final year project courses in SEE study plans', async () => {
  const { auditGraduationPlan } = await import('../src/utils/graduationAudit.ts')
  const ese = major('BENG1_ESE-1')
  const eve = major('BENG1_EVE-1')

  const eseAudit = auditGraduationPlan(ese, courses, generateStudyPlan(ese, courses))
  const eveAudit = auditGraduationPlan(eve, courses, generateStudyPlan(eve, courses))

  assert.equal(eseAudit.duplicates.some((item) => item.code === 'SEE4997'), false)
  assert.equal(eseAudit.warnings.some((warning) => warning.kind === 'duplicate' && warning.codes.includes('SEE4997')), false)
  assert.equal(eveAudit.duplicates.some((item) => item.code === 'SEE4996'), false)
  assert.equal(eveAudit.warnings.some((warning) => warning.kind === 'duplicate' && warning.codes.includes('SEE4996')), false)
})

test('ESE major elective requirement matches official 12 credit unit catalogue requirement', async () => {
  const { auditGraduationPlan } = await import('../src/utils/graduationAudit.ts')
  const ese = major('BENG1_ESE-1')
  const audit = auditGraduationPlan(ese, courses, generateStudyPlan(ese, courses))
  const majorElectives = audit.sections.find((section) => section.key === 'majorElectives')

  assert.equal(ese.requirements.majorElectives.credits, 12)
  assert.equal(ese.requirements.majorElectives.chooseCredits, 12)
  assert.equal(majorElectives?.plannedCredits, 12)
  assert.equal(majorElectives?.requiredCredits, 12)
  assert.equal(majorElectives?.missingCredits, 0)
})

test('graduation audit panel is wired into major and edit views', () => {
  const panel = readFileSync(new URL('../src/components/GraduationAuditPanel.tsx', import.meta.url), 'utf8')
  const majorPage = readFileSync(new URL('../src/pages/MajorPage.tsx', import.meta.url), 'utf8')
  const editor = readFileSync(new URL('../src/components/StudyPlanEditor.tsx', import.meta.url), 'utf8')

  assert.ok(panel.includes('毕业要求自检'))
  assert.ok(panel.includes('audit.totalCredits.planned'))
  assert.ok(majorPage.includes('GraduationAuditPanel'))
  assert.ok(majorPage.includes('auditGraduationPlan'))
  assert.ok(editor.includes('GraduationAuditPanel'))
  assert.ok(editor.includes('auditGraduationPlan'))
})

test('global search returns majors and real courses while excluding placeholders', async () => {
  const { buildSearchIndex, searchPlanner } = await import('../src/utils/searchIndex.ts')
  const index = buildSearchIndex(majors, courses)

  const cs = searchPlanner(index, 'computer science')
  assert.ok(cs.majors.some((item) => item.code === 'BSC1_CSC1-1'))

  const ge2401 = searchPlanner(index, 'GE2401')
  assert.ok(ge2401.courses.some((item) => item.code === 'GE2401'))

  const placeholder = searchPlanner(index, 'MAJOR-ELECTIVE')
  assert.equal(placeholder.courses.length, 0)
})

test('ge helper exposes verified GE courses with assessment filters', async () => {
  const { getGECourses, filterGECourses } = await import('../src/utils/geCourses.ts')
  const items = getGECourses(courses)

  assert.equal(items.length, officialGECourses.length)
  assert.ok(items.every((item) => /^GE\d{4}$/.test(item.code)))
  assert.equal(items.some((item) => item.area === '未标注'), false)
  assert.deepEqual(countByArea(items), {
    'Area 1': 53,
    'Area 2': 55,
    'Area 3': 63,
    'University Req.': 9,
  })
  assert.equal(items.find((item) => item.code === 'GE2122')?.area, 'Area 1')
  assert.equal(items.find((item) => item.code === 'GE1362')?.area, 'Area 3')
  assert.equal(items.find((item) => item.code === 'GE2401')?.area, 'University Req.')
  assert.equal(items.find((item) => item.code === 'GE4103')?.area, 'Area 1')
  assert.equal(items.find((item) => item.code === 'GE2122')?.offeringUnit, 'LT')
  assert.deepEqual(items.find((item) => item.code === 'GE4103')?.terms, ['2025-26 Sem A'])
  assert.equal(items.find((item) => item.code === 'GE1362')?.sourceUrl, 'https://www.cityu.edu.hk/ge_info/Course/GE1362')
  assert.ok(filterGECourses(items, { query: 'English', area: 'all', exam: 'any' }).length > 0)
  assert.ok(filterGECourses(items, { query: '', area: 'all', exam: 'has-exam' }).every((item) => item.hasFinalExam))
  assert.ok(filterGECourses(items, { query: '', area: 'all', exam: 'no-exam' }).every((item) => !item.hasFinalExam))
})

test('ge helper summarizes official areas in user-facing order', async () => {
  const { getGECourses, summarizeGEAreas } = await import('../src/utils/geCourses.ts')
  const summary = summarizeGEAreas(getGECourses(courses))

  assert.equal(summary.total, 180)
  assert.deepEqual(summary.groups.map((group) => group.area), ['Area 1', 'Area 2', 'Area 3', 'University Req.'])
  assert.deepEqual(summary.groups.map((group) => group.count), [53, 55, 63, 9])
  assert.equal(summary.groups[0].label, 'Arts and Humanities')
  assert.equal(summary.groups[1].label, 'Study of Societies, Social and Business Organisations')
  assert.equal(summary.groups[2].label, 'Science and Technology')
  assert.equal(summary.groups[3].label, 'University Requirements')
  assert.equal(summary.groups.reduce((sum, group) => sum + group.withExamCount, 0), getGECourses(courses).filter((course) => course.hasFinalExam).length)
})

test('official GE search metadata is complete and linked to site course records', () => {
  assert.equal(officialGECourses.length, 180)
  assert.equal(new Set(officialGECourses.map((course) => course.code)).size, officialGECourses.length)
  assert.deepEqual(countByArea(officialGECourses), {
    'Area 1': 53,
    'Area 2': 55,
    'Area 3': 63,
    'University Req.': 9,
  })

  for (const officialCourse of officialGECourses) {
    const course = courses[officialCourse.code]
    assert.ok(course, `${officialCourse.code} should exist in courses.json`)
    assert.equal(course.courseUrl, officialCourse.geInfoUrl)
    assert.equal(course.geArea ?? course.area, officialCourse.area)
    assert.ok(course.assessment?.exam || course.assessment?.details, `${officialCourse.code} should expose official assessment metadata`)
  }
})

test('issue report includes entity context and official evidence prompt', async () => {
  const { buildIssueReport } = await import('../src/utils/feedback.ts')
  const report = buildIssueReport({
    entityType: 'major',
    code: 'BBA1_BE2-1',
    title: 'Business Economics',
    pageUrl: 'https://example.test/#/major/BBA1_BE2-1',
    sourceKind: 'derived',
  })

  assert.ok(report.body.includes('BBA1_BE2-1'))
  assert.ok(report.body.includes('official evidence'))
  assert.ok(report.githubUrl.includes('issues/new'))
})

test('source summary groups majors by official confirmation level', async () => {
  const { summarizeMajorSourceStatuses, filterMajorsBySource } = await import('../src/utils/sourceSummary.ts')
  const summary = summarizeMajorSourceStatuses(majors)

  assert.equal(summary.total, majors.length)
  assert.equal(summary.groups.reduce((sum, group) => sum + group.count, 0), majors.length)
  assert.ok(summary.counts.official > 0)
  assert.ok(summary.counts.structure >= 4)
  assert.ok(summary.counts.derived >= 6)
  assert.ok(summary.counts.diy >= 5)
  assert.equal(summary.needsReviewCount, summary.counts.structure + summary.counts.derived + summary.counts.diy)

  const diyMajors = filterMajorsBySource(majors, 'diy')
  assert.ok(diyMajors.some((item) => item.code === 'CBIO_BIO3-1'))
  assert.equal(diyMajors.every((item) => item.source.kind === 'diy'), true)
})

test('global search can filter major results by source confidence', async () => {
  const { buildSearchIndex, searchPlanner } = await import('../src/utils/searchIndex.ts')
  const index = buildSearchIndex(majors, courses)

  const derived = searchPlanner(index, 'business', { sourceKind: 'derived', limit: 20 })
  assert.ok(derived.majors.some((item) => item.code === 'BBA1_BE2-1'))
  assert.equal(derived.majors.every((item) => item.sourceKind === 'derived'), true)

  const diy = searchPlanner(index, 'PRIME', { sourceKind: 'diy', limit: 20 })
  assert.deepEqual(diy.majors.map((item) => item.code), ['CENG_PRIME-1'])
})
