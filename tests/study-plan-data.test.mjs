import { existsSync, readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { generateStudyPlan, getAllMajorCourses } from '../src/utils/studyPlan.ts'
import { buildCoursePool } from '../src/utils/editPlan.ts'

const majors = JSON.parse(readFileSync(new URL('../src/data/all-majors.json', import.meta.url), 'utf8'))
const courses = JSON.parse(readFileSync(new URL('../src/data/courses.json', import.meta.url), 'utf8'))
const officialGECourses = JSON.parse(readFileSync(new URL('../src/data/ge-official-courses.json', import.meta.url), 'utf8'))
const postgraduateProgrammes = JSON.parse(readFileSync(new URL('../src/data/postgraduate-programmes.json', import.meta.url), 'utf8'))
const pgCourses = JSON.parse(readFileSync(new URL('../src/data/pg-courses.json', import.meta.url), 'utf8'))
const academicProfilesUrl = new URL('../src/data/academic-profiles.json', import.meta.url)
const academicProfilesData = existsSync(academicProfilesUrl)
  ? JSON.parse(readFileSync(academicProfilesUrl, 'utf8'))
  : { summary: {}, profiles: [], colleges: [] }

function major(code) {
  const found = majors.find((item) => item.code === code)
  assert.ok(found, `Expected ${code} to exist in all-majors.json`)
  return found
}

function semesterCodes(code, year, sem) {
  return major(code).studyPlan?.[`year${year}`]?.[sem]?.courses.map((course) => course.code) ?? []
}

function requirementCredits(code) {
  const reqs = major(code).requirements
  return {
    gatewayEducation: reqs.gatewayEducation?.credits ?? 0,
    college: reqs.college?.credits ?? 0,
    collegeRequirement: reqs.collegeRequirement?.credits ?? 0,
    majorCore: reqs.majorCore?.credits ?? 0,
    majorElectives: reqs.majorElectives?.credits ?? 0,
    freeElectives: reqs.freeElectives?.credits ?? 0,
  }
}

function plannedCourse(code, year, sem, courseCode) {
  const found = major(code).studyPlan?.[`year${year}`]?.[sem]?.courses.find((course) => course.code === courseCode)
  assert.ok(found, `Expected ${code} ${year}.${sem} to contain ${courseCode}`)
  return found
}

function streamByCode(item, streamCode) {
  const stream = item.streams?.find((candidate) => candidate.code === streamCode)
  assert.ok(stream, `Expected ${item.code} to expose stream ${streamCode}`)
  return stream
}

function streamSemesterCodes(item, streamCode, year, sem) {
  return streamByCode(item, streamCode).studyPlan?.[`year${year}`]?.[sem]?.courses.map((course) => course.code) ?? []
}

function streamPlanCredits(item, streamCode) {
  return Object.values(streamByCode(item, streamCode).studyPlan ?? {})
    .flatMap((year) => Object.values(year))
    .reduce((sum, semester) => sum + semester.credits, 0)
}

function planCourseCodes(item) {
  return Object.values(item.studyPlan ?? {})
    .flatMap((year) => Object.values(year))
    .flatMap((semester) => semester.courses.map((course) => course.code))
}

function planCredits(item) {
  return Object.values(item.studyPlan ?? {})
    .flatMap((year) => Object.values(year))
    .reduce((sum, semester) => sum + semester.credits, 0)
}

function isGeneric(code) {
  return /^(GE(-|$)|GE Area|GE-Area|GE-DR|GE-COL|GE-ELECTIVE|ELECTIVE|MAJOR-ELECT|FREE|MINOR|COLLEGE|COL-ELEC|LAW-ELECTIVE|CRS-ELECTIVE|CS-E|DR-|FIN-ELECTIVE|EVE-ELECTIVE|AC-ELECTIVE|STREAM|FLAGSHIP)/i.test(code) || /-ELECT/i.test(code)
}

function addOfferingTermsFromText(terms, rawText) {
  const text = String(rawText ?? '').toLowerCase()
  if (!text || /not\s+offering/.test(text)) return false
  if (/semester\s*a|sem\s*a/.test(text)) terms.add('semA')
  if (/semester\s*b|sem\s*b/.test(text)) terms.add('semB')
  if (/semester\s*a\s*(?:&|and|\/)\s*b|sem\s*a\s*(?:&|and|\/)\s*b/.test(text)) terms.add('semB')
  if (/summer/.test(text)) terms.add('summer')
  return true
}

function getConfirmedOfferingTerms(course) {
  const terms = new Set()
  let hasConfirmedSource = false
  for (const term of course?.geTerms ?? []) {
    hasConfirmedSource = addOfferingTermsFromText(terms, term) || hasConfirmedSource
  }
  hasConfirmedSource = addOfferingTermsFromText(terms, course?.semester) || hasConfirmedSource
  return hasConfirmedSource && terms.size > 0 ? terms : null
}

function collectOfferingConflicts(owner, plan, label) {
  const conflicts = []
  if (!plan) return conflicts

  for (const [yearKey, year] of Object.entries(plan)) {
    for (const semKey of ['semA', 'semB', 'summer']) {
      for (const plannedCourse of year?.[semKey]?.courses ?? []) {
        const lookupCode = plannedCourse.code.trim().split(/[\s/]+/)[0]
        if (!lookupCode || isGeneric(plannedCourse.code) || isGeneric(lookupCode)) continue
        const course = courses[plannedCourse.code] ?? courses[lookupCode]
        const allowedTerms = getConfirmedOfferingTerms(course)
        if (!allowedTerms || allowedTerms.has(semKey)) continue
        conflicts.push(`${owner.code} ${label} ${yearKey}.${semKey} ${plannedCourse.code} is offered in ${[...allowedTerms].join('/')}`)
      }
    }
  }

  return conflicts
}

function collectPostgraduateOfferingConflicts(programme, plan, label) {
  const conflicts = []
  if (!plan) return conflicts

  for (const [yearKey, year] of Object.entries(plan)) {
    for (const semKey of ['semA', 'semB', 'summer']) {
      for (const plannedCourse of year?.[semKey]?.courses ?? []) {
        const lookupCode = plannedCourse.code.trim().split(/[\s/]+/)[0]
        if (!lookupCode || isGeneric(plannedCourse.code) || isGeneric(lookupCode)) continue
        const course = pgCourses[plannedCourse.code] ?? pgCourses[lookupCode]
        const allowedTerms = getConfirmedOfferingTerms(course)
        if (!allowedTerms || allowedTerms.has(semKey)) continue
        conflicts.push(`${programme.code} ${label} ${yearKey}.${semKey} ${plannedCourse.code} is offered in ${[...allowedTerms].join('/')}`)
      }
    }
  }

  return conflicts
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

test('all EE 2026/27 plans match every row of the latest official flowcharts', () => {
  const expected = {
    'BENG1_CDE-1': {
      year1: {
        semA: ['MA1200/MA1300', 'EE1001', 'CS1302', 'GE1354'],
        semB: ['MA1201/MA1301', 'PHY1101', 'EE1004', 'EE1002'],
      },
      year2: {
        semA: ['MA2001', 'EE3001', 'CS2311', 'EE2000'],
        semB: ['EE3211', 'EE2331', 'EE2004', 'EE2005'],
        summer: [],
      },
      year3: {
        semA: ['EE3210', 'EE3206', 'CS3103', 'EE3009', 'EE3070'],
        semB: ['EE4146', 'CS3402', 'EE3220', 'EE3315'],
        summer: ['EE4090'],
      },
      year4: {
        semA: ['CDE-ELECTIVE1', 'CDE-ELECTIVE2', 'EE4080', 'EE2066'],
        semB: ['EE4080', 'CDE-ELECTIVE3', 'CDE-ELECTIVE4', 'CDE-ELECTIVE5'],
      },
    },
    'BENG1_ELEL-1': {
      year1: {
        semA: ['MA1200/MA1300', 'EE1001', 'CS1302', 'GE1354'],
        semB: ['MA1201/MA1301', 'PHY1101', 'EE1004', 'EE1002'],
      },
      year2: {
        semA: ['MA2001', 'EE2108', 'EE2005', 'CS2311'],
        semB: ['EE3121', 'EE3210', 'EE2104', 'EE2000'],
        summer: [],
      },
      year3: {
        semA: ['EE3114', 'EE3008', 'EE3123', 'EE2004'],
        semB: ['EE3109', 'EE3124', 'EE3115', 'EE3122', 'EE3070'],
        summer: ['EE4090'],
      },
      year4: {
        semA: ['ELEL-ELECTIVE1', 'ELEL-ELECTIVE2', 'EE4080', 'EE2066'],
        semB: ['EE4080', 'ELEL-ELECTIVE3', 'ELEL-ELECTIVE4', 'ELEL-ELECTIVE5'],
      },
    },
    'BENG1_INFE-1': {
      year1: {
        semA: ['MA1200/MA1300', 'EE1001', 'CS1302', 'GE1354'],
        semB: ['MA1201/MA1301', 'PHY1101', 'EE1004', 'EE1002'],
      },
      year2: {
        semA: ['MA2001', 'EE2302', 'CS2311', 'EE2000'],
        semB: ['EE3331', 'EE3009', 'EE2303', 'EE2004'],
        summer: [],
      },
      year3: {
        semA: ['EE3210', 'EE3301', 'CS3402', 'EE2331', 'EE3070'],
        semB: ['EE3008', 'EE3315', 'EE3206', 'CS3103'],
        summer: ['EE4090'],
      },
      year4: {
        semA: ['INFE-ELECTIVE1', 'INFE-ELECTIVE2', 'EE4080', 'EE2066'],
        semB: ['EE4080', 'INFE-ELECTIVE3', 'INFE-ELECTIVE4', 'INFE-ELECTIVE5'],
      },
    },
    'BENG1_MEE-1': {
      year1: {
        semA: ['MA1200/MA1300', 'EE1001', 'CS1302', 'GE1354'],
        semB: ['MA1201/MA1301', 'PHY1202', 'EE1004', 'EE1002'],
      },
      year2: {
        semA: ['MA2001', 'EE2000', 'EE2005', 'CS2311'],
        semB: ['EE2800', 'EE3121', 'EE3210', 'EE2104'],
        summer: [],
      },
      year3: {
        semA: ['EE3800', 'EE3008', 'EE3801', 'EE2004'],
        semB: ['MEE-ELECTIVE1', 'EE3115', 'EE3122', 'EE3220', 'EE3070'],
        summer: ['EE4090'],
      },
      year4: {
        semA: ['MEE-ELECTIVE2', 'MEE-ELECTIVE3', 'EE4080', 'EE2066'],
        semB: ['EE4080', 'MEE-ELECTIVE4', 'MEE-ELECTIVE5', 'MEE-ELECTIVE6'],
      },
    },
  }

  for (const [code, years] of Object.entries(expected)) {
    for (const [yearKey, semesters] of Object.entries(years)) {
      for (const [semester, codes] of Object.entries(semesters)) {
        assert.deepEqual(major(code).studyPlan?.[yearKey]?.[semester]?.courses.map(course => course.code), codes, `${code} ${yearKey}.${semester}`)
      }
    }
  }
})

test('EE requirements use the official 2026/27 credit partitions and course pools', () => {
  assert.equal(major('BENG1_CDE-1').totalCredits, 121)
  assert.equal(major('BENG1_ELEL-1').totalCredits, 121)
  assert.equal(major('BENG1_INFE-1').totalCredits, 121)
  assert.equal(major('BENG1_MEE-1').totalCredits, 120)

  assert.deepEqual(requirementCredits('BENG1_CDE-1'), { gatewayEducation: 22, college: 6, collegeRequirement: 9, majorCore: 69, majorElectives: 15, freeElectives: 0 })
  assert.deepEqual(requirementCredits('BENG1_ELEL-1'), { gatewayEducation: 22, college: 6, collegeRequirement: 9, majorCore: 69, majorElectives: 15, freeElectives: 0 })
  assert.deepEqual(requirementCredits('BENG1_INFE-1'), { gatewayEducation: 22, college: 6, collegeRequirement: 9, majorCore: 69, majorElectives: 15, freeElectives: 0 })
  assert.deepEqual(requirementCredits('BENG1_MEE-1'), { gatewayEducation: 21, college: 6, collegeRequirement: 9, majorCore: 66, majorElectives: 18, freeElectives: 0 })

  const infeCore = new Set(major('BENG1_INFE-1').requirements.majorCore.courses.map(course => course.code))
  assert.equal(infeCore.has('EE2303'), true)
  assert.equal(infeCore.has('EE2005'), false)

  const meeCollege = new Set(major('BENG1_MEE-1').requirements.college.courses.map(course => course.code))
  assert.equal(meeCollege.has('PHY1202'), true)
  assert.equal(meeCollege.has('PHY1101'), false)
  assert.equal(major('BENG1_MEE-1').requirements.majorElectives.courses.some(course => course.code === 'MSE4171'), true)

  for (const code of ['BENG1_CDE-1', 'BENG1_ELEL-1', 'BENG1_INFE-1', 'BENG1_MEE-1']) {
    const item = major(code)
    const poolCodes = new Set(buildCoursePool(item, courses).map(course => course.code))
    for (const elective of item.requirements.majorElectives.courses) {
      assert.ok(courses[elective.code], `${code} ${elective.code} should have a course detail record`)
      assert.ok(poolCodes.has(elective.code), `${code} ${elective.code} should be available in the editable course pool`)
    }
  }
})

test('EE plans preserve official flexible and cross-semester placement labels', () => {
  for (const code of ['BENG1_CDE-1', 'BENG1_ELEL-1', 'BENG1_INFE-1', 'BENG1_MEE-1']) {
    assert.equal(plannedCourse(code, 1, 'semA', 'EE1001').officialPlacement, 'Year 1 Semester A or B')
    assert.equal(plannedCourse(code, 3, 'summer', 'EE4090').officialPlacement, 'Year 2 or 3 Summer')
    assert.equal(plannedCourse(code, 4, 'semA', 'EE4080').officialPlacement, 'Year 4 Semesters A and B')
    assert.match(major(code).studyPlanSourceUrl, /^https:\/\/www\.ee\.cityu\.edu\.hk\/.+\.pdf/)
    assert.equal(major(code).studyPlanRevision, 'ee-2026-27-v2')
  }

  assert.equal(plannedCourse('BENG1_CDE-1', 3, 'semA', 'EE3070').officialPlacement, 'Year 3 Semester A or B')
  assert.equal(plannedCourse('BENG1_INFE-1', 3, 'semA', 'EE3070').officialPlacement, 'Year 3 Semester A or B')
})

test('EE core GE-coded courses do not double count toward University GE requirements', async () => {
  const { auditGraduationPlan } = await import('../src/utils/graduationAudit.ts')

  for (const code of ['BENG1_CDE-1', 'BENG1_ELEL-1', 'BENG1_INFE-1', 'BENG1_MEE-1']) {
    const item = major(code)
    const audit = auditGraduationPlan(item, courses, generateStudyPlan(item, courses))
    assert.equal(audit.ge.plannedCredits, 0, `${code} must not count GE1354 twice`)
    assert.deepEqual(audit.ge.areaCredits, { 'Area 1': 0, 'Area 2': 0, 'Area 3': 0 })
    assert.equal(audit.ge.missingCredits, item.requirements.gatewayEducation.credits)
  }
})

test('official EE plans do not inherit false prerequisite conflicts from catalogue parsing', async () => {
  const { auditGraduationPlan } = await import('../src/utils/graduationAudit.ts')

  assert.deepEqual(courses.PHY1202.prerequisites, [])
  assert.match(courses.PHY1202.prerequisitesRaw, /HKDSE Mathematics Compulsory Part/)

  for (const code of ['BENG1_CDE-1', 'BENG1_ELEL-1', 'BENG1_INFE-1', 'BENG1_MEE-1']) {
    const item = major(code)
    const audit = auditGraduationPlan(item, courses, generateStudyPlan(item, courses))
    assert.deepEqual(
      audit.planRisks.issues.filter(issue => issue.kind === 'prerequisite'),
      [],
      `${code} should not contradict its official flowchart with a parsed prerequisite warning`,
    )
  }
})

test('corrected official plans use a revisioned local storage key', async () => {
  const editPlan = await import('../src/utils/editPlan.ts')
  assert.equal(typeof editPlan.getStudyPlanStorageKey, 'function')
  assert.equal(
    editPlan.getStudyPlanStorageKey(major('BENG1_INFE-1')),
    'cityu-study-plan-BENG1_INFE-1-rev-ee-2026-27-v2',
  )
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

test('MGT restores the user-supplied official HRM/SIM schedule', () => {
  const mgt = major('BBA1_MGMT-1')
  const mgtCourseList = new Set(getAllMajorCourses(mgt).map((course) => course.code))

  assert.equal(mgt.totalCredits, 121)
  assert.equal(mgt.studyPlanStatus, 'official')
  assert.equal(planCredits(mgt), 121)
  assert.deepEqual(semesterCodes(mgt.code, 1, 'semA'), ['CB2201', 'CB2601', 'CB2400', 'GE-DR1', 'GE1601', 'GE1401'])
  assert.deepEqual(semesterCodes(mgt.code, 2, 'semA'), ['CB2402', 'CB2101', 'CB2200', 'MGT3306', 'MGT2324'])
  assert.deepEqual(semesterCodes(mgt.code, 3, 'semA'), ['CB2203', 'MGT3305', 'MGT4227', 'GE1501', 'MINOR2'])
  assert.ok(mgtCourseList.has('CB2240'))
  assert.ok(mgtCourseList.has('CB2203'))
  assert.ok(mgt.streams.find((stream) => stream.code === 'HRM')?.allCourses.includes('MGT4307'))
  assert.ok(mgt.streams.find((stream) => stream.code === 'SIM')?.allCourses.includes('MGT4310'))
  assert.ok(mgt.streams.every((stream) => stream.studyPlanStatus === 'official' && planCredits(stream) === 121))
})

test('CFFT exposes separate official CF and FT stream plans', () => {
  const cfft = major('BSC1_CFFT-1')
  const cfElectives = [
    'CB2300', 'CB3043', 'CS3391', 'CS4335', 'EF4312', 'EF4314', 'EF4323', 'EF4327',
    'EF4331', 'EF4334', 'MA3514', 'MA4542', 'MS3106', 'MS4212', 'MS4224', 'MS4252',
  ]
  const ftElectives = [
    'CB2101', 'CB2201', 'CB2300', 'CB2402', 'CB2601', 'CB3043', 'EF4312', 'EF4323',
    'IS2502', 'IS3230', 'IS3430', 'IS4032', 'IS4537', 'IS4543', 'MKT3603', 'MGT2324',
  ]

  assert.deepEqual(cfft.streams.map((stream) => stream.code), ['CF', 'FT'])
  assert.equal(cfft.defaultStreamCode, 'CF')
  assert.equal(cfft.requireStreamSelection, true)

  const cf = streamByCode(cfft, 'CF')
  const ft = streamByCode(cfft, 'FT')
  assert.equal(cf.studyPlanStatus, 'structure')
  assert.equal(ft.studyPlanStatus, 'structure')
  assert.match(cf.studyPlanSourceUrl, /comfin-stream---23-june-2025_addge1601\.pdf/i)
  assert.match(ft.studyPlanSourceUrl, /fintech-stream---23-june-2025_addge1601\.pdf/i)

  assert.deepEqual(streamSemesterCodes(cfft, 'CF', 3, 'semB'), ['EF4822', 'EF4820', 'MS3111', 'GE-A2', 'GE-A3'])
  assert.deepEqual(streamSemesterCodes(cfft, 'CF', 4, 'semA'), ['EF4821', 'CB4001', 'STREAM-ELECT1', 'FREE1', 'FREE2'])
  assert.deepEqual(streamSemesterCodes(cfft, 'FT', 3, 'semB'), ['IS4335', 'IS3101', 'IS4940', 'GE-A2', 'GE-A3'])
  assert.deepEqual(streamSemesterCodes(cfft, 'FT', 4, 'semA'), ['IS4920', 'IS4861', 'IS4837', 'FREE1', 'FREE2'])
  assert.equal(streamPlanCredits(cfft, 'CF'), 124)
  assert.equal(streamPlanCredits(cfft, 'FT'), 124)

  const cfPlanCodes = new Set(planCourseCodes(cf))
  const ftPlanCodes = new Set(planCourseCodes(ft))
  assert.equal(cfPlanCodes.has('EF4821'), true)
  assert.equal(cfPlanCodes.has('IS4861'), false)
  assert.equal(ftPlanCodes.has('IS4861'), true)
  assert.equal(ftPlanCodes.has('EF4821'), false)
  assert.deepEqual(cf.requirements.majorElectives.courses.map((course) => course.code), cfElectives)
  assert.deepEqual(ft.requirements.majorElectives.courses.map((course) => course.code), ftElectives)
  assert.equal(cf.requirements.majorElectives.chooseCredits, 6)
  assert.equal(ft.requirements.majorElectives.chooseCredits, 6)
})

test('mandatory stream selection defaults CFFT to CF without changing optional stream majors', async () => {
  const { getInitialStreamIndex, canUseMajorLevelPlan } = await import('../src/utils/majorStreams.ts')
  const cfft = {
    ...major('BSC1_CFFT-1'),
    streams: [{ code: 'CF' }, { code: 'FT' }],
    defaultStreamCode: 'CF',
    requireStreamSelection: true,
  }

  assert.equal(getInitialStreamIndex(cfft), 0)
  assert.equal(canUseMajorLevelPlan(cfft), false)
  assert.equal(getInitialStreamIndex(major('BBA1_MGMT-1')), -1)
  assert.equal(canUseMajorLevelPlan(major('BBA1_MGMT-1')), true)
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

test('flagship pathways expose non-empty derived plans inherited from their underlying majors', () => {
  const flagshipCodes = ['BSEE_INSPIRE-1', 'CBIO_BIO3-1', 'CC_ACT-1', 'CENG_PRIME-1', 'SCM_CREATE-1', 'CSCI_GREAT-1']

  for (const code of flagshipCodes) {
    const item = major(code)
    assert.equal(item.studyPlanStatus, 'derived')
    const generated = generateStudyPlan(item, courses)
    assert.equal(generated.some((semester) => semester.courses.length > 0), true, `${code} should expose a reference schedule`)
    assert.ok(item.streams?.length > 0, `${code} should expose official underlying majors as streams`)
    assert.ok(item.streams.every((stream) => stream.studyPlanStatus === 'derived' && planCourseCodes(stream).length > 0))
    assert.ok(item.notes.some((note) => /not an explicit official|不是官网明确/i.test(note)), `${code} should disclose that its semester plan is derived`)
  }
})

test('programmes without an official semester schedule expose non-empty derived reference plans', () => {
  const derivedCodes = ['BBA1_BE2-1', 'BBA1_FIN3-1', 'BBA1_MKT1-1', 'BA1_TVB-1', 'BA1_MDCM-1', 'BSS1_IRGA-1', 'BSS1_CRSO-1']

  for (const code of derivedCodes) {
    const item = major(code)
    assert.equal(item.studyPlanStatus, 'derived', `${code} should be marked as a derived reference plan`)
    assert.ok(item.notes.some((note) => /not an explicit official|不是官网明确/i.test(note)), `${code} should explain the reference-plan status`)
    assert.equal(item.notes.some((note) => /intentionally blank/i.test(note)), false, `${code} should not retain the obsolete blank-DIY disclosure`)
    assert.ok(planCourseCodes(item).length > 0, `${code} should expose a usable reference plan`)
    assert.equal(planCredits(item), item.totalCredits, `${code} reference plan should match its displayed graduation total`)
    assert.ok(item.allCourses.length > 0, `${code} should retain the official course pool`)
  }
})

test('flagship overlays preserve their programme-specific requirements', () => {
  const inspire = major('BSEE_INSPIRE-1')
  assert.deepEqual(inspire.streams.map((stream) => stream.code), ['ESE', 'EVE'])
  assert.equal(streamPlanCredits(inspire, 'ESE'), 132)
  assert.equal(streamPlanCredits(inspire, 'EVE'), 130)
  for (const stream of inspire.streams) {
    const codes = new Set(planCourseCodes(stream))
    assert.ok(codes.has('SEE4993'))
    assert.ok(codes.has('SEE4994'))
    assert.ok(codes.has('SEE4998'))
    assert.ok(codes.has('FLAGSHIP-EXCHANGE'))
  }

  const bio3 = major('CBIO_BIO3-1')
  assert.deepEqual(bio3.streams.map((stream) => stream.code), ['BME', 'BISI', 'BMS'])
  assert.ok(bio3.streams.every((stream) => planCourseCodes(stream).includes('CBM4000')))
  assert.ok(bio3.streams.every((stream) => planCourseCodes(stream).includes('CBM4001')))
  assert.ok(bio3.streams.every((stream) => planCredits(stream) === 128))

  const act = major('CC_ACT-1')
  assert.ok(planCourseCodes(streamByCode(act, 'CSC')).includes('DSC3026'))
  assert.ok(planCourseCodes(streamByCode(act, 'CYBE')).includes('DSC3026'))
  assert.ok(['DSC3001', 'DSC3025', 'DSC3026'].every((code) => planCourseCodes(streamByCode(act, 'DSC')).includes(code)))
  assert.ok(['DSC3025', 'DSC3026', 'DSC4016'].every((code) => planCourseCodes(streamByCode(act, 'DSE')).includes(code)))

  const prime = major('CENG_PRIME-1')
  assert.deepEqual(prime.streams.map((stream) => stream.code), ['ARCE', 'CEG', 'CDE', 'ELEL', 'INFE', 'ITME', 'MASE', 'ME', 'NRE'])
  assert.ok(prime.streams.every((stream) => planCredits(stream) === 121))

  const create = major('SCM_CREATE-1')
  assert.ok(create.streams.every((stream) => planCredits(stream) === 124))
  assert.ok(create.streams.every((stream) => ['SM2724A', 'SM2724B', 'SM2724C'].every((code) => planCourseCodes(stream).includes(code))))

  const great = major('CSCI_GREAT-1')
  assert.ok(great.streams.every((stream) => planCredits(stream) === 121))
  assert.ok(['CHEM4086', 'CHEM4087'].every((code) => planCourseCodes(streamByCode(great, 'CHEM')).includes(code)))
  assert.ok(['MA3510', 'MA4510'].every((code) => planCourseCodes(streamByCode(great, 'CM')).includes(code)))
  assert.ok(['PHY4218', 'PHY4219'].every((code) => planCourseCodes(streamByCode(great, 'PHY')).includes(code)))
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
  assert.equal(getStudyPlanSourceStatus(major('CBIO_BIO3-1')).kind, 'derived')
  assert.equal(getStudyPlanSourceStatus({}).kind, 'diy')
})

test('undergraduate offering checks are advisory and never rewrite source schedules', () => {
  const conflicts = []

  for (const item of majors) {
    conflicts.push(...collectOfferingConflicts(item, item.studyPlan, 'major'))
    for (const stream of item.streams ?? []) {
      conflicts.push(...collectOfferingConflicts(item, stream.studyPlan, `stream:${stream.code ?? stream.title ?? 'unnamed'}`))
    }
  }

  assert.ok(Array.isArray(conflicts))
  const offeringAudit = readFileSync(new URL('../scripts/align-study-plan-offerings.mjs', import.meta.url), 'utf8')
  assert.match(offeringAudit, /no study plan was modified/i)
  assert.doesNotMatch(offeringAudit, /writeFileSync/)
  assert.deepEqual(semesterCodes('BENG1_BME-1', 4, 'semB').slice(0, 2), ['BME4102', 'BME2066'])
})

test('derived undergraduate reference plans avoid confirmed offering-term conflicts', async () => {
  const { auditPlanRisks, studyPlanToRiskSemesters } = await import('../src/utils/planRiskAudit.ts')
  const conflicts = []

  for (const item of majors.filter((candidate) => candidate.studyPlanStatus === 'derived')) {
    const entities = [['main', item], ...(item.streams ?? []).map((stream) => [stream.code ?? stream.name ?? 'stream', stream])]
    for (const [label, entity] of entities) {
      const risks = auditPlanRisks({ plan: studyPlanToRiskSemesters(entity.studyPlan), courses })
      for (const issue of risks.issues.filter((candidate) => candidate.kind === 'offering-term')) {
        conflicts.push(`${item.code}/${label}: ${issue.code} ${issue.message}`)
      }
    }
  }

  assert.deepEqual(conflicts, [])
})

test('constructed undergraduate stream overlays follow confirmed offering terms', async () => {
  const { auditPlanRisks, studyPlanToRiskSemesters } = await import('../src/utils/planRiskAudit.ts')
  const targets = [
    ['BSC1_CRM1-1', 'GAME'],
    ['BSC1_CRM1-1', 'ANIMATION'],
    ['BSC1_CRM1-1', 'INTERACTION'],
  ]
  const conflicts = []

  for (const [majorCode, streamCode] of targets) {
    const entity = streamByCode(major(majorCode), streamCode)
    const risks = auditPlanRisks({ plan: studyPlanToRiskSemesters(entity.studyPlan), courses })
    for (const issue of risks.issues.filter((candidate) => candidate.kind === 'offering-term')) {
      conflicts.push(`${majorCode}/${streamCode}: ${issue.code} ${issue.message}`)
    }
  }

  assert.deepEqual(conflicts, [])
})

test('postgraduate study plans place real courses only in confirmed offering semesters', () => {
  const conflicts = []

  for (const programme of postgraduateProgrammes) {
    conflicts.push(...collectPostgraduateOfferingConflicts(programme, programme.studyPlan, 'programme'))
    for (const variant of programme.studyPlanVariants ?? []) {
      conflicts.push(...collectPostgraduateOfferingConflicts(programme, variant.studyPlan, `variant:${variant.code ?? 'unnamed'}`))
    }
  }

  assert.deepEqual(conflicts, [])
})

test('plan risk audit explains offering, prerequisite, load, GE and cross-term issues', async () => {
  const { auditPlanRisks } = await import('../src/utils/planRiskAudit.ts')
  const syntheticCourses = {
    ...courses,
    TEST1000: {
      code: 'TEST1000',
      title: 'Synthetic Foundation',
      credits: 3,
      department: 'Test',
      prerequisites: [],
      semester: 'Semester A 2026/27',
      assessment: {},
      pdfUrl: '',
      courseUrl: '',
    },
    TEST2000: {
      code: 'TEST2000',
      title: 'Synthetic Semester B Course',
      credits: 3,
      department: 'Test',
      prerequisites: ['TEST1000'],
      prerequisitesRaw: 'TEST1000',
      semester: 'Semester B 2026/27',
      assessment: {},
      pdfUrl: '',
      courseUrl: '',
    },
    TEST3000: {
      code: 'TEST3000',
      title: 'Synthetic Suspended Course',
      credits: 3,
      department: 'Test',
      prerequisites: [],
      semester: 'Not offering in current academic year',
      assessment: {},
      pdfUrl: '',
      courseUrl: '',
    },
    TEST4999: {
      code: 'TEST4999',
      title: 'Synthetic Final Year Project',
      credits: 6,
      department: 'Test',
      prerequisites: [],
      semester: 'Semester A 2026/27, Semester B 2026/27',
      assessment: {},
      pdfUrl: '',
      courseUrl: '',
    },
  }
  const plan = [
    {
      year: 1,
      sem: 'A',
      courses: [
        { code: 'TEST2000', title: 'Synthetic Semester B Course', credits: 3, category: 'majorCore', semester: '' },
        { code: 'TEST3000', title: 'Synthetic Suspended Course', credits: 3, category: 'majorCore', semester: '' },
        { code: 'TEST4999', title: 'Synthetic Final Year Project', credits: 3, category: 'majorCore', semester: '' },
        { code: 'GE1401', title: 'University English', credits: 3, category: 'ge', semester: '' },
        { code: 'GE1501', title: 'Chinese Civilisation - History and Philosophy', credits: 3, category: 'ge', semester: '' },
        { code: 'GE1601', title: 'Whole-Person Development', credits: 1, category: 'ge', semester: '' },
        { code: 'FREE1', title: 'Free Elective', credits: 9, category: 'freeElective', semester: '' },
      ],
      totalCredits: 25,
    },
    {
      year: 1,
      sem: 'B',
      courses: [
        { code: 'TEST4999', title: 'Synthetic Final Year Project', credits: 3, category: 'majorCore', semester: '' },
      ],
      totalCredits: 3,
    },
  ]

  const risks = auditPlanRisks({
    plan,
    courses: syntheticCourses,
    ge: {
      missingAreas: ['Area 2'],
      missingCredits: 6,
    },
  })

  assert.equal(risks.status, 'danger')
  assert.ok(risks.issues.some((issue) => issue.kind === 'offering-term' && issue.code === 'TEST2000' && issue.suggestion.includes('Semester B')))
  assert.ok(risks.issues.some((issue) => issue.kind === 'not-offering' && issue.code === 'TEST3000'))
  assert.ok(risks.issues.some((issue) => issue.kind === 'prerequisite' && issue.code === 'TEST2000' && issue.codes.includes('TEST1000')))
  assert.ok(risks.issues.some((issue) => issue.kind === 'semester-load' && issue.severity === 'danger'))
  assert.ok(risks.issues.some((issue) => issue.kind === 'ge-area' && issue.message.includes('Area 2')))
  assert.ok(risks.issues.some((issue) => issue.kind === 'cross-term-project' && issue.code === 'TEST4999' && issue.severity === 'info'))
})

test('graduation audit catches removed required course and GE area gaps', async () => {
  const { auditGraduationPlan } = await import('../src/utils/graduationAudit.ts')
  const bme = major('BENG1_BME-1')
  const plan = generateStudyPlan(bme, courses).map((semester) => {
    const keptCourses = semester.courses.filter((course) => course.code !== 'GE1401' && !/^GE-DR/.test(course.code))
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

test('graduation audit marks derived requirements-based plans as advisory', async () => {
  const { auditGraduationPlan } = await import('../src/utils/graduationAudit.ts')
  const requirementsMajor = major('BBA1_BE2-1')
  const flagshipMajor = major('CBIO_BIO3-1')

  const requirementsOnly = auditGraduationPlan(requirementsMajor, courses, generateStudyPlan(requirementsMajor, courses))
  const flagship = auditGraduationPlan(flagshipMajor, courses, generateStudyPlan(flagshipMajor, courses), 0)

  assert.equal(requirementsOnly.source.kind, 'derived')
  assert.equal(requirementsOnly.source.advisory, true)
  assert.equal(flagship.source.kind, 'derived')
  assert.equal(flagship.source.advisory, true)
  assert.ok(flagship.warnings.some((warning) => warning.kind === 'source-confidence' && warning.message.includes('参考排课')))
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
  assert.ok(eseAudit.splitCourses.some((item) => item.code === 'SEE4997' && item.count === 2))
  assert.equal(eveAudit.duplicates.some((item) => item.code === 'SEE4996'), false)
  assert.equal(eveAudit.warnings.some((warning) => warning.kind === 'duplicate' && warning.codes.includes('SEE4996')), false)
  assert.ok(eveAudit.splitCourses.some((item) => item.code === 'SEE4996' && item.count === 2))
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

test('graduation audit parses range requirements and classifies Computing Mathematics plan credits', async () => {
  const { auditGraduationPlan } = await import('../src/utils/graduationAudit.ts')
  const cm = major('BSC1_CM-1')
  const audit = auditGraduationPlan(cm, courses, generateStudyPlan(cm, courses))
  const sectionByKey = Object.fromEntries(audit.sections.map((section) => [section.key, section]))

  assert.equal(sectionByKey.majorElectives?.requiredCredits, 18)
  assert.equal(sectionByKey.freeElectives?.requiredCredits, 20)
  assert.equal(sectionByKey.gatewayEducation?.plannedCredits, 31)
  assert.equal(sectionByKey.gatewayEducation?.missingCredits, 0)
  assert.equal(sectionByKey.majorElectives?.missingCredits, 0)
  assert.equal(sectionByKey.freeElectives?.missingCredits, 0)
  assert.ok(sectionByKey.collegeRequirement?.plannedCredits >= 6)
  assert.equal(sectionByKey.majorCore?.plannedCredits, 45)
  assert.equal(sectionByKey.majorCore?.missingCredits, 0)
  assert.equal(sectionByKey.college?.requiredCredits ?? 0, 0)
  assert.equal(sectionByKey.college?.plannedCredits ?? 0, 0)
  assert.equal(audit.ge.missingAreas.length, 0)
  assert.equal(audit.warnings.some((warning) => warning.kind === 'ge-area'), false)
  assert.equal(audit.warnings.some((warning) => warning.kind === 'offering-term' && warning.codes.includes('GE2401')), false)
  assert.equal(
    audit.warnings.some((warning) => warning.kind === 'prerequisite' && warning.codes.includes('MA2503') && warning.codes.includes('MA1201')),
    false
  )
})

test('range credit requirements are audited with their lower bound across undergraduate entities', async () => {
  const { auditGraduationPlan } = await import('../src/utils/graduationAudit.ts')

  const cases = [
    { code: 'BA1_CHIS-1', streamIndex: undefined, majorElectives: 18, freeElectives: 18 },
    { code: 'BSC1_CM-1', streamIndex: undefined, majorElectives: 18, freeElectives: 20 },
    {
      code: 'CSCI_GREAT-1',
      streamIndex: major('CSCI_GREAT-1').streams.findIndex((stream) => stream.code === 'CM'),
      majorElectives: 0,
      freeElectives: 22,
    },
  ]

  for (const item of cases) {
    const entity = major(item.code)
    const audit = auditGraduationPlan(entity, courses, generateStudyPlan(entity, courses, item.streamIndex), item.streamIndex)
    const sectionByKey = Object.fromEntries(audit.sections.map((section) => [section.key, section]))

    assert.equal(sectionByKey.majorElectives?.requiredCredits ?? 0, item.majorElectives, `${item.code} major electives`)
    assert.equal(sectionByKey.freeElectives?.requiredCredits, item.freeElectives, `${item.code} free electives`)
  }
})

test('non-DIY generated plans do not display planned credits against zero-credit requirement buckets', async () => {
  const { auditGraduationPlan } = await import('../src/utils/graduationAudit.ts')
  const { getStudyPlanSourceStatus } = await import('../src/utils/sourceStatus.ts')
  const reports = []

  for (const item of majors) {
    const entities = [{ streamIndex: undefined, entity: item }]
    for (let streamIndex = 0; streamIndex < (item.streams?.length ?? 0); streamIndex += 1) {
      entities.push({ streamIndex, entity: item.streams[streamIndex] })
    }

    for (const { streamIndex, entity } of entities) {
      if (getStudyPlanSourceStatus(entity).kind === 'diy') continue
      const audit = auditGraduationPlan(item, courses, generateStudyPlan(item, courses, streamIndex), streamIndex)
      for (const section of audit.sections) {
        if (section.requiredCredits === 0 && section.plannedCredits > 0) {
          reports.push(`${item.code}${streamIndex == null ? '' : `/${entity.code}`}: ${section.key} ${section.plannedCredits}/0`)
        }
      }
    }
  }

  assert.deepEqual(reports, [])
})

test('official generated plans do not report duplicate course conflicts', async () => {
  const { auditGraduationPlan } = await import('../src/utils/graduationAudit.ts')
  const { getStudyPlanSourceStatus } = await import('../src/utils/sourceStatus.ts')
  const duplicateReports = []

  for (const item of majors) {
    const entities = [{ streamIndex: undefined, entity: item }]
    for (let streamIndex = 0; streamIndex < (item.streams?.length ?? 0); streamIndex += 1) {
      entities.push({ streamIndex, entity: item.streams[streamIndex] })
    }

    for (const { streamIndex, entity } of entities) {
      if (getStudyPlanSourceStatus(entity).kind === 'diy') continue
      const audit = auditGraduationPlan(item, courses, generateStudyPlan(item, courses, streamIndex), streamIndex)
      for (const duplicate of audit.duplicates) {
        duplicateReports.push(`${item.code}${streamIndex == null ? '' : `/${entity.code}`}: ${duplicate.code}`)
      }
    }
  }

  assert.deepEqual(duplicateReports, [])
})

test('official generated plans satisfy their major elective credit requirements', async () => {
  const { auditGraduationPlan } = await import('../src/utils/graduationAudit.ts')
  const { getStudyPlanSourceStatus } = await import('../src/utils/sourceStatus.ts')
  const missingReports = []

  for (const item of majors) {
    const entities = [{ streamIndex: undefined, entity: item }]
    for (let streamIndex = 0; streamIndex < (item.streams?.length ?? 0); streamIndex += 1) {
      entities.push({ streamIndex, entity: item.streams[streamIndex] })
    }

    for (const { streamIndex, entity } of entities) {
      if (getStudyPlanSourceStatus(entity).kind === 'diy') continue
      const audit = auditGraduationPlan(item, courses, generateStudyPlan(item, courses, streamIndex), streamIndex)
      const majorElectives = audit.sections.find((section) => section.key === 'majorElectives')
      if (majorElectives?.missingCredits > 0) {
        missingReports.push(
          `${item.code}${streamIndex == null ? '' : `/${entity.code}`}: ${majorElectives.plannedCredits}/${majorElectives.requiredCredits}`
        )
      }
    }
  }

  assert.deepEqual(missingReports, [])
})

test('generated undergraduate audits do not escalate advisory planning gaps into hard conflicts', async () => {
  const { auditGraduationPlan } = await import('../src/utils/graduationAudit.ts')
  const { getStudyPlanSourceStatus } = await import('../src/utils/sourceStatus.ts')
  const reports = []

  for (const item of majors) {
    const entities = [{ streamIndex: undefined, entity: item }]
    for (let streamIndex = 0; streamIndex < (item.streams?.length ?? 0); streamIndex += 1) {
      entities.push({ streamIndex, entity: item.streams[streamIndex] })
    }

    for (const { streamIndex, entity } of entities) {
      const sourceKind = getStudyPlanSourceStatus(entity).kind
      const audit = auditGraduationPlan(item, courses, generateStudyPlan(item, courses, streamIndex), streamIndex)
      for (const warning of audit.warnings) {
        if (warning.severity === 'danger') {
          reports.push(`${item.code}${streamIndex == null ? '' : `/${entity.code}`} ${sourceKind}: ${warning.kind} ${warning.codes.join(',')}`)
        }
      }
    }
  }

  assert.deepEqual(reports, [])
})

test('empty DIY undergraduate grids expose requirements without hard audit warnings', async () => {
  const { auditGraduationPlan } = await import('../src/utils/graduationAudit.ts')
  const { getStudyPlanSourceStatus } = await import('../src/utils/sourceStatus.ts')
  const reports = []

  for (const item of majors) {
    const entities = [{ streamIndex: undefined, entity: item }]
    for (let streamIndex = 0; streamIndex < (item.streams?.length ?? 0); streamIndex += 1) {
      entities.push({ streamIndex, entity: item.streams[streamIndex] })
    }

    for (const { streamIndex, entity } of entities) {
      if (getStudyPlanSourceStatus(entity).kind !== 'diy') continue
      const audit = auditGraduationPlan(item, courses, generateStudyPlan(item, courses, streamIndex), streamIndex)
      if (audit.totalCredits.planned !== 0) continue
      const hardWarnings = audit.warnings.filter((warning) => warning.severity === 'danger')
      for (const warning of hardWarnings) {
        reports.push(`${item.code}${streamIndex == null ? '' : `/${entity.code}`}: ${warning.kind}`)
      }
    }
  }

  assert.deepEqual(reports, [])
})

test('graduation audit panel is wired into major and edit views', () => {
  const panel = readFileSync(new URL('../src/components/GraduationAuditPanel.tsx', import.meta.url), 'utf8')
  const majorPage = readFileSync(new URL('../src/pages/MajorPage.tsx', import.meta.url), 'utf8')
  const editor = readFileSync(new URL('../src/components/StudyPlanEditor.tsx', import.meta.url), 'utf8')

  assert.ok(panel.includes('毕业要求自检'))
  assert.ok(panel.includes('跨学期'))
  assert.ok(panel.includes('PlanRiskPanel'))
  assert.ok(panel.includes('audit.totalCredits.planned'))
  assert.ok(majorPage.includes('GraduationAuditPanel'))
  assert.ok(majorPage.includes('auditGraduationPlan'))
  assert.ok(majorPage.includes("void import('../data/courses.json')"))
  assert.ok(majorPage.includes('officialPlacement: c.officialPlacement'))
  assert.ok(majorPage.includes('officialPlacement={c.officialPlacement}'))
  assert.ok(editor.includes('GraduationAuditPanel'))
  assert.ok(editor.includes('auditGraduationPlan'))
  assert.ok(editor.includes('officialPlacement={c.officialPlacement}'))
})

test('plan risk panel is wired into undergraduate and postgraduate planning views', () => {
  const panel = readFileSync(new URL('../src/components/PlanRiskPanel.tsx', import.meta.url), 'utf8')
  const postgraduatePage = readFileSync(new URL('../src/pages/PostgraduateDetailPage.tsx', import.meta.url), 'utf8')
  const postgraduateEditor = readFileSync(new URL('../src/components/PostgraduatePlanEditor.tsx', import.meta.url), 'utf8')

  assert.ok(panel.includes('规划风险'))
  assert.ok(panel.includes('建议'))
  assert.ok(postgraduatePage.includes('auditPlanRisks'))
  assert.ok(postgraduatePage.includes('studyPlanToRiskSemesters'))
  assert.ok(postgraduatePage.includes('PlanRiskPanel'))
  assert.ok(postgraduateEditor.includes('auditPlanRisks'))
  assert.ok(postgraduateEditor.includes('studyPlanToRiskSemesters'))
  assert.ok(postgraduateEditor.includes('PlanRiskPanel'))
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

test('ge helper filters by unit, level, term, and assessment profile', async () => {
  const { filterGECourses } = await import('../src/utils/geCourses.ts')
  const items = [
    {
      code: 'GE1111',
      title: 'Arts Course',
      credits: 3,
      area: 'Area 1',
      offeringUnit: 'LT',
      level: 'B1',
      terms: ['2025-26 Sem A'],
      sourceUrl: '',
      continuousPercent: 70,
      examPercent: 30,
      hasFinalExam: true,
      hasAssessment: true,
      course: {},
    },
    {
      code: 'GE2222',
      title: 'Society Course',
      credits: 3,
      area: 'Area 2',
      offeringUnit: 'SS',
      level: 'B2',
      terms: ['2025-26 Sem B'],
      sourceUrl: '',
      continuousPercent: 100,
      examPercent: 0,
      hasFinalExam: false,
      hasAssessment: true,
      course: {},
    },
  ]

  assert.deepEqual(
    filterGECourses(items, { query: '', area: 'all', exam: 'any', unit: 'SS', level: 'B2', term: '2025-26 Sem B', assessment: 'ca-only' }).map((item) => item.code),
    ['GE2222']
  )
  assert.deepEqual(
    filterGECourses(items, { query: '', area: 'all', exam: 'any', unit: 'LT', level: 'all', term: 'all', assessment: 'has-exam' }).map((item) => item.code),
    ['GE1111']
  )
})

test('ge shortlist helpers toggle and normalize saved course codes', async () => {
  const { toggleGEShortlist, serializeGEShortlist, parseGEShortlist } = await import('../src/utils/geShortlist.ts')

  const first = toggleGEShortlist([], ' ge1111 ')
  assert.deepEqual(first, ['GE1111'])
  assert.deepEqual(toggleGEShortlist(first, 'GE1111'), [])
  assert.deepEqual(parseGEShortlist(serializeGEShortlist(['GE1111', 'GE2222'])), ['GE1111', 'GE2222'])
  assert.deepEqual(parseGEShortlist('not json'), [])
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
  assert.ok(summary.counts.derived >= 13)
  assert.equal(summary.counts.diy, 0)
  assert.equal(summary.needsReviewCount, summary.counts.structure + summary.counts.derived + summary.counts.diy)

  const derivedMajors = filterMajorsBySource(majors, 'derived')
  assert.ok(derivedMajors.some((item) => item.code === 'CBIO_BIO3-1'))
  assert.equal(derivedMajors.every((item) => item.source.kind === 'derived'), true)
})

test('global search can filter major results by source confidence', async () => {
  const { buildSearchIndex, searchPlanner } = await import('../src/utils/searchIndex.ts')
  const index = buildSearchIndex(majors, courses)

  const requirementsDerived = searchPlanner(index, 'business', { sourceKind: 'derived', limit: 20 })
  assert.ok(requirementsDerived.majors.some((item) => item.code === 'BBA1_BE2-1'))
  assert.equal(requirementsDerived.majors.every((item) => item.sourceKind === 'derived'), true)

  const derived = searchPlanner(index, 'PRIME', { sourceKind: 'derived', limit: 20 })
  assert.deepEqual(derived.majors.map((item) => item.code), ['CENG_PRIME-1'])
})

test('major comparison summarizes credits, source confidence, and overlapping courses', async () => {
  const { buildMajorComparison, findCompareCandidates } = await import('../src/utils/majorComparison.ts')

  const comparison = buildMajorComparison(majors, ['BSC1_CSC1-1', 'BSC1_CYBE-1'])

  assert.deepEqual(comparison.items.map((item) => item.code), ['BSC1_CSC1-1', 'BSC1_CYBE-1'])
  assert.equal(comparison.items[0].totalCredits, 122)
  assert.equal(comparison.items[1].totalCredits, 121)
  assert.equal(comparison.sourceCounts.official, 2)
  assert.ok(comparison.overlaps.some((item) => item.code === 'MA1503' && item.majorCodes.length === 2))
  assert.ok(comparison.overlaps.every((item) => !isGeneric(item.code)))
  assert.equal(comparison.overlaps.some((item) => /^GE\d{4}$/.test(item.code)), false)
  assert.ok(comparison.items.every((item) => item.requirementRows.some((row) => row.key === 'majorCore' && row.credits > 0)))

  const candidates = findCompareCandidates(majors, 'computer', ['BSC1_CSC1-1'], 5)
  assert.equal(candidates.some((item) => item.code === 'BSC1_CSC1-1'), false)
  assert.ok(candidates.some((item) => item.code === 'BSC1_CYBE-1' || item.code === 'BSC1_CM-1'))
})

test('major comparison page is wired into navigation and routes', () => {
  const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')
  const layout = readFileSync(new URL('../src/components/Layout.tsx', import.meta.url), 'utf8')
  const home = readFileSync(new URL('../src/pages/Home.tsx', import.meta.url), 'utf8')

  assert.ok(app.includes('ComparePage'))
  assert.ok(app.includes('path="/compare"'))
  assert.ok(layout.includes('专业对比'))
  assert.ok(home.includes('/compare'))
})

test('postgraduate page is wired into navigation and uses official postgraduate links', () => {
  const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')
  const layout = readFileSync(new URL('../src/components/Layout.tsx', import.meta.url), 'utf8')
  const home = readFileSync(new URL('../src/pages/Home.tsx', import.meta.url), 'utf8')
  const page = readFileSync(new URL('../src/pages/PostgraduatePage.tsx', import.meta.url), 'utf8')

  assert.ok(app.includes('PostgraduatePage'))
  assert.ok(app.includes('path="/postgraduate"'))
  assert.ok(layout.includes('/postgraduate'))
  assert.ok(home.includes('/postgraduate'))
  assert.ok(page.includes("Master's Programmes"))
  assert.ok(page.includes('Research Degree Programmes'))
  assert.ok(page.includes('Professional Doctorate Programmes'))
  assert.ok(page.includes('https://www.cityu.edu.hk/pg/taught-postgraduate-programmes/list'))
  assert.ok(page.includes('https://www.cityu.edu.hk/pg/research-degree-programmes/research-areas'))
  assert.ok(page.includes('Postgraduate study plan directory'))
})

test('postgraduate programmes include official project-level study plan data', () => {
  assert.ok(postgraduateProgrammes.length >= 50)
  assert.ok(postgraduateProgrammes.some((item) => item.type === 'taught-master'))
  assert.ok(postgraduateProgrammes.some((item) => item.type === 'research-degree'))
  assert.ok(postgraduateProgrammes.some((item) => item.type === 'professional-doctorate'))

  for (const item of postgraduateProgrammes) {
    assert.ok(item.code, 'PG programme should have a code')
    assert.ok(item.title, `${item.code} should have a title`)
    assert.ok(item.award, `${item.code} should have an award`)
    assert.ok(item.type, `${item.code} should have a type`)
    assert.ok(item.college, `${item.code} should have a college`)
    assert.ok(item.department, `${item.code} should have a department`)
    assert.ok(item.url?.startsWith('https://www.cityu.edu.hk/'), `${item.code} should use official CityUHK URL`)
    assert.ok(item.sourceStatus, `${item.code} should have source status`)
    assert.ok(['official-sample', 'requirements-diy', 'research-diy'].includes(item.sourceStatus.kind))
  }
})

test('postgraduate sample and DIY plans follow official-source policy', () => {
  const mscCs = postgraduateProgrammes.find((item) => item.code === 'P53')
  const researchCs = postgraduateProgrammes.find((item) => item.code === 'RPG_CS')
  const engd = postgraduateProgrammes.find((item) => item.code === 'ENGDEM')

  assert.ok(mscCs, 'MSc Computer Science should be included')
  assert.equal(mscCs.sourceStatus.kind, 'official-sample')
  assert.ok(mscCs.studyPlanVariants.some((variant) => variant.code === 'full-time-no-stream-project'))
  const fullTime = mscCs.studyPlanVariants.find((variant) => variant.code === 'full-time-no-stream-project')
  assert.deepEqual(fullTime.studyPlan.year1.semA.courses.map((course) => course.code), ['CS5222', 'CS5351', 'CS5481', 'CS5489', 'CS6534'])
  assert.deepEqual(fullTime.studyPlan.year1.semB.courses.map((course) => course.code), ['CS6520', 'CS5188', 'CS5483', 'CS5491'])
  assert.deepEqual(fullTime.studyPlan.year1.summer.courses.map((course) => course.code), ['CS6520'])

  assert.ok(researchCs, 'CS MPhil/PhD should be included')
  assert.equal(researchCs.type, 'research-degree')
  assert.equal(researchCs.sourceStatus.kind, 'research-diy')
  assert.equal(Object.values(researchCs.studyPlan.year1).every((semester) => semester.courses.length === 0), true)
  assert.ok(researchCs.researchAreas.length > 0)

  assert.ok(engd, 'Engineering Doctorate should be included')
  assert.equal(engd.type, 'professional-doctorate')
  assert.equal(engd.sourceStatus.kind, 'requirements-diy')
  assert.equal(Object.values(engd.studyPlan.year1).every((semester) => semester.courses.length === 0), true)
})

test('postgraduate taught programmes expose confirmed course pools when official curriculum lists exist', () => {
  const expectations = [
    {
      code: 'P70',
      courses: ['SDSC5001', 'SDSC5002', 'SDSC6006', 'CS6493'],
    },
    {
      code: 'P75',
      courses: ['CS5491', 'CS5611', 'CS6528', 'CS6529'],
    },
    {
      code: 'P91',
      courses: ['CS5285', 'CS5612', 'CS6531', 'CS6532'],
    },
    {
      code: 'P17',
      courses: ['CS5281', 'CS5488', 'IS5314', 'IS6400'],
    },
    {
      code: 'P63',
      courses: ['SEE5114', 'SEE6201', 'SEE5211', 'SEE6999'],
    },
  ]

  for (const expectation of expectations) {
    const programme = postgraduateProgrammes.find((item) => item.code === expectation.code)
    assert.ok(programme, `${expectation.code} should exist`)
    assert.equal(programme.courseListStatus?.kind, 'official-course-list')
    for (const code of expectation.courses) {
      assert.ok(programme.allCourses.includes(code), `${expectation.code} should expose ${code}`)
      assert.ok(pgCourses[code], `${code} should exist in pg-courses.json`)
    }
    const requirementCodes = new Set(
      programme.requirements.sections.flatMap((section) => (section.courses ?? []).map((course) => course.code))
    )
    for (const code of expectation.courses) {
      assert.ok(requirementCodes.has(code), `${expectation.code} requirements should list ${code}`)
    }
  }
})

test('postgraduate programmes with official title-only curricula expose elective lists for DIY planning', () => {
  const expectations = [
    { code: 'P02', titles: ['Auditing', 'Risk Management'] },
    { code: 'P04', titles: ['Asset Management and Hedge Fund Strategies', 'Sustainable Finance'] },
    { code: 'P05A', titles: ['Business Practice Internship', 'Information Technology Leadership Forum'] },
    { code: 'P05B', titles: ['Introduction to Financial Technologies', 'Information Systems Infrastructure and Security Management'] },
    { code: 'P07', titles: ['Global Business Leadership', 'Innovation Collaboration'] },
    { code: 'P09', titles: ['E-Logistics & Enterprise Resource Planning', 'Strategic Sourcing & Procurement'] },
    { code: 'P10', titles: ['Professional Internship', 'Employee Engagement and Performance'] },
    { code: 'P13', titles: ['Experimental Economics', 'Urban and Real Estate Economics'] },
    { code: 'P15', titles: ['Asset Management and Hedge Fund Strategies', 'Sustainable Finance'] },
    { code: 'P16', titles: ['Information Systems Infrastructure and Security Management', 'IoT Technologies for Future City Applications'] },
    { code: 'P18', titles: ['Social Media Marketing', 'Artificial Intelligence for Marketing'] },
    { code: 'P19', titles: ['Transforming Organizations in the Age of AI', 'Innovation Project'] },
    { code: 'P84', titles: ['Information Analytics Management Project', 'Statistical Modelling in Risk Management'] },
    { code: 'P85', titles: ['AI Ethics and Regulations', 'Machine Learning & Social Media Analytics'] },
  ]

  for (const expectation of expectations) {
    const programme = postgraduateProgrammes.find((item) => item.code === expectation.code)
    assert.ok(programme, `${expectation.code} should exist`)
    assert.ok(
      ['official-course-list', 'official-title-list'].includes(programme.courseListStatus?.kind),
      `${expectation.code} should have an official course/title list`
    )
    const titles = new Set(
      programme.requirements.sections.flatMap((section) => (section.courses ?? []).map((course) => course.title))
    )
    for (const title of expectation.titles) {
      assert.ok(titles.has(title), `${expectation.code} should list ${title}`)
    }
    assert.equal(Object.values(programme.studyPlan.year1).every((semester) => semester.courses.length === 0), true)
  }
})

test('postgraduate programmes with newly found official curricula expose course pools for DIY planning', () => {
  const expectations = [
    { code: 'P69', titles: ['Biomedical Engineering Design', 'Applied Artificial Intelligence for Biomedical and Healthcare Applications'] },
    { code: 'P95', titles: ['Common Diseases and Genomic Medicine', 'Healthcare Management'] },
    { code: 'P98', titles: ['Research Methodology and Ethics', 'Research Project in Neuroscience'] },
    { code: 'P97', titles: ['Introduction to Biostatistics in One Health', 'Clinical Trials'] },
    { code: 'P79', titles: ['Artificial Intelligence for Scientific Knowledge Discovery', 'AI for Chemistry'] },
    { code: 'P54', titles: ['Fundamentals of Radio Frequency (RF) Circuit Engineering', 'Modern Power Electronics'] },
    { code: 'P59', titles: ['Advanced Computer Architecture', 'Topics in Security Technology'] },
    { code: 'P56', titles: ['Operations Management', 'Asset and Maintenance Management'] },
    { code: 'P86', titles: ['Semiconductor Manufacturing and Management', '3D IC Stacking and Advanced Packaging Technology'] },
    { code: 'P89', titles: ['AI-Driven Innovation: Seminars and Projects', 'Managerial Decision-Making Systems with Artificial Intelligence'] },
    { code: 'P52', titles: ['Project Management', 'Value Management for Construction'] },
    { code: 'P60', titles: ['Methods of Analysis in Civil Engineering and Engineering Mechanics', 'Renewable Energy for a Sustainable Building Performance'] },
    { code: 'P66', titles: ['Modern Robotics', 'Advanced Machine Learning and Quantum Computation for Engineering'] },
    { code: 'P20', titles: ['Counselling Theories and Practice', 'Narrative-based Therapeutic Conversations: Theory and Practice'] },
    { code: 'P71', titles: ['Social Welfare Policy System and Reform', 'Fieldwork II'] },
    { code: 'P76', titles: ['Perception and Cognition', 'Psychological Testing'] },
    { code: 'P77', titles: ['Applied Sociology', 'Evidence-based Assessment Management of Mental Disorders'] },
    { code: 'P58', titles: ['Instrumentation for Materials Characterization', 'Advanced Research'] },
    { code: 'P50', titles: ['Introduction to Quantum Technology', 'Advanced Research in Physics'] },
    { code: 'P25', titles: ['Communication Fundamentals', 'Social Media Data Acquisition and Processing'] },
    { code: 'P27', titles: ['Theories of Government and Public Administration', 'Environmental Governance in China'] },
    { code: 'P34', titles: ['Essential Concepts in Chinese Culture', 'Museum Studies in China'] },
    { code: 'P37', titles: ['Theories and Approaches in Development Studies', 'Food Governance and Sustainability'] },
    { code: 'P38', titles: ['Asian Regional Governance', 'International Organisations'] },
    { code: 'P39', titles: ['Integrated Marketing Communication', 'Human-AI Communication Workshop'] },
    { code: 'P40', titles: ['Language in Its Social Context', 'World Literatures in English'] },
    { code: 'P41', titles: ['Legal Concepts', 'International Arbitration'] },
    { code: 'P12', titles: ['Strategic Innovation Management', 'EMBA Consulting Project'] },
    { code: 'P83', titles: ['Artificial Intelligence Accounting', 'Business Data Analytics'] },
    { code: 'P93', titles: ['Patent Drafting and Litigation', 'Cyber Governance and Law'] },
    { code: 'DBA', titles: ['Methodology for Applied Business Research I', 'Research Development Workshop'] },
    { code: 'ENGDC', titles: ['Semiconductor Manufacturing', 'Research Methods in Engineering Management'] },
    { code: 'P67', titles: ['Advanced Chemical Instrumentation', 'Cosmetic Product Development and Formulation'] },
    { code: 'P68', titles: ['Financial Mathematics in Derivative Markets', 'Reinforcement Learning and Its Applications in Finance'] },
    { code: 'P96', titles: ['Applied Public Health Projects', 'Global Scholars Training'] },
    { code: 'P99', titles: ['Integrated Small Animal Medicine: Part I', 'Exotic Animal Clinical Medicine'] },
    { code: 'P92', titles: ['Cross Sectoral Leadership', 'Experiential Learning - Internship'] },
    { code: 'P43', titles: ['Legal Methods, Research and Writing and Hong Kong Legal System', 'Land Law I and II'] },
    { code: 'P45', titles: ['Trial Advocacy', 'Commercial Writing and Drafting'] },
    { code: 'ENGDEM', titles: ['EngD Seminar', 'Research Methods in Engineering Management'] },
  ]

  for (const expectation of expectations) {
    const programme = postgraduateProgrammes.find((item) => item.code === expectation.code)
    assert.ok(programme, `${expectation.code} should exist`)
    assert.ok(
      ['official-course-list', 'official-title-list'].includes(programme.courseListStatus?.kind),
      `${expectation.code} should have an official course/title list`
    )
    const titles = new Set(
      programme.requirements.sections.flatMap((section) => (section.courses ?? []).map((course) => course.title))
    )
    for (const title of expectation.titles) {
      assert.ok(titles.has(title), `${expectation.code} should list ${title}`)
    }
    assert.equal(Object.values(programme.studyPlan.year1).every((semester) => semester.courses.length === 0), true)
  }
})

test('remaining postgraduate placeholders are completed or explicitly constrained by official sources', () => {
  const expectations = [
    { code: 'P01A', titles: ['Official Chinese EMBA programme brochure / admissions requirements'] },
    { code: 'P01B', titles: ['CityUHK EMBA + Tsinghua MPA admissions booklet'] },
    { code: 'P11', titles: ['International Business Analytics and Decision Modelling', 'Digital Marketing and e-Commerce'] },
    { code: 'P88', titles: ['GRIT (Graduate Research and Innovation Trek) Integrated Study', 'Blockchain Technology and Business Applications'] },
    { code: 'P64', titles: ['Foundation Studio for Values and Fundamentals in Design and Planning', 'Urban Design Charrette'] },
    { code: 'P82', titles: ['Advanced Architectural Design Studio: Urban Design', 'Architecture Thesis Studio'] },
    { code: 'P30', titles: ['Language and its Applications', 'Human-Machine Interactive Translation'] },
    { code: 'P78', titles: ['Comparative and International Housing and Urban Policy', 'Urban Economics and Regional Planning'] },
    { code: 'P80', titles: ['Introduction to Digital Processes: From Creative Computation to Fabrication', 'Human-Centered AI: Agents, Interaction, and Integration'] },
    { code: 'P81', titles: ['Technofutures: Critical Approaches to the Metaverse, AI, and Blockchain', 'Protocols and Techniques of Decentralised Curation'] },
    { code: 'P46', titles: ['Introduction to Common Law System and Methodology', 'International and Comparative Law of Trade Marks and Patents'] },
    { code: 'DBAC', titles: ['Methodology for Applied Business Research I', 'Doctoral Thesis'] },
  ]

  for (const expectation of expectations) {
    const programme = postgraduateProgrammes.find((item) => item.code === expectation.code)
    assert.ok(programme, `${expectation.code} should exist`)
    assert.ok(
      ['official-course-list', 'official-title-list'].includes(programme.courseListStatus?.kind),
      `${expectation.code} should no longer be an unstructured placeholder`
    )
    const titles = new Set(
      programme.requirements.sections.flatMap((section) => (section.courses ?? []).map((course) => course.title))
    )
    for (const title of expectation.titles) {
      assert.ok(titles.has(title), `${expectation.code} should list ${title}`)
    }
    assert.equal(Object.values(programme.studyPlan.year1).every((semester) => semester.courses.length === 0), true)
  }
})

test('postgraduate DIY planner is editable and persists a local copy', () => {
  const detail = readFileSync(new URL('../src/pages/PostgraduateDetailPage.tsx', import.meta.url), 'utf8')
  const editor = readFileSync(new URL('../src/components/PostgraduatePlanEditor.tsx', import.meta.url), 'utf8')

  assert.ok(detail.includes('PostgraduatePlanEditor'))
  assert.ok(detail.includes('editMode'))
  assert.ok(editor.includes('localStorage'))
  assert.ok(editor.includes('addCourseToSemester'))
  assert.ok(editor.includes('removeCourseFromSemester'))
  assert.ok(editor.includes('exportPlan'))
})

test('postgraduate taught programmes without parsed course lists are explicitly labelled', () => {
  const silentMissing = postgraduateProgrammes
    .filter((item) => item.type !== 'research-degree')
    .filter((item) => (item.allCourses ?? []).length === 0)
    .filter((item) => item.courseListStatus?.kind !== 'course-list-unconfirmed')
    .map((item) => item.code)

  assert.deepEqual(silentMissing, [])
})

test('every postgraduate programme exposes a non-empty DIY picker pool', () => {
  const emptyPools = postgraduateProgrammes
    .map((programme) => {
      const requirementCourses = programme.requirements.sections.flatMap((section) => section.courses ?? [])
      const allCourseCodes = programme.allCourses ?? []
      return {
        code: programme.code,
        poolSize: requirementCourses.length + allCourseCodes.length,
      }
    })
    .filter((item) => item.poolSize === 0)
    .map((item) => item.code)

  assert.deepEqual(emptyPools, [])
})

test('research postgraduate programmes expose real coursework pools for DIY planning', () => {
  const reports = []
  const expectedCoursework = {
    RPG_CS: ['SG8001', 'SG8002', 'CS6382', 'CS6491', 'CS8692', 'CS8695'],
    RPG_MNE: ['SG8001', 'SG8002', 'MNE8009', 'MNE8108', 'MNE8121'],
    RPG_MGT: ['SG8001', 'SG8002', 'MGT8904', 'MGT5313', 'MGT6202', 'MGT6314'],
    RPG_LAW: ['SG8001', 'SG8002', 'LW6100E', 'LW6132E'],
    RPG_LT: ['SG8001', 'SG8002', 'LT8806', 'LT8808', 'LT8809'],
  }

  for (const programme of postgraduateProgrammes.filter((item) => item.type === 'research-degree')) {
    const pool = programme.requirements.sections.flatMap((section) => section.courses ?? [])
    const codes = new Set(pool.map((course) => course.code))
    if (pool.length < 5) reports.push(`${programme.code}: missing research coursework pool`)
    if (!codes.has('SG8001')) reports.push(`${programme.code}: missing SG8001`)
    if (!codes.has('SG8002')) reports.push(`${programme.code}: missing SG8002`)
    if (!pool.some((course) => !course.code.startsWith('SG'))) reports.push(`${programme.code}: missing department coursework candidates`)
    if (programme.courseListStatus?.kind !== 'official-course-list') reports.push(`${programme.code}: coursework source not marked official-course-list`)
    for (const course of pool) {
      if (course.sourceOnly || course.code.startsWith('PGRSCH_') || course.code.startsWith('PGTITLE_')) {
        reports.push(`${programme.code}: ${course.code} should be a real coursework option`)
      }
      if (!pgCourses[course.code]) {
        reports.push(`${programme.code}: ${course.code} missing from pg-courses.json`)
      }
    }
  }

  for (const [programmeCode, requiredCodes] of Object.entries(expectedCoursework)) {
    const programme = postgraduateProgrammes.find((item) => item.code === programmeCode)
    const codes = new Set(programme.requirements.sections.flatMap((section) => section.courses ?? []).map((course) => course.code))
    for (const code of requiredCodes) {
      if (!codes.has(code)) reports.push(`${programmeCode}: missing official coursework ${code}`)
    }
  }

  assert.deepEqual(reports, [])
})

test('postgraduate course details include assessment metadata for parsed PG courses', () => {
  const requiredCourses = {
    CS5222: { continuous: '30%', exam: '70%', examDuration: '2 hours' },
    CS5351: { continuous: '60%', exam: '40%', examDuration: '2 hours' },
    CS5481: { continuous: '60%', exam: '40%', examDuration: '2 hours' },
    CS6520: { continuous: '100%' },
    SDSC5001: { continuous: '50%', exam: '50%', examDuration: '2 hours' },
  }
  const placeholderDetails = 'Official PG catalogue page linked; detailed assessment should be checked from the course page.'
  const parsedCourses = Object.values(pgCourses).filter((course) => course.catalogue === 'pg' && course.detailStatus === 'parsed')
  const unresolvedCourses = Object.values(pgCourses).filter((course) => course.catalogue === 'pg' && course.detailStatus !== 'parsed')

  assert.ok(parsedCourses.length >= 901, `expected at least 901 PG courses with official assessment parsed, got ${parsedCourses.length}`)
  assert.ok(unresolvedCourses.length <= 17, `expected at most 17 PG courses pending manual detail review, got ${unresolvedCourses.length}`)

  for (const [code, expected] of Object.entries(requiredCourses)) {
    const course = pgCourses[code]
    assert.ok(course, `${code} should exist in pg-courses.json`)
    assert.equal(course.catalogue, 'pg')
    assert.ok(course.courseUrl?.includes('/catalogue/pg/current/course/'), `${code} should link to PG course catalogue`)
    assert.ok(course.assessment?.continuous || course.assessment?.exam || course.assessment?.details, `${code} should include assessment`)
    assert.equal(course.detailStatus, 'parsed', `${code} should be parsed from an official PG catalogue page`)
    assert.equal(course.assessment.continuous, expected.continuous, `${code} should expose official continuous assessment`)
    if (expected.exam) assert.equal(course.assessment.exam, expected.exam, `${code} should expose official examination weighting`)
    if (expected.examDuration) assert.equal(course.assessment.examDuration, expected.examDuration, `${code} should expose official examination duration`)
    assert.notEqual(course.assessment.details, placeholderDetails, `${code} should not keep the default PG placeholder details`)
    assert.ok(course.pdfUrl?.includes(`/pg/`) && course.pdfUrl.endsWith(`/${code}.pdf`), `${code} should link to the official syllabus PDF`)
  }
})

test('postgraduate detail route and global search are wired', async () => {
  const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')
  const page = readFileSync(new URL('../src/pages/PostgraduatePage.tsx', import.meta.url), 'utf8')
  const detail = readFileSync(new URL('../src/pages/PostgraduateDetailPage.tsx', import.meta.url), 'utf8')
  const { buildSearchIndex, searchPlanner } = await import('../src/utils/searchIndex.ts')

  assert.ok(app.includes('path="/postgraduate/:programmeCode"'))
  assert.ok(page.includes('/postgraduate/'))
  assert.ok(detail.includes('studyPlanVariants'))
  assert.ok(detail.includes('DIY'))

  const index = buildSearchIndex(majors, courses, postgraduateProgrammes, pgCourses)
  const results = searchPlanner(index, 'CS5222', { limit: 10 })
  assert.ok(results.pgCourses.some((item) => item.code === 'CS5222'))
  assert.ok(searchPlanner(index, 'Computer Science', { limit: 10 }).postgraduateProgrammes.some((item) => item.code === 'P53'))
})

test('academic profiles are imported from the companion cityuhk-academic repository', () => {
  assert.ok(existsSync(academicProfilesUrl), 'academic-profiles.json should be generated from cityuhk-academic')
  assert.equal(academicProfilesData.summary.sourceRepository, 'cityuhk-academic')
  assert.ok(academicProfilesData.summary.collegeCount >= 8, 'academic reference should cover most CityUHK colleges/schools')
  assert.ok(academicProfilesData.summary.departmentCount >= 30, 'academic reference should cover department-level data')
  assert.ok(academicProfilesData.summary.professorCount >= 900, 'academic reference should include the professor directory')
  assert.ok(academicProfilesData.summary.publicationCount >= 2000, 'academic reference should preserve representative publications')

  const profiles = academicProfilesData.profiles
  assert.ok(profiles.some((profile) => profile.scholarUrl || profile.googleScholar || profile.url), 'profiles should preserve source links')
  assert.ok(profiles.some((profile) => (profile.interests ?? []).length > 0), 'profiles should expose research interests')
  assert.ok(profiles.some((profile) => (profile.topPublications ?? []).length > 0), 'profiles should expose representative publications')
})

test('verified academic profiles use official CityUHK Scholars names and person pages', () => {
  const bySourceKey = new Map(academicProfilesData.profiles.map((profile) => [profile.sourceKey, profile]))

  const likHangTsui = bySourceKey.get('dept-class-cah-tsui-lik-hang')
  assert.ok(likHangTsui, 'Lik Hang Tsui profile should be present')
  assert.equal(likHangTsui.name, 'Lik Hang Tsui')
  assert.equal(likHangTsui.nameCN, '徐力恆')
  assert.equal(likHangTsui.scholarUrl, 'https://scholars.cityu.edu.hk/en/persons/lhtsui/')

  const jonathanHui = bySourceKey.get('dept-class-cah-hui-yue-hang')
  assert.ok(jonathanHui, 'Jonathan York Heng HUI profile should be present')
  assert.equal(jonathanHui.name, 'Jonathan York Heng HUI')
  assert.equal(jonathanHui.nameCN, '許約恆')
  assert.equal(jonathanHui.scholarUrl, 'https://scholars.cityu.edu.hk/en/persons/jonathui/')

  const searchIndex = JSON.parse(readFileSync(new URL('../src/data/search-index.json', import.meta.url), 'utf8'))
  const indexedNames = searchIndex.academicProfiles.map((profile) => profile.name)
  assert.ok(indexedNames.includes('Lik Hang Tsui'))
  assert.ok(indexedNames.includes('Jonathan York Heng HUI'))
  assert.equal(indexedNames.includes('Tsui Lik Hang'), false)
  assert.equal(indexedNames.includes('Hui Yue Hang'), false)
})

test('academic professor names do not expose extraction or department tokens', () => {
  const extractionToken = /\b(?:Dept|Class|CAH|CENG|COMP|CS|Bms|BME|NS|ACE|MNE|MSE|MAE|SEE|SCM|VCS|IDPH|JCC|PIA|LT|SS)\b/i
  const badProfileNames = academicProfilesData.profiles
    .filter((profile) => extractionToken.test(profile.name))
    .map((profile) => `${profile.sourceKey}: ${profile.name}`)
  const badProfileLinks = academicProfilesData.profiles
    .filter((profile) => extractionToken.test(decodeURIComponent(`${profile.scholarUrl} ${profile.googleScholar}`)))
    .map((profile) => `${profile.sourceKey}: ${profile.scholarUrl} ${profile.googleScholar}`)

  const searchIndex = JSON.parse(readFileSync(new URL('../src/data/search-index.json', import.meta.url), 'utf8'))
  const badSearchNames = searchIndex.academicProfiles
    .filter((profile) => extractionToken.test(profile.name))
    .map((profile) => `${profile.id}: ${profile.name}`)

  assert.deepEqual(badProfileNames, [])
  assert.deepEqual(badProfileLinks, [])
  assert.deepEqual(badSearchNames, [])
})

test('academic profile import keeps names and search coverage for the full professor directory', () => {
  const missingNames = academicProfilesData.profiles
    .filter((profile) => !profile.name)
    .map((profile) => profile.sourceKey)

  const searchIndex = JSON.parse(readFileSync(new URL('../src/data/search-index.json', import.meta.url), 'utf8'))

  assert.deepEqual(missingNames, [])
  assert.ok(searchIndex.academicProfiles.length >= 900, 'global search should index the full professor directory')
})

test('academic routes, search, and related research matching are wired', async () => {
  const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')
  const layout = readFileSync(new URL('../src/components/Layout.tsx', import.meta.url), 'utf8')
  const home = readFileSync(new URL('../src/pages/Home.tsx', import.meta.url), 'utf8')
  const majorPage = readFileSync(new URL('../src/pages/MajorPage.tsx', import.meta.url), 'utf8')
  const postgraduateDetail = readFileSync(new URL('../src/pages/PostgraduateDetailPage.tsx', import.meta.url), 'utf8')
  const { buildSearchIndex, searchPlanner } = await import('../src/utils/searchIndex.ts')
  const { findRelatedAcademicProfiles } = await import('../src/utils/academicProfiles.ts')

  assert.ok(app.includes('path="/academic"'))
  assert.ok(app.includes('path="/academic/:profileId"'))
  assert.ok(layout.includes("to: '/academic'"))
  assert.ok(home.includes('academicProfiles'))
  assert.ok(majorPage.includes('Research Reference'))
  assert.ok(postgraduateDetail.includes('Research Reference'))

  const index = buildSearchIndex(majors, courses, postgraduateProgrammes, pgCourses, academicProfilesData)
  const dataScienceResults = searchPlanner(index, 'data science', { limit: 20 })
  assert.ok(dataScienceResults.academicProfiles.length > 0, 'global search should return academic profiles')

  const csMajor = major('BSC1_CSC1-1')
  const relatedForMajor = findRelatedAcademicProfiles(academicProfilesData.profiles, csMajor, { limit: 6 })
  assert.ok(relatedForMajor.length > 0, 'major pages should receive related professor suggestions')

  const csPg = postgraduateProgrammes.find((item) => item.code === 'P53')
  const relatedForPg = findRelatedAcademicProfiles(academicProfilesData.profiles, csPg, { limit: 6 })
  assert.ok(relatedForPg.length > 0, 'postgraduate pages should receive related professor suggestions')
})

test('visual polish design system is wired into core pages', () => {
  const appCss = readFileSync(new URL('../src/App.css', import.meta.url), 'utf8')
  const layout = readFileSync(new URL('../src/components/Layout.tsx', import.meta.url), 'utf8')
  const home = readFileSync(new URL('../src/pages/Home.tsx', import.meta.url), 'utf8')
  const collegePage = readFileSync(new URL('../src/pages/CollegePage.tsx', import.meta.url), 'utf8')
  const academicPage = readFileSync(new URL('../src/pages/AcademicPage.tsx', import.meta.url), 'utf8')
  const researchPanel = readFileSync(new URL('../src/components/ResearchReferencePanel.tsx', import.meta.url), 'utf8')

  for (const token of ['--color-cityu-ink', '--surface-panel', '.dashboard-hero', '.toolbar-link', '.metric-card', '.interactive-card', '.college-card', '.college-detail-hero']) {
    assert.ok(appCss.includes(token), `App.css should define ${token}`)
  }
  assert.ok(layout.includes('app-shell'))
  assert.ok(layout.includes('nav-link'))
  assert.ok(home.includes('planner-command-center'))
  assert.ok(home.includes('metric-card'))
  assert.ok(home.includes('getCollegeThemeStyle'))
  assert.ok(home.includes('college-card'))
  assert.ok(!home.includes('bg-rose-100'), 'College cards should not fall back to flat Tailwind color blocks')
  assert.ok(collegePage.includes('college-detail-hero'))
  assert.ok(academicPage.includes('control-surface'))
  assert.ok(researchPanel.includes('interactive-card'))
})

test('premium planner workspace design is wired into primary flows', () => {
  const appCss = readFileSync(new URL('../src/App.css', import.meta.url), 'utf8')
  const layout = readFileSync(new URL('../src/components/Layout.tsx', import.meta.url), 'utf8')
  const home = readFileSync(new URL('../src/pages/Home.tsx', import.meta.url), 'utf8')
  const majorPage = readFileSync(new URL('../src/pages/MajorPage.tsx', import.meta.url), 'utf8')
  const editor = readFileSync(new URL('../src/components/StudyPlanEditor.tsx', import.meta.url), 'utf8')

  for (const token of [
    '--color-planner-gold',
    '.app-sidebar',
    '.planner-command-center',
    '.insight-strip',
    '.programme-hero',
    '.semester-card',
    '.course-pool-panel',
    '.premium-action',
    '@media (prefers-reduced-motion: reduce)',
  ]) {
    assert.ok(appCss.includes(token), `App.css should define ${token}`)
  }
  assert.ok(layout.includes('NavLink'))
  assert.ok(layout.includes('app-sidebar'))
  assert.ok(home.includes('planner-command-center'))
  assert.ok(home.includes('insight-strip'))
  assert.ok(home.includes('quick-action-grid'))
  assert.ok(home.includes('quick-action-card'))
  assert.ok(home.includes('premium-action'))
  assert.ok(majorPage.includes('programme-hero'))
  assert.ok(majorPage.includes('semester-card'))
  assert.ok(editor.includes('course-pool-panel'))
  assert.ok(editor.includes('semester-card'))

  assert.ok(appCss.includes('white-space: nowrap'), 'Premium action buttons should not wrap Chinese labels vertically')
  assert.ok(appCss.includes('grid-template-columns: repeat(auto-fit, minmax(220px, 1fr))'))
})

test('impeccable taste pass removes templated UI tells from the primary shell', () => {
  const appCss = readFileSync(new URL('../src/App.css', import.meta.url), 'utf8')
  const indexCss = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8')
  const home = readFileSync(new URL('../src/pages/Home.tsx', import.meta.url), 'utf8')
  const layout = readFileSync(new URL('../src/components/Layout.tsx', import.meta.url), 'utf8')
  const coveragePage = readFileSync(new URL('../src/pages/CoveragePage.tsx', import.meta.url), 'utf8')
  const comparePage = readFileSync(new URL('../src/pages/ComparePage.tsx', import.meta.url), 'utf8')

  for (const token of [
    '--surface-canvas',
    '--surface-raised',
    '--shadow-hairline',
    '.action-rail',
    '.search-command',
    '.spotlight-rail',
  ]) {
    assert.ok(appCss.includes(token), `App.css should define refined UI token ${token}`)
  }

  assert.ok(home.includes('action-rail'), 'Home quick actions should use a main/secondary rail instead of an equal-card grid')
  assert.ok(home.includes('search-command'), 'Home search should be visually promoted as the primary command surface')
  assert.ok(layout.includes('sidebar-product-note'), 'Sidebar should use a compact product note instead of a decorative trust card')
  assert.ok(coveragePage.includes('surface-panel'), 'Coverage page should use the shared surface language')
  assert.ok(coveragePage.includes('interactive-card'), 'Coverage cards should reuse the shared interaction style')
  assert.ok(comparePage.includes('surface-panel'), 'Compare page should use the shared surface language')
  assert.ok(comparePage.includes('interactive-card'), 'Compare search results should reuse the shared interaction style')
  assert.ok(indexCss.includes('color-scheme: light'), 'Base document theme should not inherit the Vite template dark auto palette')

  assert.equal(/1px,\s*transparent\s+1px/.test(appCss), false, 'Decorative grid backgrounds should be removed')
  assert.equal(coveragePage.includes('bg-white border border-gray-100 rounded-xl shadow-sm'), false, 'Coverage page should not use old white-card shell panels')
  assert.equal(comparePage.includes('bg-white border border-gray-100 rounded-xl shadow-sm'), false, 'Compare page should not use old white-card shell panels')
  assert.equal(appCss.includes('inset: 0 auto 0 0;'), false, 'College cards should not use side-stripe accents')
  assert.equal(appCss.includes('width: 4px;'), false, 'College cards should not use thick side bars')
  assert.equal(indexCss.includes('--accent: #aa3bff'), false, 'Vite template purple accent should be removed')
})

test('campus spotlight carousel leads the homepage and has detail routes', async () => {
  const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')
  const appCss = readFileSync(new URL('../src/App.css', import.meta.url), 'utf8')
  const home = readFileSync(new URL('../src/pages/Home.tsx', import.meta.url), 'utf8')
  const carousel = readFileSync(new URL('../src/components/CampusSpotlightCarousel.tsx', import.meta.url), 'utf8')
  const detailPage = readFileSync(new URL('../src/pages/SpotlightDetailPage.tsx', import.meta.url), 'utf8')
  const { campusSpotlights, getSpotlightById } = await import('../src/data/campusSpotlights.ts')
  const { cityuOfficialDirectory } = await import('../src/data/cityuOfficialDirectory.ts')

  assert.ok(app.includes('path="/spotlight/:spotlightId"'))
  assert.ok(home.includes('<CampusSpotlightCarousel />'))
  assert.ok(carousel.includes('AUTO_ADVANCE_MS'))
  assert.ok(carousel.includes('aria-label={isPaused'))
  assert.ok(detailPage.includes('<OfficialDirectoryPanel'))
  assert.ok(detailPage.includes('spotlight-detail-video'))
  assert.ok(appCss.includes('.campus-spotlight-hero'))
  assert.ok(appCss.includes('.spotlight-demo-frame'))
  assert.ok(appCss.includes('.official-directory'))
  assert.ok(appCss.includes('height: clamp(31rem, 66vh, 40rem)'))
  assert.ok(appCss.includes('height: 18rem'))

  assert.equal(campusSpotlights.length, 2)
  assert.deepEqual(campusSpotlights.map((item) => item.id), ['site-demo-video', 'cityu-official-directory'])
  assert.equal(campusSpotlights[0].kind, 'demo')
  assert.ok(campusSpotlights[0].video.src.endsWith('.webm'))
  assert.ok(campusSpotlights[0].video.poster.endsWith('.png'))
  assert.equal(campusSpotlights[1].kind, 'directory')
  assert.equal(getSpotlightById('ocamp-groups'), undefined)
  assert.equal(getSpotlightById('cssa-cssaug-wechat'), undefined)

  assert.ok(existsSync(new URL(`../public/${campusSpotlights[0].video.src}`, import.meta.url)), 'Missing spotlight demo video')
  assert.ok(existsSync(new URL(`../public/${campusSpotlights[0].video.poster}`, import.meta.url)), 'Missing spotlight demo poster')

  assert.equal(cityuOfficialDirectory.academic.colleges.length, 11)
  assert.equal(cityuOfficialDirectory.academic.colleges.reduce((count, college) => count + college.departments.length, 0), 29)
  assert.equal(cityuOfficialDirectory.academic.otherUnits.length, 1)
  assert.equal(cityuOfficialDirectory.programmes.undergraduate.length, 63)
  assert.equal(cityuOfficialDirectory.programmes.postgraduate.length, 102)
  assert.ok(cityuOfficialDirectory.administration.units.length >= 32)

  const officialLinks = [
    ...cityuOfficialDirectory.academic.colleges.flatMap((college) => [college, ...college.departments]),
    ...cityuOfficialDirectory.programmes.undergraduate,
    ...cityuOfficialDirectory.programmes.postgraduate,
    ...cityuOfficialDirectory.administration.units,
  ]
  assert.ok(officialLinks.every((item) => /^https:\/\/([a-z0-9-]+\.)*cityu\.edu\.hk(?:\/|$)/i.test(item.url)))
})

test('welcome modal appears once per newly opened browser session but not after refresh', async () => {
  const { WELCOME_SESSION_KEY, shouldShowWelcomeModal } = await import('../src/utils/welcomeSession.ts')

  const createStorage = () => {
    const values = new Map()
    return {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      values,
    }
  }

  const firstTabStorage = createStorage()
  firstTabStorage.setItem('cityu-welcome-seen', '1')
  assert.match(WELCOME_SESSION_KEY, /v2/, 'welcome session key should be versioned after the UI refresh')
  assert.equal(shouldShowWelcomeModal(firstTabStorage), true, 'newly opened tab should show the modal')
  assert.equal(firstTabStorage.values.get(WELCOME_SESSION_KEY), '1', 'showing the modal should immediately mark the session')
  assert.equal(shouldShowWelcomeModal(firstTabStorage), false, 'refreshing the same tab should not show the modal again')

  const secondTabStorage = createStorage()
  assert.equal(shouldShowWelcomeModal(secondTabStorage), true, 'a separately opened tab should have its own modal session')

  const modalSource = readFileSync(new URL('../src/components/WelcomeModal.tsx', import.meta.url), 'utf8')
  assert.ok(modalSource.includes('shouldShowWelcomeModal'), 'WelcomeModal should use the session helper')
})

test('undergraduate builds never mutate official semester placements from catalogue offerings', () => {
  const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
  const prepareData = packageJson.scripts['prepare:data']
  const offeringAudit = readFileSync(new URL('../scripts/align-study-plan-offerings.mjs', import.meta.url), 'utf8')

  assert.doesNotMatch(prepareData, /align:plans/)
  assert.doesNotMatch(offeringAudit, /writeFileSync/)
  assert.match(offeringAudit, /conflict/i)
})

test('every undergraduate programme explicitly declares its official-source confidence', async () => {
  const { getStudyPlanSourceStatus } = await import('../src/utils/sourceStatus.ts')
  const supported = new Set(['official', 'structure', 'derived', 'diy'])

  for (const item of majors) {
    assert.ok(supported.has(item.studyPlanStatus), `${item.code} must explicitly declare official, structure, derived, or diy`)
    const status = getStudyPlanSourceStatus(item)
    assert.equal(status.kind, item.studyPlanStatus, `${item.code} source label must use its explicit status`)

    if (item.studyPlanStatus === 'official' || item.studyPlanStatus === 'structure') {
      assert.match(item.studyPlanSourceTitle ?? '', /\S/, `${item.code} must name its official source`)
      assert.match(item.studyPlanSourceUrl ?? '', /^https:\/\/(?:[a-z0-9-]+\.)*cityu\.edu\.hk(?:\/|$)/i, `${item.code} must link a CityUHK source`)
      assert.match(item.lastVerified ?? '', /^\d{4}-\d{2}-\d{2}$/, `${item.code} must record its verification date`)
    }
  }

  assert.equal(getStudyPlanSourceStatus({}).kind, 'diy', 'missing metadata must never be presented as official')
})

test('programmes without an official semester plan expose genuinely blank DIY grids', () => {
  for (const item of majors) {
    if (item.studyPlanStatus === 'diy') {
      assert.equal(planCourseCodes(item).length, 0, `${item.code} DIY programme must not prefill a speculative schedule`)
    }
    for (const stream of item.streams ?? []) {
      if ((stream.studyPlanStatus ?? item.studyPlanStatus) === 'diy') {
        assert.equal(planCourseCodes(stream).length, 0, `${item.code}/${stream.code} DIY stream must be blank`)
      }
    }
  }
})

test('official biomedical and science plans match their 2025 cohort source sheets', () => {
  const bme = major('BENG1_BME-1')
  assert.deepEqual(semesterCodes(bme.code, 4, 'semA'), ['BME4102', 'BME3104', 'MAJOR-ELECTIVE2', 'MAJOR-ELECTIVE3', 'GE-DR4'])
  assert.deepEqual(semesterCodes(bme.code, 4, 'semB'), ['BME4102', 'BME2066', 'MAJOR-ELECTIVE4', 'FREE-ELECTIVE'])

  const bisi = major('BSC1_BISI-1')
  assert.equal(Object.values(bisi.studyPlan).flatMap(Object.values).reduce((sum, sem) => sum + sem.credits, 0), 121)

  assert.equal(courses.EN4262.credits, 2)
  assert.equal(plannedCourse('BSC1_CYBE-1', 4, 'semA', 'EN4262').credits, 2)

  const mase = major('BENG1_MASE-1')
  assert.ok(semesterCodes(mase.code, 2, 'semB').includes('MSE2109'))
  assert.ok(semesterCodes(mase.code, 2, 'summer').includes('MSE2243'))
  assert.equal(planCourseCodes(mase).includes('MSE2114'), false)

  const phy = major('BSC1_PHY-1')
  assert.equal(Object.values(phy.studyPlan).flatMap(Object.values).reduce((sum, sem) => sum + sem.credits, 0), 121)
  assert.equal(phy.totalCredits, 121)
})

test('official business stream plans match the supplied 2025 cohort schedules', () => {
  const ac = major('BBA1_AC-1')
  assert.equal(planCourseCodes(ac).includes('CHIN1001'), false)
  assert.equal(Object.values(ac.studyPlan).flatMap(Object.values).reduce((sum, sem) => sum + sem.credits, 0), 121)

  const gbu = major('BBA1_GBU-1')
  assert.deepEqual(semesterCodes(gbu.code, 1, 'semA').slice(0, 4), ['CB2100', 'CB2601', 'CB2300', 'CB2200'])
  assert.ok(semesterCodes(gbu.code, 4, 'semA').includes('CB4604'))
  assert.equal(planCourseCodes(gbu).includes('CHIN1001'), false)
  assert.equal(Object.values(gbu.studyPlan).flatMap(Object.values).reduce((sum, sem) => sum + sem.credits, 0), 121)

  const bdan = major('BBA1_BDAN-1')
  assert.equal(streamPlanCredits(bdan, 'DA'), 121)
  assert.equal(streamPlanCredits(bdan, 'DI'), 121)
  assert.ok(streamSemesterCodes(bdan, 'DA', 4, 'semB').includes('MS4252'))
  assert.ok(streamSemesterCodes(bdan, 'DI', 3, 'semA').includes('IS3100'))
})

test('official engineering and liberal-arts plans preserve source rows and stream choices', () => {
  const arce = major('BENG1_ARCE-1')
  assert.ok(semesterCodes(arce.code, 3, 'semB').includes('CA3793'))
  assert.equal(semesterCodes(arce.code, 3, 'semB').includes('ARCE-ELECTIVE1'), false)

  const arsv = major('BSC1_ARSV-1')
  assert.ok(streamSemesterCodes(arsv, 'Surveying', 2, 'semA').includes('CA2311'))
  assert.ok(streamSemesterCodes(arsv, 'Surveying', 4, 'semA').includes('CA4630'))
  assert.deepEqual(
    streamSemesterCodes(arsv, 'Surveying', 4, 'semB').filter((code) => code.startsWith('STREAM-ELECTIVE')),
    ['STREAM-ELECTIVE4', 'STREAM-ELECTIVE5', 'STREAM-ELECTIVE6'],
  )
  assert.equal(arsv.streams.find((item) => item.code === 'Surveying').requirements.majorElectives.credits, 21)
  assert.ok(streamSemesterCodes(arsv, 'Architecture', 2, 'semA').includes('CA2343A/B'))
  assert.ok(streamSemesterCodes(arsv, 'Architecture', 4, 'semB').includes('CA4540'))

  const english = major('BA1_EN-1')
  assert.equal(streamPlanCredits(english, 'EPC'), 121)
  assert.equal(streamPlanCredits(english, 'LL'), 121)
  assert.ok(streamSemesterCodes(english, 'EPC', 2, 'semB').includes('EN3586'))
  assert.ok(streamSemesterCodes(english, 'LL', 2, 'semB').includes('EN3589'))

  const chis = major('BA1_CHIS-1')
  assert.equal(planCourseCodes(chis).filter((code) => code === 'CAH4499').length, 1)
  assert.ok(planCourseCodes(chis).includes('COL-FOUND-SS'))
})

test('official social-science plans include every required and flexible credit shown in the handbook', () => {
  for (const code of ['BSS1_CRS-1', 'BSS1_PSY-1', 'BSS1_SW-1']) {
    const item = major(code)
    const total = Object.values(item.studyPlan).flatMap(Object.values).reduce((sum, sem) => sum + sem.credits, 0)
    assert.equal(total, 121, `${code} should total 121 CU`)
  }
  assert.ok(semesterCodes('BSS1_PSY-1', 4, 'semA').includes('SS4708'))
  assert.equal(plannedCourse('BSS1_PSY-1', 4, 'semA', 'SS4708').credits, 6)
})

test('official veterinary and creative-media schedules are complete rather than placeholder shells', () => {
  const bvm = major('BVM_VM2-1')
  assert.equal(Object.values(bvm.studyPlan).flatMap(Object.values).reduce((sum, sem) => sum + sem.credits, 0), 243)
  assert.deepEqual(semesterCodes(bvm.code, 3, 'semA'), ['VM3010', 'VM3012'])
  assert.deepEqual(semesterCodes(bvm.code, 6, 'semB').slice(0, 1), ['VM4303'])
  assert.equal(plannedCourse(bvm.code, 6, 'semB', 'VM4303').credits, 21)

  const bsc = major('BSC1_CRM1-1')
  assert.ok(semesterCodes(bsc.code, 1, 'semA').includes('CS1103B'))
  assert.ok(semesterCodes(bsc.code, 2, 'semA').includes('CS2116'))
  assert.ok(semesterCodes(bsc.code, 4, 'semA').includes('SM4712B'))
  assert.equal(Object.values(bsc.studyPlan).flatMap(Object.values).reduce((sum, sem) => sum + sem.credits, 0), 121)
})
