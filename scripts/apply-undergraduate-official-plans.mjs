import { readFileSync, writeFileSync } from 'node:fs'
import { LAST_VERIFIED, undergraduatePlanSources } from './undergraduate-plan-sources.mjs'

const majorsPath = new URL('../src/data/all-majors.json', import.meta.url)
const coursesPath = new URL('../src/data/courses.json', import.meta.url)
const majors = JSON.parse(readFileSync(majorsPath, 'utf8'))
const courses = JSON.parse(readFileSync(coursesPath, 'utf8'))
const byCode = new Map(majors.map((item) => [item.code, item]))

const clone = (value) => JSON.parse(JSON.stringify(value))

function getMajor(code) {
  const item = byCode.get(code)
  if (!item) throw new Error(`Missing undergraduate programme ${code}`)
  return item
}

function lookupCode(code) {
  const normalized = String(code ?? '').trim()
  if (courses[normalized]) return normalized
  return normalized.split(/\s+\/\s+|\s+or\s+|\//i)[0].trim()
}

function plannedCourse(value) {
  const input = typeof value === 'string' ? { code: value } : value
  const detail = courses[input.code] ?? courses[lookupCode(input.code)]
  return {
    code: input.code,
    title: input.title ?? detail?.title ?? input.code,
    credits: input.credits ?? detail?.credits ?? 3,
    ...(input.officialPlacement ? { officialPlacement: input.officialPlacement } : {}),
    ...(input.remarks ? { remarks: input.remarks } : {}),
  }
}

function semester(items = []) {
  const planned = items.map(plannedCourse)
  return {
    courses: planned,
    credits: planned.reduce((total, item) => total + (Number(item.credits) || 0), 0),
  }
}

function plan(years) {
  return Object.fromEntries(Object.entries(years).map(([year, value]) => [year, {
    semA: semester(value.semA),
    semB: semester(value.semB),
    ...(value.summer ? { summer: semester(value.summer) } : {}),
  }]))
}

function emptyStudyPlan(years = 4) {
  return Object.fromEntries(Array.from({ length: years }, (_, index) => [`year${index + 1}`, {
    semA: semester(),
    semB: semester(),
    summer: semester(),
  }]))
}

function totalPlanCredits(studyPlan) {
  return Object.values(studyPlan ?? {})
    .flatMap((year) => Object.values(year))
    .reduce((total, item) => total + (Number(item.credits) || 0), 0)
}

function generic(code, title, credits = 3, remarks) {
  return { code, title, credits, ...(remarks ? { remarks } : {}) }
}

function requirementSection(credits, items = [], extra = {}) {
  return {
    credits,
    courses: items.map(plannedCourse),
    ...extra,
  }
}

function ensurePlanTerm(studyPlan, year, term) {
  studyPlan[year] ??= { semA: semester(), semB: semester(), summer: semester() }
  studyPlan[year][term] ??= semester()
  return studyPlan[year][term]
}

function recalculateTerm(term) {
  term.credits = (term.courses ?? []).reduce((total, item) => total + (Number(item.credits) || 0), 0)
}

function addPlanCourse(studyPlan, year, term, course) {
  const target = ensurePlanTerm(studyPlan, year, term)
  target.courses.push(plannedCourse(course))
  recalculateTerm(target)
}

function addPlanCourseOnce(studyPlan, year, term, course) {
  const target = ensurePlanTerm(studyPlan, year, term)
  const normalized = plannedCourse(course)
  if (target.courses.some((item) => item.code === normalized.code)) return
  target.courses.push(normalized)
  recalculateTerm(target)
}

function removePlanCourse(studyPlan, year, term, predicate) {
  const target = ensurePlanTerm(studyPlan, year, term)
  const index = target.courses.findIndex(predicate)
  if (index < 0) throw new Error(`Missing replaceable course in ${year}.${term}`)
  const [removed] = target.courses.splice(index, 1)
  recalculateTerm(target)
  return removed
}

function replacePlanCourse(studyPlan, fromYear, fromTerm, predicate, toYear, toTerm, course) {
  removePlanCourse(studyPlan, fromYear, fromTerm, predicate)
  addPlanCourse(studyPlan, toYear, toTerm, course)
}

function movePlanCourse(studyPlan, fromYear, fromTerm, predicate, toYear, toTerm) {
  const moved = removePlanCourse(studyPlan, fromYear, fromTerm, predicate)
  addPlanCourse(studyPlan, toYear, toTerm, moved)
  return moved
}

function addRequirementCourse(requirements, key, course, creditIncrease = 0) {
  const current = requirements[key]
  const section = current && typeof current === 'object'
    ? current
    : { credits: Number(current) || 0, courses: [] }
  section.courses ??= []
  const normalized = plannedCourse(course)
  if (!section.courses.some((item) => item.code === normalized.code)) section.courses.push(normalized)
  section.credits = (Number(section.credits) || 0) + creditIncrease
  requirements[key] = section
}

function cloneCourseAlias(code, sourceCode, overrides = {}) {
  const source = courses[sourceCode]
  if (!source) throw new Error(`Missing alias source course ${sourceCode}`)
  courses[code] = {
    ...clone(source),
    ...overrides,
    code,
    courseUrl: `https://www.cityu.edu.hk/catalogue/ug/current/course/${code}.htm`,
    pdfUrl: `https://www.cityu.edu.hk/catalogue/ug/current/course/${code}.pdf`,
    sourceUrl: `https://www.cityu.edu.hk/catalogue/ug/current/course/${code}.htm`,
    catalogue: 'ug',
  }
}

function addNote(item, note) {
  item.notes = [...new Set([...(item.notes ?? []), note])]
}

function setMainPlan(code, studyPlan) {
  getMajor(code).studyPlan = studyPlan
}

function upsertCourse(code, title, credits, department) {
  courses[code] = {
    ...courses[code],
    code,
    title: title ?? courses[code]?.title ?? code,
    credits,
    department: courses[code]?.department ?? department,
    prerequisites: courses[code]?.prerequisites ?? [],
    prerequisitesRaw: courses[code]?.prerequisitesRaw ?? '',
    semester: courses[code]?.semester ?? '',
    assessment: courses[code]?.assessment ?? {},
    pdfUrl: courses[code]?.pdfUrl ?? `https://www.cityu.edu.hk/ug/current/course/${code}.pdf`,
    courseUrl: courses[code]?.courseUrl ?? `https://www.cityu.edu.hk/catalogue/ug/current/course/${code}.htm`,
    description: courses[code]?.description ?? '',
    catalogue: 'ug',
    detailStatus: courses[code]?.detailStatus ?? 'linked-unparsed',
    sourceUrl: courses[code]?.sourceUrl ?? `https://www.cityu.edu.hk/catalogue/ug/current/course/${code}.htm`,
  }
}

function correctCoursePrerequisites(code, prerequisites, prerequisitesRaw) {
  const course = courses[code]
  if (!course) throw new Error(`Missing course for prerequisite correction: ${code}`)
  course.prerequisites = prerequisites
  course.prerequisitesRaw = prerequisitesRaw
}

function addPlanCoursesToPool(item) {
  const codes = new Set(item.allCourses ?? [])
  const collect = (studyPlan) => {
    for (const year of Object.values(studyPlan ?? {})) {
      for (const term of Object.values(year)) {
        for (const course of term.courses ?? []) {
          const code = lookupCode(course.code)
          if (courses[code]) codes.add(code)
        }
      }
    }
  }
  collect(item.studyPlan)
  for (const stream of item.streams ?? []) {
    collect(stream.studyPlan)
    for (const code of stream.allCourses ?? []) codes.add(code)
  }
  item.allCourses = [...codes]
}

function cloneRequirements(item) {
  return clone(item.requirements ?? {})
}

function stream(code, name, studyPlan, base, extra = {}) {
  return {
    code,
    name,
    description: extra.description ?? '',
    totalCredits: extra.totalCredits ?? totalPlanCredits(studyPlan),
    requirements: extra.requirements ?? cloneRequirements(base),
    allCourses: [...new Set([...(base.allCourses ?? []), ...(extra.allCourses ?? [])])],
    studyPlan,
    ...(extra.notes ? { notes: extra.notes } : {}),
  }
}

function makeCreatePlan(basePlan) {
  const result = clone(basePlan)
  const placements = [
    ['year1', 'semB'],
    ['year2', 'summer'],
    ['year3', 'summer'],
  ]
  const createCodes = ['SM2724A', 'SM2724B', 'SM2724C']
  placements.forEach(([year, term], index) => {
    addPlanCourse(result, year, term, generic(createCodes[index], 'Leadership & Creativity (CREATE Stream)', 1, `CREATE registration ${index + 1} of 3; students may choose any three distinct SM2724A/B/C/D/E/F modules.`))
  })
  return result
}

function applyBiomedicalPlans() {
  setMainPlan('BENG1_BME-1', plan({
    year1: {
      semA: ['PHY1201', 'CHEM1200', { code: 'MA1200 / MA1300', title: 'Calculus and Basic Linear Algebra I / Enhanced Calculus and Linear Algebra I', credits: 3 }, 'BME2105', 'GE1401', 'GE1601'],
      semB: ['CHEM1300', 'CS1302', { code: 'MA1201 / MA1301', title: 'Calculus and Basic Linear Algebra II / Enhanced Calculus and Linear Algebra II', credits: 3 }, 'GE2410', generic('GE-DR1', 'Gateway Education Distributional Requirement')],
    },
    year2: {
      semA: ['BME2102', 'BME2123', 'BME2029', 'BME2036', 'GE1501'],
      semB: ['BME2122', 'BME2121', 'BME2103', 'BME2106', generic('GE-DR2', 'Gateway Education Distributional Requirement')],
    },
    year3: {
      semA: ['BME4103', 'BME3121', 'BME3123', 'BME2104', generic('GE-DR3', 'Gateway Education Distributional Requirement')],
      semB: ['BME3102', 'BME4101', 'BME3103', 'CS4465', generic('MAJOR-ELECTIVE1', 'Biomedical Engineering Major Elective')],
    },
    year4: {
      semA: [{ code: 'BME4102', credits: 3, officialPlacement: 'Year 4 Semesters A and B' }, 'BME3104', generic('MAJOR-ELECTIVE2', 'Biomedical Engineering Major Elective'), generic('MAJOR-ELECTIVE3', 'Biomedical Engineering Major Elective'), generic('GE-DR4', 'Gateway Education Distributional Requirement')],
      semB: [{ code: 'BME4102', credits: 6, officialPlacement: 'Year 4 Semesters A and B' }, 'BME2066', generic('MAJOR-ELECTIVE4', 'Biomedical Engineering Major Elective'), generic('FREE-ELECTIVE', 'Free Elective')],
    },
  }))

  const bisi = getMajor('BSC1_BISI-1')
  if (!bisi.studyPlan.year3.semB.courses.some((course) => course.code === 'FLEXIBLE-ELECTIVE')) {
    bisi.studyPlan.year3.semB.courses.push(generic('FLEXIBLE-ELECTIVE', 'Major / GE / Free Elective', 3))
    bisi.studyPlan.year3.semB.credits += 3
  }

  upsertCourse('EN4262', courses.EN4262?.title ?? 'Research Methodology and Ethics', 2, 'Department of English')
  courses.EN4262.credits = 2
  const cybe = getMajor('BSC1_CYBE-1')
  for (const year of Object.values(cybe.studyPlan)) {
    for (const term of Object.values(year)) {
      const course = term.courses.find((item) => item.code === 'EN4262')
      if (course) course.credits = 2
      term.credits = term.courses.reduce((total, item) => total + item.credits, 0)
    }
  }
}

function applyBusinessPlans() {
  const commonBusinessYear1 = {
    semA: ['CB2100', 'CB2601', 'CB2201', 'CB2300', 'GE1401', 'GE1601'],
    semB: ['CB2200', 'CB2400', 'CB2500', 'CB3410', 'GE2402'],
  }

  const accountancy = getMajor('BBA1_AC-1')
  const paPlan = plan({
    year1: commonBusinessYear1,
    year2: {
      semA: ['CB2402', 'CB2101', 'CB2240', 'AC3202', 'LW2903'],
      semB: [generic('COL-ELEC1', 'College Elective'), 'CB2203', 'AC4301', generic('MINOR1', 'Minor / Free Elective'), generic('GE-COL1', 'GE / College Elective')],
    },
    year3: {
      semA: [generic('GE-DR1', 'Gateway Education Distributional Requirement'), 'AC4251', 'AC4342', generic('MINOR2', 'Minor / Free Elective'), 'GE1501'],
      semB: [generic('GE-DR2', 'Gateway Education Distributional Requirement'), generic('GE-DR3', 'Gateway Education Distributional Requirement'), 'AC4303', generic('MINOR3', 'Minor / Free Elective')],
    },
    year4: {
      semA: [generic('GE-DR4', 'Gateway Education Distributional Requirement'), 'AC4332', 'AC4391', generic('MINOR4', 'Minor / Free Elective'), 'CB4303', generic('AC-ELECTIVE1', 'Accountancy Elective')],
      semB: [generic('COL-ELEC2', 'College Elective'), 'LW3902', generic('AC-ELECTIVE2', 'Accountancy Elective'), generic('MINOR5', 'Minor / Free Elective'), generic('MINOR6', 'Minor / Free Elective')],
    },
  })
  const esgtPlan = plan({
    year1: {
      semA: ['CB2100', 'CB2201', 'CB2300', 'CB2601', 'GE1401', 'GE1601'],
      semB: ['CB2200', 'CB2400', 'CB2500', 'CB3410', 'GE2402', generic('GE-DR1', 'Gateway Education Distributional Requirement')],
    },
    year2: {
      semA: ['CB2101', 'CB2402', 'AC3202', 'AC4161', 'LW2903', 'CB2240'],
      semB: ['AC3390', 'AC4301', 'CB2203', 'GE1501', 'IS2021', generic('GE-DR2', 'Gateway Education Distributional Requirement')],
    },
    year3: {
      semA: ['AC4251', 'AC4303', 'AC4342', generic('GE-DR3', 'Gateway Education Distributional Requirement'), 'CB3041', generic('GE-DR4', 'Gateway Education Distributional Requirement')],
      semB: ['AC4383'],
      summer: ['CB3800'],
    },
    year4: {
      semA: ['AC3391', 'AC4332', 'AC4391', 'AC4392', generic('GE-COL', 'GE / College Elective')],
      semB: ['CB4303', 'LW3902', 'AC4382', 'IS3101'],
    },
  })
  accountancy.studyPlan = paPlan
  accountancy.defaultStreamCode = 'PA'
  accountancy.streams = [
    stream('PA', 'Professional Accountancy', paPlan, accountancy),
    stream('ESGT', 'ESG and Technology', esgtPlan, accountancy, { allCourses: ['AC4161', 'AC3390', 'IS2021', 'CB3041', 'AC4383', 'CB3800', 'AC3391', 'AC4392', 'AC4382', 'IS3101'] }),
  ]
  const esgtRequirements = accountancy.streams[1].requirements
  if (esgtRequirements?.majorElectives && typeof esgtRequirements.majorElectives === 'object') {
    esgtRequirements.majorElectives.credits = 0
    esgtRequirements.majorElectives.chooseCredits = 0
  }

  const globalBusiness = getMajor('BBA1_GBU-1')
  globalBusiness.studyPlan = plan({
    year1: {
      semA: ['CB2100', 'CB2601', 'CB2300', 'CB2200', 'GE1401', 'GE1601'],
      semB: ['CB2201', 'CB2400', 'CB2500', generic('GE-DR1', 'Gateway Education Distributional Requirement'), 'GE2402', 'CB3601'],
    },
    year2: {
      semA: ['CB3302', 'CB3645', 'CB3042', 'CB2101', 'CB2240'],
      semB: ['CB3410', 'CB3041', generic('SECOND-MAJOR1', 'Second Major Course'), generic('SECOND-MAJOR2', 'Second Major Course'), generic('GE-COL1', 'Gateway Education / College Elective')],
    },
    year3: {
      semA: ['CB2402', generic('MAJOR-ELECTIVE1', 'Global Business Major Elective'), generic('SECOND-MAJOR3', 'Second Major Course'), generic('SECOND-MAJOR4', 'Second Major Course'), 'CB2203'],
      semB: [generic('MAJOR-ELECTIVE2', 'Global Business Major Elective'), generic('SECOND-MAJOR5', 'Second Major Course'), generic('SECOND-MAJOR6', 'Second Major Course'), 'GE1501', generic('GE-DR2', 'Gateway Education Distributional Requirement')],
    },
    year4: {
      semA: [generic('SECOND-MAJOR7', 'Second Major Course'), 'CB4601', 'CB4604', generic('SECOND-MAJOR-OVERLAP', 'Second Major / GBU overlap (credit counted once)', 0, 'The official grid is 124 CU before overlap accounting. The degree minimum is 121 CU because one selected course may fulfil both requirement structures but is counted once.'), generic('GE-DR4', 'Gateway Education Distributional Requirement')],
      semB: ['CB4303', generic('SECOND-MAJOR8', 'Second Major Course'), generic('SECOND-MAJOR9', 'Second Major Course'), 'CB4606', generic('GE-COL2', 'Gateway Education / College Elective')],
    },
  })
  addNote(globalBusiness, 'The official grid displays 124 CU of requirement placements. One 3-CU second-major/GBU overlap is represented as a zero-additional-credit placeholder so the planner matches the official 121-CU minimum and never double-counts it.')

  const bdan = getMajor('BBA1_BDAN-1')
  const bdanYear1 = {
    semA: ['CB2201', 'CB2400', 'CB2500', generic('GE-DR1', 'Gateway Education Distributional Requirement'), 'GE1401', 'GE1601'],
    semB: ['CB2100', 'CB2200', 'CB2300', 'CB2601', 'GE2402'],
  }
  const daPlan = plan({
    year1: bdanYear1,
    year2: {
      semA: ['CB2101', 'CB2402', 'CB3410', 'MS3227', 'MS3251'],
      semB: ['CB2240', generic('GE-DR2', 'Gateway Education Distributional Requirement'), generic('COL-ELEC1', 'College Elective'), 'MS3252', generic('MINOR1', 'Minor / Free Elective')],
    },
    year3: {
      semA: [generic('GE-COL1', 'GE / College Elective'), 'GE1501', generic('COL-ELEC2', 'College Elective'), 'MS4224', generic('MINOR2', 'Minor / Free Elective')],
      semB: ['CB2203', generic('GE-DR3', 'Gateway Education Distributional Requirement'), 'MS3111', generic('MAJOR-ELECTIVE1', 'Decision Analytics Major Elective'), generic('MINOR3', 'Minor / Free Elective')],
    },
    year4: {
      semA: [generic('COL-ELEC3', 'College Elective'), generic('GE-DR4', 'Gateway Education Distributional Requirement'), 'MS3128', generic('FREE-ELECTIVE', 'Free Elective'), generic('MINOR4', 'Minor / Free Elective')],
      semB: ['CB4303', 'MS4226', 'MS4252', generic('MAJOR-ELECTIVE2', 'Decision Analytics Major Elective'), generic('MINOR5', 'Minor / Free Elective')],
    },
  })
  const diPlan = plan({
    year1: bdanYear1,
    year2: {
      semA: ['CB2101', 'CB2402', 'IS3331', 'MS3227', 'MS3251'],
      semB: ['CB2240', generic('GE-DR2', 'Gateway Education Distributional Requirement'), 'CB3410', 'MS3252', generic('MINOR1', 'Minor / Free Elective')],
    },
    year3: {
      semA: [generic('GE-COL1', 'GE / College Elective'), 'IS3100', 'IS3240', 'MS4224', generic('MINOR2', 'Minor / Free Elective')],
      semB: ['CB2203', generic('GE-DR3', 'Gateway Education Distributional Requirement'), 'MS4226', generic('COL-ELEC1', 'College Elective'), generic('MINOR3', 'Minor / Free Elective')],
    },
    year4: {
      semA: [generic('COL-ELEC2', 'College Elective'), 'GE1501', generic('MAJOR-ELECTIVE1', 'Data Informatics Major Elective'), generic('FREE-ELECTIVE', 'Free Elective'), generic('MINOR4', 'Minor / Free Elective')],
      semB: ['CB4303', generic('COL-ELEC3', 'College Elective'), generic('MAJOR-ELECTIVE2', 'Data Informatics Major Elective'), generic('GE-DR4', 'Gateway Education Distributional Requirement'), generic('MINOR5', 'Minor / Free Elective')],
    },
  })
  const oldDA = bdan.streams?.find((item) => /Decision/i.test(item.code))
  const oldDI = bdan.streams?.find((item) => /Informatics/i.test(item.code))
  bdan.studyPlan = daPlan
  bdan.defaultStreamCode = 'DA'
  bdan.requireStreamSelection = true
  bdan.streams = [
    stream('DA', 'Decision Analytics', daPlan, bdan, { requirements: clone(oldDA?.requirements ?? bdan.requirements), allCourses: oldDA?.allCourses }),
    stream('DI', 'Data Informatics', diPlan, bdan, { requirements: clone(oldDI?.requirements ?? bdan.requirements), allCourses: oldDI?.allCourses }),
  ]

  const gom = getMajor('BBA1_GOM-1')
  const wpdIndex = gom.studyPlan.year1.semA.courses.findIndex((item) => item.code === 'GE1601')
  if (wpdIndex >= 0) {
    const [wpd] = gom.studyPlan.year1.semA.courses.splice(wpdIndex, 1)
    gom.studyPlan.year1.semB.courses.push(wpd)
  }
  for (const year of Object.values(gom.studyPlan)) {
    for (const term of Object.values(year)) {
      term.courses = term.courses.filter((item) => item.code !== 'CHIN1001')
      term.credits = term.courses.reduce((total, item) => total + item.credits, 0)
    }
  }

  const gbsm = getMajor('BBA1_GBSM-1')
  const gbsmWpdIndex = gbsm.studyPlan.year1.semA.courses.findIndex((item) => item.code === 'GE1601')
  if (gbsmWpdIndex >= 0) {
    const [wpd] = gbsm.studyPlan.year1.semA.courses.splice(gbsmWpdIndex, 1)
    gbsm.studyPlan.year1.semB.courses.push(wpd)
    gbsm.studyPlan.year1.semA.credits -= 1
    gbsm.studyPlan.year1.semB.credits += 1
  }

  applyIfmgPlans()
}

function applyIfmgPlans() {
  const item = getMajor('BBA1_IFMG-1')
  delete item.requirements.majorElectives
  const common = {
    year1: {
      semA: ['CB2201', 'CB2400', 'CB2500', 'CB2601', 'GE1401'],
      semB: ['CB2240', 'CB2100', 'CB2300', 'CB2200', 'GE2402', 'GE1601'],
    },
    year2: {
      semA: ['CB2203', 'CB2101', 'CB2402', 'IS3331', 'GE1501'],
      semB: [generic('GE-DR1', 'Gateway Education Distributional Requirement'), 'CB3410', 'IS3430', generic('MINOR1', 'Minor / Free Elective'), generic('MINOR2', 'Minor / Free Elective')],
    },
  }
  const tail = (year3A, year3B, year4A, year4B) => plan({
    ...common,
    year3: {
      semA: [...year3A, generic('GE-DR2', 'Gateway Education Distributional Requirement'), generic('GE-DR3', 'Gateway Education Distributional Requirement'), generic('MINOR3', 'Minor / Free Elective')],
      semB: [...year3B, generic('COL-ELEC1', 'College Elective'), generic('GE-DR4', 'Gateway Education Distributional Requirement'), generic('MINOR4', 'Minor / Free Elective')],
    },
    year4: {
      semA: [...year4A, generic('COL-ELEC2', 'College Elective'), generic('MINOR5', 'Minor / Free Elective')],
      semB: [...year4B, generic('COL-ELEC3', 'College Elective'), generic('MINOR6', 'Minor / Free Elective')],
    },
  })
  const bi = tail(
    ['IS4834', 'IS3240'],
    [generic('MAJOR-ELECTIVE1', 'Business Intelligence Major Elective'), 'IS3100'],
    ['IS4532', generic('MAJOR-ELECTIVE2', 'Business Intelligence Major Elective'), 'IS4861'],
    ['CB4303', 'IS4335', generic('GE-COL', 'GE / College Elective')],
  )
  const isa = tail(
    ['IS3501', 'IS4435'],
    [generic('MAJOR-ELECTIVE1', 'Information Systems Auditing Major Elective'), 'IS4133'],
    ['IS4532', generic('MAJOR-ELECTIVE2', 'Information Systems Auditing Major Elective'), generic('GE-COL', 'GE / College Elective')],
    ['CB4303', 'IS4537', 'IS4543'],
  )
  const issn = tail(
    [generic('MAJOR-ELECTIVE1', 'Information Systems and Networking Major Elective'), 'IS2505'],
    ['IS2502', 'IS4246'],
    ['IS4532', generic('MAJOR-ELECTIVE2', 'Information Systems and Networking Major Elective'), 'IS4340'],
    ['CB4303', 'IS4538', generic('GE-COL', 'GE / College Elective')],
  )

  item.studyPlan = bi
  item.defaultStreamCode = 'BI'
  item.requireStreamSelection = true
  item.streams = [
    stream('BI', 'Business Intelligence', bi, item, { allCourses: ['IS4834', 'IS3240', 'IS3100', 'IS4532', 'IS4861', 'IS4335'] }),
    stream('ISA', 'Information Systems Auditing', isa, item, { allCourses: ['IS3501', 'IS4435', 'IS4133', 'IS4532', 'IS4537', 'IS4543'] }),
    stream('ISSN', 'Information Systems and Networking', issn, item, { allCourses: ['IS2505', 'IS2502', 'IS4246', 'IS4532', 'IS4340', 'IS4538'] }),
  ]
  addNote(item, 'The official 2025 suggested plans retain the former IFMG programme name. The current public-facing title is Artificial Intelligence in Business; BI, ISA and ISSN labels are preserved from that official source for cohort accuracy.')
}

function applyEngineeringPlans() {
  upsertCourse('CA2066', 'Professionals and Society', 3, 'Department of Architecture and Civil Engineering')
  const arce = getMajor('BENG1_ARCE-1')
  arce.totalCredits = 121
  const arceElective = arce.studyPlan.year3.semB.courses.findIndex((item) => item.code === 'ARCE-ELECTIVE1')
  if (arceElective >= 0) arce.studyPlan.year3.semB.courses.splice(arceElective, 1, plannedCourse('CA3793'))
  arce.studyPlan.year3.semB.credits = arce.studyPlan.year3.semB.courses.reduce((total, item) => total + item.credits, 0)

  const ceg = getMajor('BENG1_CEG-1')
  ceg.totalCredits = 121
  ceg.defaultStreamCode = 'Structural'
  ceg.streams = (ceg.streams ?? []).map((item) => ({
    ...item,
    totalCredits: 121,
    allCourses: [...new Set([...(item.allCourses ?? []), ...(ceg.allCourses ?? [])])],
    studyPlan: clone(ceg.studyPlan),
  }))

  applyArchitectureSurveyingPlans()

  const mase = getMajor('BENG1_MASE-1')
  mase.totalCredits = 121
  mase.studyPlan = plan({
    year1: {
      semA: ['CHEM1300', 'GE1401', { code: 'MA1200 / MA1300', title: 'Calculus and Basic Linear Algebra I / Enhanced Calculus and Linear Algebra I', credits: 3 }, { code: 'MSE1001', credits: 0 }, 'PHY1201', 'GE1601'],
      semB: ['CS1302', 'GE2410', { code: 'MA1201 / MA1301', title: 'Calculus and Basic Linear Algebra II / Enhanced Calculus and Linear Algebra II', credits: 3 }, 'PHY1202', generic('GE-DR1', 'Gateway Education Distributional Requirement')],
    },
    year2: {
      semA: [{ code: 'MA2001 / MA2158 / MA2181', title: 'Approved Mathematics Course', credits: 3 }, 'MSE2102', 'MSE2104', 'MSE2106', 'GE1501'],
      semB: [generic('GE-DR2', 'Gateway Education Distributional Requirement'), generic('GE-DR3', 'Gateway Education Distributional Requirement'), 'MSE2107', 'MSE2108', 'MSE2109', 'MSE3114'],
      summer: ['MSE2243'],
    },
    year3: {
      semA: ['MSE3171', 'MSE3190', 'MSE3244', generic('MAJOR-ELECTIVE1', 'Materials Science and Engineering Major Elective'), generic('FREE1', 'Free Elective')],
      semB: ['MSE3110', 'MSE3113', 'MSE3172', 'MSE3195', generic('MAJOR-ELECTIVE2', 'Materials Science and Engineering Major Elective')],
    },
    year4: {
      semA: [{ code: 'MSE4116', credits: 3, officialPlacement: 'Year 4 Semesters A and B' }, 'MSE2066', generic('MAJOR-ELECTIVE3', 'Materials Science and Engineering Major Elective'), generic('MAJOR-ELECTIVE4', 'Materials Science and Engineering Major Elective'), generic('FREE2', 'Free Elective')],
      semB: [{ code: 'MSE4116', credits: 3, officialPlacement: 'Year 4 Semesters A and B' }, generic('FREE3', 'Free Elective'), generic('FREE4', 'Free Elective'), generic('GE-DR4', 'Gateway Education Distributional Requirement')],
    },
  })

  getMajor('BENG1_A.E.-1').totalCredits = 121
  for (const code of ['BENG1_M.E.-1', 'BENG1_NRE-1']) {
    const item = getMajor(code)
    item.totalCredits = 121
    if (item.studyPlan.year3?.summer) {
      item.studyPlan.year3.summer.courses = item.studyPlan.year3.summer.courses.filter((course) => course.code !== 'FS3002')
      item.studyPlan.year3.summer.credits = item.studyPlan.year3.summer.courses.reduce((total, course) => total + course.credits, 0)
    }
    addNote(item, 'FS3002 is an optional placement/internship course and remains in the course pool; it is not pre-counted in the minimum-credit official study plan.')
  }

  const nre = getMajor('BENG1_NRE-1')
  moveCourse(nre.studyPlan, 'MNE4231', 'year4', 'semB', 'year4', 'semA')

  const itme = getMajor('BENG1_ITME-1')
  moveCourse(itme.studyPlan, 'SYE4036', 'year4', 'semB', 'year4', 'semA')
}

function moveCourse(studyPlan, courseCode, fromYear, fromTerm, toYear, toTerm) {
  const from = studyPlan[fromYear]?.[fromTerm]
  const to = studyPlan[toYear]?.[toTerm]
  if (!from || !to) return
  const index = from.courses.findIndex((item) => item.code === courseCode)
  if (index < 0) return
  const [course] = from.courses.splice(index, 1)
  to.courses.push(course)
  from.credits = from.courses.reduce((total, item) => total + item.credits, 0)
  to.credits = to.courses.reduce((total, item) => total + item.credits, 0)
}

function applyArchitectureSurveyingPlans() {
  const item = getMajor('BSC1_ARSV-1')
  const commonYear1 = {
    semA: [{ code: 'MA1200 / MA1300', title: 'Calculus and Basic Linear Algebra I / Enhanced Calculus and Linear Algebra I', credits: 3 }, 'CS1302', 'PHY1201', 'GE1401', 'CA1167', 'GE1601'],
    semB: [{ code: 'MA1201 / MA1301', title: 'Calculus and Basic Linear Algebra II / Enhanced Calculus and Linear Algebra II', credits: 3 }, 'GE1501', 'GE2410', 'CA2066', generic('GE-DR1', 'Gateway Education Distributional Requirement')],
  }
  const surveying = plan({
    year1: commonYear1,
    year2: {
      semA: ['CA2123', 'CA2213', 'CA2311', 'CA2744', generic('GE-DR2', 'Gateway Education Distributional Requirement')],
      semB: ['CA2126', { code: 'CA2418 / CA2627', title: 'Construction Technology / Surveying Stream Choice', credits: 3 }, generic('GE-DR3', 'Gateway Education Distributional Requirement'), generic('GE-DR4', 'Gateway Education Distributional Requirement'), generic('FREE1', 'Free Elective')],
    },
    year3: {
      semA: ['CA3214', 'CA3314', 'CA3629', 'CA3703'],
      semB: ['CA3321', 'CA3324', 'CA3691', generic('STREAM-ELECTIVE1', 'Surveying Stream Elective'), generic('STREAM-ELECTIVE2', 'Surveying Stream Elective'), generic('STREAM-ELECTIVE3', 'Surveying Stream Elective')],
    },
    year4: {
      semA: [{ code: 'CA4513', credits: 3, officialPlacement: 'Year 4 Semesters A and B' }, 'CA4415', 'CA4424', 'CA4524', 'CA4630'],
      semB: [
        { code: 'CA4513', credits: 3, officialPlacement: 'Year 4 Semesters A and B' },
        'CA4320',
        generic('STREAM-ELECTIVE4', 'Surveying Stream Elective'),
        generic('STREAM-ELECTIVE5', 'Surveying Stream Elective'),
        generic('STREAM-ELECTIVE6', 'Surveying Stream Elective'),
      ],
    },
  })
  const architecture = plan({
    year1: commonYear1,
    year2: {
      semA: [{ code: 'CA2343A/B', title: 'Architectural Design Studio I', credits: 6 }, 'CA2345', 'CA2346', 'CA2744'],
      semB: [{ code: 'CA2344A/B', title: 'Architectural Design Studio II', credits: 6 }, 'CA2347', 'CA2348', generic('GE-DR2', 'Gateway Education Distributional Requirement')],
    },
    year3: {
      semA: [{ code: 'CA3349A/B', title: 'Architectural Design Studio III', credits: 6 }, 'CA3170', 'CA3629', generic('GE-DR3', 'Gateway Education Distributional Requirement')],
      semB: [{ code: 'CA3350A/B', title: 'Architectural Design Studio IV', credits: 6 }, 'CA3342', 'CA3200', 'CA3691'],
      summer: ['CA3508'],
    },
    year4: {
      semA: [{ code: 'CA4539', credits: 6 }, { code: 'CA4534', credits: 3, officialPlacement: 'Year 4 Semesters A and B' }, 'CA4528', generic('GE-DR4', 'Gateway Education Distributional Requirement')],
      semB: [{ code: 'CA4540', credits: 6 }, { code: 'CA4534', credits: 3, officialPlacement: 'Year 4 Semesters A and B' }, generic('GE-COL1', 'GE / College Elective')],
    },
  })
  item.totalCredits = 121
  item.studyPlan = surveying
  item.defaultStreamCode = 'Surveying'
  item.requireStreamSelection = true
  const oldSurveying = item.streams?.find((candidate) => candidate.code === 'Surveying')
  const oldArchitecture = item.streams?.find((candidate) => candidate.code === 'Architecture')
  item.streams = [
    stream('Surveying', 'Surveying', surveying, item, { requirements: clone(oldSurveying?.requirements ?? item.requirements), allCourses: oldSurveying?.allCourses }),
    stream('Architecture', 'Architecture', architecture, item, { requirements: clone(oldArchitecture?.requirements ?? item.requirements), allCourses: oldArchitecture?.allCourses }),
  ]
  const surveyingElectiveCodes = [
    'CA2418', 'CA2627',
    'CA3168', 'CA3200', 'CA3228', 'CA3230', 'CA3342', 'CA3417', 'CA3422',
    'CA4413', 'CA4229', 'CA4313', 'CA4617', 'CA4623',
  ]
  item.requirements.majorElectives = {
    credits: 21,
    chooseCredits: 21,
    courses: surveyingElectiveCodes.map(plannedCourse),
  }
  item.streams[0].requirements.majorElectives = clone(item.requirements.majorElectives)
  item.streams[0].allCourses = [...new Set([...item.streams[0].allCourses, ...surveyingElectiveCodes])]
  item.streams[1].requirements.majorElectives = { credits: 0, chooseCredits: 0, courses: [] }
}

function applyLiberalArtsPlans() {
  const chis = getMajor('BA1_CHIS-1')
  chis.totalCredits = 121
  for (const year of Object.values(chis.studyPlan)) {
    for (const term of Object.values(year)) {
      const hasCreditBearingFyp = term.courses.some((course) => course.code === 'CAH4499' && course.credits > 0)
      if (hasCreditBearingFyp) term.courses = term.courses.filter((course) => course.code !== 'CAH4499' || course.credits > 0)
      term.credits = term.courses.reduce((total, course) => total + course.credits, 0)
    }
  }
  if (!chis.studyPlan.year1.semB.courses.some((course) => course.code === 'COL-FOUND-SS')) {
    chis.studyPlan.year1.semB.courses.push(generic('COL-FOUND-SS', 'College Foundation Course: Social Sciences'))
    chis.studyPlan.year1.semB.credits += 3
  }
  chis.streams = (chis.streams ?? []).map((item) => ({
    ...item,
    totalCredits: 121,
    studyPlan: clone(chis.studyPlan),
  }))
  const chinese = chis.streams.find((item) => item.code === 'Chinese')
  const chineseFree = chinese?.studyPlan.year4.semA.courses.findIndex((course) => /^FREE/.test(course.code)) ?? -1
  if (chinese && chineseFree >= 0) {
    chinese.studyPlan.year4.semA.courses.splice(chineseFree, 1, generic('CHIS-ELEC7', 'Chinese Stream Elective'))
  }

  applyEnglishPlans()

  const lla = getMajor('BA1_LLA-1')
  lla.studyPlan.year3.summer = semester([generic('LT-CORE-ELECTIVE', 'LT Core / Approved Elective')])
  addNote(lla, 'The official suggested plan leaves one 3-CU LT core/elective choice flexible. It is shown as a selectable slot rather than an invented course code.')
}

function applyEnglishPlans() {
  const item = getMajor('BA1_EN-1')
  const build = (code) => {
    const isEpc = code === 'EPC'
    return plan({
      year1: {
        semA: ['EN2714', generic('COL-FOUND-LIB', 'College Foundation Course: Liberal Arts'), 'GE1601', generic('GE-COL1', 'GE / College Elective'), 'GE1401', 'GE1501'],
        semB: ['EN2722', generic('COL-FOUND-SS', 'College Foundation Course: Social Sciences'), generic('GE-DR1', 'Gateway Education Distributional Requirement'), generic('GE-COL2', 'GE / College Elective'), 'GE2412'],
      },
      year2: {
        semA: ['EN2711', 'EN2717', 'EN3525', generic('GE-COL3', 'GE / College Elective'), generic('FREE1', 'Free Elective'), generic('FREE2', 'Free Elective')],
        semB: ['EN2718', 'EN3329', isEpc ? 'EN3586' : 'EN3589', isEpc ? 'EN4574' : 'EN3595', generic('GE-DR2', 'Gateway Education Distributional Requirement')],
      },
      year3: {
        semA: [isEpc ? 'EN3504' : 'EN3594', isEpc ? 'EN3592' : 'EN4577', generic(`${code}-ELECTIVE1`, `${code} Stream Elective`), generic(`${code}-ELECTIVE2`, `${code} Stream Elective`), generic('GE-DR3', 'Gateway Education Distributional Requirement')],
        semB: [generic(`${code}-ELECTIVE3`, `${code} Stream Elective`), generic('GE-DR4', 'Gateway Education Distributional Requirement'), generic('FREE3', 'Free Elective'), generic('FREE4', 'Free Elective'), generic('FREE5', 'Free Elective')],
        summer: ['EN3593'],
      },
      year4: {
        semA: [{ code: 'EN4575 / EN4576', title: 'Capstone Project / Research Project', credits: 3, officialPlacement: 'Year 4 Semesters A and B' }, generic(`${code}-ELECTIVE4`, `${code} Stream Elective`), generic('FREE6', 'Free Elective'), generic('FREE7', 'Free Elective')],
        semB: [{ code: 'EN4575 / EN4576', title: 'Capstone Project / Research Project', credits: 3, officialPlacement: 'Year 4 Semesters A and B' }, generic(`${code}-ELECTIVE5`, `${code} Stream Elective`), generic('FREE8', 'Free Elective'), generic('FREE9', 'Free Elective')],
      },
    })
  }
  const epc = build('EPC')
  const ll = build('LL')
  item.totalCredits = 121
  item.studyPlan = epc
  item.defaultStreamCode = 'EPC'
  item.requireStreamSelection = true
  const oldEpc = item.streams?.find((candidate) => candidate.code === 'EPC')
  const oldLl = item.streams?.find((candidate) => candidate.code === 'LL')
  item.streams = [
    stream('EPC', 'English for Professional Communication', epc, item, { requirements: clone(oldEpc?.requirements ?? item.requirements), allCourses: oldEpc?.allCourses }),
    stream('LL', 'English Language and Literature', ll, item, { requirements: clone(oldLl?.requirements ?? item.requirements), allCourses: oldLl?.allCourses }),
  ]
  item.requirements.majorElectives = { ...(typeof item.requirements.majorElectives === 'object' ? item.requirements.majorElectives : {}), credits: 15, chooseCredits: 15 }
  for (const candidate of item.streams) {
    candidate.requirements.majorElectives = { ...(candidate.requirements.majorElectives ?? {}), credits: 15, chooseCredits: 15 }
  }
}

function applySocialSciencePlans() {
  applyPafmPlans()

  const crs = getMajor('BSS1_CRS-1')
  crs.studyPlan = plan({
    year1: {
      semA: ['SS1011', 'SS1101', 'GE1401', 'GE1501', generic('COL-LIB', 'College Foundation Course: Liberal Arts'), 'GE1601'],
      semB: ['SS1024', 'GE2401', generic('COL-SS', 'College Foundation Course: Social Sciences'), generic('GE-DR1', 'Gateway Education Distributional Requirement'), generic('GE-COL1', 'GE / College Elective')],
    },
    year2: {
      semA: ['SS2029', 'SS2030', 'SS2034', generic('CRS-ELECTIVE1', 'Crime Science Elective'), generic('CRS-ELECTIVE2', 'Crime Science Elective'), generic('CRS-ELECTIVE3', 'Crime Science Elective')],
      semB: ['SS2025', 'SS3119', 'SS3120', generic('GE-DR2', 'Gateway Education Distributional Requirement'), generic('FREE1', 'Free Elective')],
    },
    year3: {
      semA: ['SS4207', generic('GE-DR3', 'Gateway Education Distributional Requirement'), generic('FREE2', 'Free Elective'), generic('FREE3', 'Free Elective'), generic('FREE4', 'Free Elective')],
      semB: ['SS2709', 'SS4572', generic('GE-DR4', 'Gateway Education Distributional Requirement'), generic('FREE5', 'Free Elective'), generic('FREE6', 'Free Elective')],
    },
    year4: {
      semA: [{ code: 'SS4296', credits: 3, officialPlacement: 'Year 4 Semesters A and B' }, 'SS4300', generic('GE-COL2', 'GE / College Elective'), generic('FREE7', 'Free Elective'), generic('FREE8', 'Free Elective')],
      semB: [{ code: 'SS4296', credits: 3, officialPlacement: 'Year 4 Semesters A and B' }, 'SS4718', generic('GE-COL3', 'GE / College Elective'), generic('FREE9', 'Free Elective')],
    },
  })

  const psy = getMajor('BSS1_PSY-1')
  psy.studyPlan = plan({
    year1: {
      semA: ['SS1011', 'SS1101', 'SS2033', 'GE1401', 'GE1601', generic('COL-LIB', 'College Foundation Course: Liberal Arts')],
      semB: ['SS1024', 'SS2028', 'GE2401', 'GE1501', generic('COL-SS', 'College Foundation Course: Social Sciences')],
    },
    year2: {
      semA: ['SS2712', 'SS3707', generic('PSY-ELECTIVE1', 'Psychology Elective'), generic('GE-DR1', 'Gateway Education Distributional Requirement'), generic('GE-COL1', 'GE / College Elective')],
      semB: ['SS2701', 'SS3708', generic('PSY-ELECTIVE2', 'Psychology Elective'), generic('GE-DR2', 'Gateway Education Distributional Requirement'), generic('GE-COL2', 'GE / College Elective')],
    },
    year3: {
      semA: ['SS3711', 'SS3712', generic('PSY-ELECTIVE3', 'Psychology Elective'), generic('PSY-ELECTIVE4', 'Psychology Elective'), generic('GE-DR3', 'Gateway Education Distributional Requirement')],
      semB: ['SS3713', 'SS3714', generic('PSY-ELECTIVE5', 'Psychology Elective'), generic('PSY-ELECTIVE6', 'Psychology Elective'), generic('GE-DR4', 'Gateway Education Distributional Requirement')],
    },
    year4: {
      semA: [{ code: 'SS4708', credits: 6 }, generic('GE-COL3', 'GE / College Elective'), generic('FREE1', 'Free Elective'), generic('FREE2', 'Free Elective')],
      semB: [generic('FREE3', 'Free Elective'), generic('FREE4', 'Free Elective'), generic('FREE5', 'Free Elective'), generic('FREE6', 'Free Elective'), generic('FREE7', 'Free Elective')],
    },
  })

  const socialWork = getMajor('BSS1_SW-1')
  socialWork.studyPlan = plan({
    year1: {
      semA: ['SS1011', 'SS1101', 'GE1401', 'GE1501', 'GE1601', generic('COL-LIB', 'College Foundation Course: Liberal Arts')],
      semB: ['SS1024', generic('COL-SS', 'College Foundation Course: Social Sciences'), 'GE2401', generic('GE-DR1', 'Gateway Education Distributional Requirement'), generic('GE-COL1', 'GE / College Elective')],
    },
    year2: {
      semA: ['SS2029', 'SS2105', 'SS2278', { code: 'SS3283', credits: 1 }, generic('SW-ELECTIVE1', 'Social Work Elective'), generic('GE-DR2', 'Gateway Education Distributional Requirement')],
      semB: ['SS2113', 'SS2115', 'SS2201', 'SS2203', 'SS3285'],
    },
    year3: {
      semA: ['SS2116', 'SS2202', { code: 'SS3284', credits: 1 }, 'SS3290', 'SS4210', generic('GE-DR3', 'Gateway Education Distributional Requirement')],
      semB: [{ code: 'SS3292', credits: 8 }, generic('SW-ELECTIVE2', 'Social Work Elective'), generic('GE-DR4', 'Gateway Education Distributional Requirement')],
    },
    year4: {
      semA: ['SS3282', { code: 'SS4291', credits: 8 }, generic('SW-ELECTIVE3', 'Social Work Elective')],
      semB: ['SS3286', 'SS4004', 'SS4111', generic('GE-COL2', 'GE / College Elective'), generic('GE-COL3', 'GE / College Elective')],
    },
  })
}

function applyPafmPlans() {
  const item = getMajor('BSS1_PAFM-1')
  const build = (code) => {
    const pag = code === 'PAG'
    return plan({
      year1: {
        semA: ['PIA2307', 'PIA2530', generic('PIA-COLLEGE1', 'PIA College-specified Course'), 'GE1401', 'GE1601', generic('GE-DR1', 'Gateway Education Distributional Requirement')],
        semB: ['PIA2105', 'PIA2107', 'PIA2400', generic('PIA-COLLEGE2', 'PIA College-specified Course'), 'GE2412', 'GE1501'],
      },
      year2: {
        semA: pag ? ['PIA2012', 'PIA2050', 'PIA3032', 'PIA3109', generic('GE-DR2', 'Gateway Education Distributional Requirement')] : ['PIA2012', 'PIA2308', 'PIA2524', 'PIA3306', generic('GE-DR2', 'Gateway Education Distributional Requirement')],
        semB: pag ? ['PIA3900', 'PIA2402', 'PIA3111', generic('GE-COL1', 'GE / College Elective'), generic('FREE1', 'Free Elective')] : ['PIA3900', 'PIA3310', 'PIA3316', generic('GE-COL1', 'GE / College Elective'), generic('FREE1', 'Free Elective')],
      },
      year3: {
        semA: pag ? ['PIA3121', 'PIA4142', generic(`${code}-ELECTIVE1`, `${code} Stream Elective`), generic('GE-DR3', 'Gateway Education Distributional Requirement'), generic('FREE2', 'Free Elective')] : ['PIA3241', 'PIA3921', generic(`${code}-ELECTIVE1`, `${code} Stream Elective`), generic('GE-DR3', 'Gateway Education Distributional Requirement'), generic('FREE2', 'Free Elective')],
        semB: pag ? ['PIA3127', generic(`${code}-ELECTIVE2`, `${code} Stream Elective`), generic(`${code}-ELECTIVE3`, `${code} Stream Elective`), generic('GE-DR4', 'Gateway Education Distributional Requirement'), generic('FREE3', 'Free Elective')] : ['PIA3307', generic(`${code}-ELECTIVE2`, `${code} Stream Elective`), generic(`${code}-ELECTIVE3`, `${code} Stream Elective`), generic('GE-DR4', 'Gateway Education Distributional Requirement'), generic('FREE3', 'Free Elective')],
      },
      year4: {
        semA: ['PIA4601', generic(`${code}-ELECTIVE4`, `${code} Stream Elective`), generic('GE-COL2', 'GE / College Elective'), generic('FREE4', 'Free Elective'), generic('FREE5', 'Free Elective')],
        semB: [generic(`${code}-ELECTIVE5`, `${code} Stream Elective`), generic('GE-COL3', 'GE / College Elective'), generic('FREE6', 'Free Elective'), generic('FREE7', 'Free Elective')],
      },
    })
  }
  const pag = build('PAG')
  const ppm = build('PPM')
  item.studyPlan = pag
  item.defaultStreamCode = 'PAG'
  item.requireStreamSelection = true
  const oldPag = item.streams?.find((candidate) => candidate.code === 'PAG')
  const oldPpm = item.streams?.find((candidate) => candidate.code === 'PPM')
  item.streams = [
    stream('PAG', 'Public Administration and Governance', pag, item, { requirements: clone(oldPag?.requirements ?? item.requirements), allCourses: oldPag?.allCourses }),
    stream('PPM', 'Public Policy and Management', ppm, item, { requirements: clone(oldPpm?.requirements ?? item.requirements), allCourses: oldPpm?.allCourses }),
  ]
}

function applySciencePlans() {
  const physics = getMajor('BSC1_PHY-1')
  physics.totalCredits = 121
  const originalYear2 = clone(physics.studyPlan.year2)
  physics.studyPlan = plan({
    year1: {
      semA: ['PHY1101', 'CS1302', { code: 'CSCI1001', credits: 0 }, { code: 'MA1200 / MA1300', title: 'Calculus and Basic Linear Algebra I / Enhanced Calculus and Linear Algebra I', credits: 3 }, 'GE1401', generic('GE-DR1', 'Gateway Education Distributional Requirement'), 'GE1601'],
      semB: ['PHY1202', 'PHY1203', 'CHEM1101', { code: 'CSCI1002', credits: 0 }, { code: 'MA1201 / MA1301', title: 'Calculus and Basic Linear Algebra II / Enhanced Calculus and Linear Algebra II', credits: 3 }, 'GE2401'],
    },
    year2: {
      semA: originalYear2.semA.courses,
      semB: originalYear2.semB.courses,
    },
    year3: {
      semA: ['PHY3205', 'PHY3231', 'PHY3251', generic('FREE1', 'Free Elective', 6)],
      semB: ['PHY3115', 'PHY3272', generic('GE-DR2', 'Gateway Education Distributional Requirement'), generic('FREE2', 'Free Elective', 6)],
    },
    year4: {
      semA: [{ code: 'PHY4217', title: 'Final Year Project', credits: 3, officialPlacement: 'Year 4 Semesters A and B' }, generic('MAJOR-ELECTIVE1', 'Physics Major Elective'), generic('MAJOR-ELECTIVE2', 'Physics Major Elective'), generic('MAJOR-ELECTIVE3', 'Physics Major Elective'), generic('MAJOR-ELECTIVE4', 'Physics Major Elective')],
      semB: [{ code: 'PHY4217', title: 'Final Year Project', credits: 3, officialPlacement: 'Year 4 Semesters A and B' }, generic('MAJOR-ELECTIVE5', 'Physics Major Elective'), generic('MAJOR-ELECTIVE6', 'Physics Major Elective'), generic('FREE3', 'Free Elective', 6)],
    },
  })

  const chemistry = getMajor('BSC1_CHEM-1')
  addNote(chemistry, 'The official Chemistry handbook groups Year 1 requirements across Semesters A and B and leaves elective/free-elective slots flexible. This page is labelled Structure rather than an exact compulsory semester path.')

  const computingMath = getMajor('BSC1_CM-1')
  addNote(computingMath, 'The official normative schedule totals 124 planned CU against a 122-CU minimum. MA4530 is a 6-CU year-long project shown as 3 CU in each final-year semester and must not be treated as a duplicate.')

  applyVeterinaryPlan()
}

function applyVeterinaryPlan() {
  const bvmCourses = {
    VM2001: ['One Health', 3],
    VM2102: ['Animal Behaviour and Handling', 3],
    VM2003: ['Livestock Husbandry', 3],
    VM2100: ['Statistics for Evidence-Based Biological and Veterinary Sciences', 3],
    VM2106: ['Aquaculture and Aquatic Animal Health', 3],
    VM2103: ['Animal Nutrition and Welfare', 3],
    VM2104: ['Introduction to Food Safety', 3],
    VM3004: ['Evidence-Based Veterinary Medicine', 3],
    VM3010: ['Veterinary Practice and Professional Studies 1', 3],
    VM3012: ['Animal Body', 18],
    VM3100: ['Function and Dysfunction', 18],
    VM3101: ['General Pathology', 3],
    VM4000: ['Host, Agent and Defence', 18],
    VM4001: ['Clinical Pharmacology / Toxicology', 3],
    VM4010: ['Veterinary Practice and Professional Studies 2', 3],
    VM4110: ['Small Animal Clinical Studies 1', 8],
    VM4111: ['Companion Animal Surgery', 6],
    VM4112: ['Anaesthesia, Analgesia and Fluid Therapy', 4],
    VM4113: ['Clinical Pathology', 2],
    VM3003: ['Food Safety and Regulation', 2],
    VM4401: ['Research Project', 6],
    VM4011: ['Veterinary Practice and Professional Studies 3', 3],
    VM4103: ['Conservation, Zoo and Exotic Animal Medicine', 3],
    VM4104: ['Transboundary Animal Diseases', 2],
    VM4202: ['Aquatic Veterinary Medicine', 2],
    VM4301: ['Clinical Rotations: Part I', 5],
    VM4114: ['Small Animal Clinical Studies 2', 5],
    VM4115: ['Equine Medicine and Surgery', 6],
    VM4116: ['Production Animal Clinical Studies', 8],
    VM4302: ['Clinical Rotations: Part II', 21],
    VM4303: ['Clinical Rotations: Part III', 21],
    VM1001: ['Pre-EMS', 0],
    VM1002: ['Animal Husbandry EMS', 0],
    VM1004: ['Pre-Clinical EMS', 0],
    VM1005: ['Clinical EMS', 0],
  }
  for (const [code, [title, credits]] of Object.entries(bvmCourses)) {
    upsertCourse(code, title, credits, 'Jockey Club College of Veterinary Medicine and Life Sciences')
  }

  const item = getMajor('BVM_VM2-1')
  item.totalCredits = 243
  item.studyPlan = plan({
    year1: {
      semA: ['CHEM1300', 'GE1351', 'GE1401', 'GE1501', 'VM2001', 'VM2102', 'GE1601'],
      semB: ['GE2401', generic('GE-AREA2', 'Gateway Education Area 2 Course'), 'PHY1400', 'GE2139', 'VM2003', 'VM2100'],
      summer: [{ code: 'VM1001', credits: 0 }, { code: 'VM1002', credits: 0 }],
    },
    year2: {
      semA: ['BMS2202', 'BMS2803', 'BMS2804', 'CHEM2007B', 'PHY2400', 'VM2106'],
      semB: ['BMS2805', 'BMS2806', 'GE2342', 'VM2103', 'VM2104', 'VM3004'],
      summer: [{ code: 'VM1002', credits: 0 }],
    },
    year3: {
      semA: ['VM3010', 'VM3012'],
      semB: ['VM3100', 'VM3101'],
    },
    year4: {
      semA: ['VM4000', 'VM4001'],
      semB: ['VM4010', 'VM4110', 'VM4111', 'VM4112', 'VM4113'],
      summer: [{ code: 'VM1004', credits: 0 }],
    },
    year5: {
      semA: ['VM4114', 'VM4115', 'VM4116', { code: 'VM4401', credits: 3, officialPlacement: 'Year 5 Semesters A and B' }],
      semB: ['VM3003', { code: 'VM4401', credits: 3, officialPlacement: 'Year 5 Semesters A and B' }, 'VM4011', 'VM4103', 'VM4104', 'VM4202', 'VM4301'],
      summer: [{ code: 'VM1005', credits: 0 }, { code: 'VM4301', credits: 0, officialPlacement: 'Year 5 Semester B and Summer continuation' }],
    },
    year6: {
      semA: ['VM4302', { code: 'VM1005', credits: 0 }],
      semB: ['VM4303', { code: 'VM1005', credits: 0 }],
    },
  })
}

function applyCreativeMediaPlans() {
  upsertCourse('SM1702', courses.SM1702?.title ?? 'Creative Media Studio I', 6, 'School of Creative Media')
  upsertCourse('SM4712A', 'Graduation Thesis / Project', 6, 'School of Creative Media')
  upsertCourse('SM4712B', 'Graduation Thesis / Project', 6, 'School of Creative Media')
  upsertCourse('SM4712C', 'Graduation Thesis / Project', 6, 'School of Creative Media')
  for (const code of ['SM2724A', 'SM2724B', 'SM2724C', 'SM2724D', 'SM2724E', 'SM2724F']) {
    upsertCourse(code, 'Leadership & Creativity', 1, 'School of Creative Media')
  }

  const commonYear1 = {
    semA: ['GE1401', 'GE1601', generic('GE-DR1', 'Gateway Education Area 1 Course'), 'CS1103B', 'SM1701', { code: 'SM1702', credits: 3, officialPlacement: 'Year 1 Semesters A and B' }],
    semB: ['GE2413', generic('GE-DR2', 'Gateway Education Area 2 Course'), 'GE1501', { code: 'SM1702', credits: 3, officialPlacement: 'Year 1 Semesters A and B' }, generic('FREE1', 'Free Elective / Minor')],
  }

  const ba = getMajor('BA1_CRM-1')
  ba.totalCredits = 121
  const baPlan = plan({
    year1: commonYear1,
    year2: {
      semA: ['SM2715', 'SM2706', generic('FREE2', 'Free Elective / Minor'), generic('MAJOR-ELECTIVE1', 'Creative Media Major Elective'), generic('MAJOR-ELECTIVE2', 'Creative Media Major Elective')],
      semB: ['SM2704', 'SM2105', generic('MAJOR-ELECTIVE3', 'Creative Media Major Elective'), generic('MAJOR-ELECTIVE4', 'Creative Media Major Elective'), 'SM2716', generic('MAJOR-ELECTIVE5', 'Creative Media Major Elective')],
    },
    year3: {
      semA: [generic('MAJOR-ELECTIVE6', 'Creative Media Major Elective'), generic('MAJOR-ELECTIVE7', 'Creative Media Major Elective'), generic('MAJOR-ELECTIVE8', 'Creative Media Major Elective'), generic('MAJOR-ELECTIVE9', 'Creative Media Major Elective'), generic('GE-DR3', 'Gateway Education Area 3 Course')],
      semB: [generic('MAJOR-ELECTIVE10', 'Creative Media Major Elective'), generic('MAJOR-ELECTIVE11', 'Creative Media Major Elective'), generic('MAJOR-ELECTIVE12', 'Creative Media Major Elective'), generic('MAJOR-ELECTIVE13', 'Creative Media Major Elective'), generic('GE-DR4', 'Gateway Education Course')],
    },
    year4: {
      semA: [{ code: 'SM4712A', credits: 3, officialPlacement: 'Year 4 Semesters A and B' }, generic('MAJOR-ELECTIVE14', 'Creative Media Major Elective'), generic('MAJOR-ELECTIVE15', 'Creative Media Major Elective'), generic('FREE3', 'Free Elective / Minor'), generic('FREE4', 'Free Elective / Minor')],
      semB: [{ code: 'SM4712A', credits: 3, officialPlacement: 'Year 4 Semesters A and B' }, generic('MAJOR-ELECTIVE16', 'Creative Media Major Elective'), generic('FREE5', 'Free Elective / Minor'), generic('FREE6', 'Free Elective / Minor')],
    },
  })
  ba.studyPlan = baPlan
  ba.streams = [stream('CREATE', 'CREATE Stream', makeCreatePlan(baPlan), ba, { totalCredits: 124 })]

  const bas = getMajor('BAS1_NEM-1')
  bas.totalCredits = 121
  const basPlan = plan({
    year1: {
      semA: commonYear1.semA,
      semB: ['GE2413', generic('GE-DR2', 'Gateway Education Area 2 Course'), generic('SCHOOL-SPECIFIED', 'School-specified Course'), { code: 'SM1702', credits: 3, officialPlacement: 'Year 1 Semesters A and B' }, generic('FREE1', 'Free Elective / Minor')],
    },
    year2: {
      semA: ['SM2704', 'SM2706', 'SM2715', generic('MAJOR-ELECTIVE1', 'New Media Major Elective'), generic('MAJOR-ELECTIVE2', 'New Media Major Elective')],
      semB: ['GE1501', 'SM2716', generic('ART-SCIENCE-STUDIO1', 'Art and Science Studio Course 1', 6), generic('MAJOR-ELECTIVE3', 'New Media Major Elective'), generic('MAJOR-ELECTIVE4', 'New Media Major Elective')],
    },
    year3: {
      semA: [generic('ART-SCIENCE-STUDIO2', 'Art and Science Studio Course 2', 6), generic('MAJOR-ELECTIVE5', 'New Media Major Elective'), generic('GE-DR3', 'Gateway Education Area 3 Course'), generic('FREE2', 'Free Elective / Minor')],
      semB: [generic('MAJOR-ELECTIVE6', 'New Media Major Elective'), generic('MAJOR-ELECTIVE7', 'New Media Major Elective'), generic('MAJOR-ELECTIVE8', 'New Media Major Elective'), generic('MAJOR-ELECTIVE9', 'New Media Major Elective'), generic('MAJOR-ELECTIVE10', 'New Media Major Elective')],
    },
    year4: {
      semA: [{ code: 'SM4712C', credits: 3, officialPlacement: 'Year 4 Semesters A and B' }, generic('MAJOR-ELECTIVE11', 'New Media Major Elective'), generic('GE-DR4', 'Gateway Education Course'), generic('FREE3', 'Free Elective / Minor'), generic('FREE4', 'Free Elective / Minor')],
      semB: [{ code: 'SM4712C', credits: 3, officialPlacement: 'Year 4 Semesters A and B' }, generic('MAJOR-ELECTIVE12', 'New Media Major Elective'), generic('FREE5', 'Free Elective / Minor'), generic('FREE6', 'Free Elective / Minor')],
    },
  })
  bas.studyPlan = basPlan
  bas.streams = [stream('CREATE', 'CREATE Stream', makeCreatePlan(basPlan), bas, { totalCredits: 124 })]

  const bsc = getMajor('BSC1_CRM1-1')
  bsc.totalCredits = 121
  const bscPlan = plan({
    year1: {
      semA: ['GE1401', 'GE1601', generic('GE-DR1', 'Gateway Education Area 1 Course'), 'SM1701', { code: 'SM1702', credits: 3, officialPlacement: 'Year 1 Semesters A and B' }, 'CS1103B'],
      semB: ['GE2413', generic('GE-DR2', 'Gateway Education Area 2 Course'), generic('SCHOOL-SPECIFIED', 'School-specified Course'), { code: 'SM1702', credits: 3, officialPlacement: 'Year 1 Semesters A and B' }, generic('FREE1', 'Free Elective / Minor')],
    },
    year2: {
      semA: ['GE1501', 'CS2116', 'CS2313', 'SM3601', 'SM3611', generic('MAJOR-ELECTIVE1', 'CS / SCM Major Elective')],
      semB: [generic('GE-DR3', 'Gateway Education Area 3 Course'), 'CS2303', 'CS2204', 'CS2403', 'SM2714', 'SM2609'],
    },
    year3: {
      semA: ['CS3301', generic('MAJOR-ELECTIVE2', 'CS / SCM Major Elective'), generic('MAJOR-ELECTIVE3', 'CS / SCM Major Elective'), generic('MAJOR-ELECTIVE4', 'CS / SCM Major Elective'), generic('MAJOR-ELECTIVE5', 'CS / SCM Major Elective')],
      semB: [generic('MAJOR-ELECTIVE6', 'CS / SCM Major Elective'), generic('MAJOR-ELECTIVE7', 'CS / SCM Major Elective'), generic('MAJOR-ELECTIVE8', 'CS / SCM Major Elective'), generic('MAJOR-ELECTIVE9', 'CS / SCM Major Elective'), generic('FREE2', 'Free Elective / Minor')],
    },
    year4: {
      semA: [{ code: 'SM4712B', credits: 3, officialPlacement: 'Year 4 Semesters A and B' }, generic('MAJOR-ELECTIVE10', 'CS / SCM Major Elective'), generic('GE-DR4', 'Gateway Education Course'), generic('FREE3', 'Free Elective / Minor'), generic('FREE4', 'Free Elective / Minor')],
      semB: [{ code: 'SM4712B', credits: 3, officialPlacement: 'Year 4 Semesters A and B' }, generic('FREE5', 'Free Elective / Minor'), generic('FREE6', 'Free Elective / Minor')],
    },
  })
  const game = clone(bscPlan)
  game.year3 = plan({ year3: {
    semA: ['CS3301', 'CS4182', 'CS4187', 'SM2603', generic('MAJOR-ELECTIVE4', 'SCM Major Elective')],
    semB: ['CS4386', generic('MAJOR-ELECTIVE5', 'CS / SCM Major Elective'), generic('MAJOR-ELECTIVE8', 'SCM Major Elective'), generic('MAJOR-ELECTIVE9', 'CS / SCM Major Elective'), generic('FREE2', 'Free Elective / Minor')],
  } }).year3
  const animation = clone(bscPlan)
  animation.year3 = plan({ year3: {
    semA: ['CS3301', 'CS4182', 'SM3701', generic('MAJOR-ELECTIVE4', 'CS Major Elective'), generic('MAJOR-ELECTIVE5', 'CS / SCM Major Elective')],
    semB: ['SM3605', generic('MAJOR-ELECTIVE8', 'CS / SCM Major Elective'), generic('MAJOR-ELECTIVE9', 'CS / SCM Major Elective'), generic('MAJOR-ELECTIVE10', 'CS / SCM Major Elective'), generic('FREE2', 'Free Elective / Minor')],
  } }).year3
  replacePlanCourse(animation, 'year4', 'semA', (course) => course.code === 'MAJOR-ELECTIVE10', 'year4', 'semA', 'SM4124')
  const interaction = clone(bscPlan)
  interaction.year3 = plan({ year3: {
    semA: ['CS3301', 'CS3483', 'CS4187', { code: 'SM2233 / SM2260', title: 'Multimedia Production Project / Interactive Narrative', credits: 3 }, generic('MAJOR-ELECTIVE4', 'SCM Major Elective')],
    semB: [{ code: 'SM3610 / SM2716', title: 'Hardware Hacking / Physical Computing and Tangible Media', credits: 3 }, generic('MAJOR-ELECTIVE5', 'CS / SCM Major Elective'), generic('MAJOR-ELECTIVE8', 'CS / SCM Major Elective'), generic('MAJOR-ELECTIVE9', 'CS / SCM Major Elective'), generic('FREE2', 'Free Elective / Minor')],
  } }).year3
  bsc.studyPlan = bscPlan
  bsc.defaultStreamCode = 'GENERAL'
  bsc.requireStreamSelection = false
  bsc.streams = [
    stream('GENERAL', 'No Optional Stream', bscPlan, bsc),
    stream('GAME', 'Game Stream', game, bsc),
    stream('ANIMATION', 'Animation Stream', animation, bsc),
    stream('INTERACTION', 'Installation / Interactivity Stream', interaction, bsc),
    stream('CREATE', 'CREATE Stream', makeCreatePlan(bscPlan), bsc, { totalCredits: 124 }),
  ]
}

function applySeePlans() {
  upsertCourse('EF3043', 'Economics of Sustainability', 3, 'Department of Economics and Finance')
  upsertCourse('EF4010', 'Sustainable Finance', 3, 'Department of Economics and Finance')
  upsertCourse('SEE4992', 'Final Year Project on Sustainability', 6, 'School of Energy and Environment')
  correctCoursePrerequisites('PHY1201', [], 'HKDSE Mathematics Compulsory Part or equivalent. Pre-cursor: HKDSE Physics, Combined Science with Physics, or AP1200/PHY1200.')
  correctCoursePrerequisites('SYE4024', [], 'Students must complete a minimum of 30 credit units to be eligible.')
  correctCoursePrerequisites('SEE4000', ['SEE2000'], 'SEE2000 Professional Development I')
  const ese = getMajor('BENG1_ESE-1')
  addPlanCourseOnce(ese.studyPlan, 'year3', 'summer', 'SEE4000')
  const oldEseStar = ese.streams?.find((item) => item.code === 'eSTAR')
  const oldEseBss = ese.streams?.find((item) => item.code === 'BSS')
  const eseBss = plan({
    year1: {
      semA: clone(ese.studyPlan.year1.semA.courses),
      semB: clone(ese.studyPlan.year1.semB.courses),
    },
    year2: {
      semA: ['SEE2000', 'SEE2001', 'SEE2002', 'SEE2003', 'CA1167'],
      semB: ['GE1501', 'MA2181', 'SEE2101', 'SEE2201', generic('GE-DR4', 'Gateway Education Distributional Requirement')],
    },
    year3: {
      semA: ['CA3712', 'CA3732', 'SEE3002', 'SEE3101', 'SEE3102', 'SEE3103'],
      semB: ['SEE3001', 'SEE3003', 'SEE3104', 'SEE4001', 'SEE4217', generic('MAJOR-ELECTIVE1', 'ESE Major Elective'), generic('MAJOR-ELECTIVE2', 'ESE Major Elective')],
      summer: ['SEE4000'],
    },
    year4: {
      semA: ['CA3722', 'CA4737', 'SEE4003', 'SEE4112', { code: 'SEE4997', credits: 3, officialPlacement: 'Year 4 Semesters A and B' }, 'SYE4024'],
      semB: ['CA4718', 'SEE4004', 'SEE4216', { code: 'SEE4997', credits: 3, officialPlacement: 'Year 4 Semesters A and B' }, generic('MAJOR-ELECTIVE3', 'ESE Major Elective'), generic('MAJOR-ELECTIVE4', 'ESE Major Elective')],
    },
  })
  ese.streams = [
    {
      ...oldEseStar,
      code: 'eSTAR',
      name: oldEseStar?.name ?? 'Energy Science and Technology Advanced Research (eSTAR)',
      studyPlanStatus: 'diy',
      studyPlan: emptyStudyPlan(4),
      notes: [...new Set([...(oldEseStar?.notes ?? []), 'No separate official semester-by-semester eSTAR schedule was confirmed. Use the complete eSTAR requirement pool to build a personal plan.'])],
    },
    stream('BSS', oldEseBss?.name ?? 'Building Services Studies Discipline', eseBss, ese, { totalCredits: 140, requirements: clone(oldEseBss?.requirements ?? ese.requirements), allCourses: oldEseBss?.allCourses }),
  ]

  const eve = getMajor('BENG1_EVE-1')
  addPlanCourseOnce(eve.studyPlan, 'year3', 'summer', 'SEE4000')
  const oldEveStar = eve.streams?.find((item) => item.code === 'eSTAR')
  const oldEveBss = eve.streams?.find((item) => item.code === 'BSS')
  const eveBss = plan({
    year1: {
      semA: clone(eve.studyPlan.year1.semA.courses),
      semB: clone(eve.studyPlan.year1.semB.courses),
    },
    year2: {
      semA: ['SEE2000', 'SEE2001', 'SEE2002', 'SEE2003', 'SEE2203', 'SEE2204', 'CA1167'],
      semB: ['GE1501', 'CHEM2004', 'MA2181', 'SEE2101', 'SEE2201'],
    },
    year3: {
      semA: ['CA3712', 'CA3732', 'SEE3002', 'SEE3101', 'SEE3103', 'SEE4218'],
      semB: ['SEE3003', 'SEE3203', 'SEE4001', 'SEE4204', 'SEE4217', generic('MAJOR-ELECTIVE1', 'EVE Major Elective'), generic('GE-DR4', 'Gateway Education Distributional Requirement')],
      summer: ['SEE4000'],
    },
    year4: {
      semA: ['CA3722', 'CA4737', 'SEE4002', { code: 'SEE4996', credits: 3, officialPlacement: 'Year 4 Semesters A and B' }, 'SYE4024', generic('MAJOR-ELECTIVE2', 'EVE Major Elective')],
      semB: ['CA4718', 'SEE4004', 'SEE4203', { code: 'SEE4996', credits: 3, officialPlacement: 'Year 4 Semesters A and B' }, generic('MAJOR-ELECTIVE3', 'EVE Major Elective')],
    },
  })
  eve.streams = [
    {
      ...oldEveStar,
      code: 'eSTAR',
      name: oldEveStar?.name ?? 'Energy and Environment Advanced Research (eSTAR)',
      studyPlanStatus: 'diy',
      studyPlan: emptyStudyPlan(4),
      notes: [...new Set([...(oldEveStar?.notes ?? []), 'No separate official semester-by-semester eSTAR schedule was confirmed. Use the complete eSTAR requirement pool to build a personal plan.'])],
    },
    stream('BSS', oldEveBss?.name ?? 'Building Services Studies Discipline', eveBss, eve, { totalCredits: 144, requirements: clone(oldEveBss?.requirements ?? eve.requirements), allCourses: oldEveBss?.allCourses }),
  ]

  const doubleDegree = getMajor('DEVEFIN1_D009-0')
  moveCourse(doubleDegree.studyPlan, 'AC3390', 'year4', 'semB', 'year4', 'semA')
  const extraElectiveIndex = doubleDegree.studyPlan.year5.semA.courses.findIndex((item) => item.code === 'EVE-ELECTIVE2')
  if (extraElectiveIndex >= 0) doubleDegree.studyPlan.year5.semA.courses.splice(extraElectiveIndex, 1)
  doubleDegree.studyPlan.year5.semA.credits = doubleDegree.studyPlan.year5.semA.courses.reduce((total, item) => total + item.credits, 0)
  if (doubleDegree.requirements.majorElectives && typeof doubleDegree.requirements.majorElectives === 'object') {
    doubleDegree.requirements.majorElectives.credits = 6
    doubleDegree.requirements.majorElectives.chooseCredits = 6
  }
}

function applyLawPlan() {
  const item = getMajor('LLB1_LW-1')
  item.totalCredits = 121
  if (!item.studyPlan.year1.semB.courses.some((course) => course.code === 'GE2411')) {
    item.studyPlan.year1.semB.courses.push(plannedCourse('GE2411'))
    item.studyPlan.year1.semB.credits += 3
  }
  if (!item.studyPlan.year1.semB.courses.some((course) => course.code === 'GE1501')) {
    item.studyPlan.year1.semB.courses.push(plannedCourse('GE1501'))
    item.studyPlan.year1.semB.credits += 3
  }
  if (!item.studyPlan.year3.semB.courses.some((course) => course.code === 'LAW-FLEXIBLE')) {
    item.studyPlan.year3.semB.courses.push(generic('LAW-FLEXIBLE', 'Law / Gateway Education / Free Elective'))
    item.studyPlan.year3.semB.credits += 3
  }
  addNote(item, 'The official source is a programme structure rather than a compulsory semester schedule. Flexible LAW/GE slots remain editable and must be checked against current course offerings.')
}

const derivedPlanDisclosure = 'Reference plan only: this is not an explicit official semester-by-semester study plan. It is derived from the official 2026/27 curriculum, graduation requirements, course offering terms and prerequisite sequence; students must adjust it for timetable changes, exchange and individual choices. / 仅供参考：这不是官网明确逐学期 study plan，而是按 2026/27 官方课程结构、毕业要求、开课学期及先修链推导，请结合实际课表、交换与个人选课自行调整。'

function applyManagementSchedule() {
  const item = getMajor('BBA1_MGMT-1')
  item.totalCredits = 121
  item.studyPlan = plan({
    year1: {
      semA: ['CB2201', 'CB2601', 'CB2400', generic('GE-DR1', 'Gateway Education Course'), 'GE1601', { code: 'GE1401', title: 'University English or EAP1' }],
      semB: ['CB2100', 'CB2300', 'CB2500', generic('GE-DR2', 'Gateway Education Course'), { code: 'GE2402', title: 'English for Business Communication or EAP2' }],
    },
    year2: {
      semA: ['CB2402', 'CB2101', 'CB2200', 'MGT3306', 'MGT2324'],
      semB: ['CB2240', 'CB3410', generic('GE-DR3', 'Gateway Education Course'), generic('GE-DR4', 'Gateway Education Course'), generic('MINOR1', 'Minor / Free Elective 1')],
    },
    year3: {
      semA: ['CB2203', 'MGT3305', 'MGT4227', 'GE1501', generic('MINOR2', 'Minor / Free Elective 2')],
      semB: [generic('GE-COL', 'GE / College Elective'), generic('STREAM-ELECT1', 'Stream Elective in HRM or SIM'), generic('MAJOR-ELECT1', 'Major Elective'), generic('COL-ELEC1', 'College Elective 1'), generic('MINOR3', 'Minor / Free Elective 3')],
    },
    year4: {
      semA: ['CB4303', generic('STREAM-ELECT2', 'Stream Elective in HRM or SIM'), generic('MAJOR-ELECT2', 'Major Elective'), generic('COL-ELEC2', 'College Elective 2'), generic('MINOR4', 'Minor / Free Elective 4')],
      semB: [generic('FREE-ELECTIVE', 'Free Elective'), generic('STREAM-ELECT3', 'Stream Elective in HRM or SIM'), generic('MAJOR-ELECT3', 'Major Elective'), generic('COL-ELEC3', 'College Elective 3'), generic('MINOR5', 'Minor / Free Elective 5')],
    },
  })

  const generalElectives = ['MGT3302', 'MGT4101', 'MGT4305', 'MGT4314', 'MGT4315', 'MGT4800']
  const hrmCourses = ['MGT3307', 'MGT4306', 'MGT4307', 'MGT4308', 'MGT4309']
  const simCourses = ['MGT3422', 'MGT4310', 'MGT4311', 'MGT4312', 'MGT4313']
  item.requirements.majorElectives = requirementSection(18, [...generalElectives, ...hrmCourses, ...simCourses], {
    chooseCredits: 18,
    note: 'Complete 9 CU from the selected HRM/SIM stream and 9 CU of other approved major electives.',
  })

  const streamRequirements = (streamCourses) => {
    const requirements = cloneRequirements(item)
    requirements.majorElectives = requirementSection(18, [...generalElectives, ...streamCourses], {
      chooseCredits: 18,
      note: 'Complete 9 CU from this stream and 9 CU of other approved Management major electives.',
    })
    return requirements
  }
  const streamPlan = (label) => {
    const result = clone(item.studyPlan)
    for (const year of Object.values(result)) {
      for (const term of Object.values(year)) {
        for (const course of term.courses) {
          if (/^STREAM-ELECT/.test(course.code)) course.title = `${label} Stream Elective`
        }
      }
    }
    return result
  }
  item.streams = [
    stream('HRM', 'Human Resources Management (HRM)', streamPlan('HRM'), item, {
      totalCredits: 121,
      requirements: streamRequirements(hrmCourses),
      allCourses: hrmCourses,
      description: 'Human resources, employment law, performance management and talent development.',
    }),
    stream('SIM', 'Strategy and International Management (SIM)', streamPlan('SIM'), item, {
      totalCredits: 121,
      requirements: streamRequirements(simCourses),
      allCourses: simCourses,
      description: 'Strategy, international business, innovation management and entrepreneurship.',
    }),
  ]
  delete item.defaultStreamCode
  item.requireStreamSelection = false
  item.notes = [
    'Study plan source: BBAU4_2025 Management schedule supplied by the user, updated on 13 August 2025 and effective from Semester A 2025/26.',
    'GE1401 and GE2402 are counted once. Students assigned EAP1/EAP2 should follow the alternative language-course boxes in the source schedule.',
    'CHIN1001 is conditional and is not counted in the 121-CU minimum. Students without a minor use the minor slots as free electives.',
    'An approved internship, consultancy project or research project must be completed through an eligible college or major course.',
  ]
}

function businessRequirements(majorCore, majorElectives, electiveNote) {
  return {
    gatewayEducation: requirementSection(22, ['GE1401', 'GE2402', 'GE1501', 'GE1601', generic('GE-DR', 'GE Distributional Requirements', 12)]),
    college: requirementSection(42, ['CB2100', 'CB2101', 'CB2200', 'CB2201', 'CB2300', 'CB2400', 'CB2402', 'CB2500', 'CB2601', 'CB3410', 'CB4303', generic('COL-ELEC1', 'College Elective 1'), generic('COL-ELEC2', 'College Elective 2'), generic('COL-ELEC3', 'College Elective 3')]),
    collegeRequirement: requirementSection(9, ['CB2240', 'CB2203', generic('GE-COL', 'GE / College-specified Course')]),
    majorCore: requirementSection(majorCore.reduce((total, code) => total + (courses[code]?.credits ?? 3), 0), majorCore),
    majorElectives: requirementSection(majorElectives, [generic('MAJOR-ELECTIVE', 'Approved Major Elective', 3)], { chooseCredits: majorElectives, note: electiveNote }),
    freeElectives: requirementSection(18, [], { note: 'May be used for a minor or approved free electives.' }),
  }
}

function applyBusinessDerivedPlans() {
  const commonYear1 = {
    semA: ['CB2100', 'CB2201', 'CB2300', 'CB2601', 'GE1401', 'GE1601'],
    semB: ['CB2200', 'CB2400', 'CB2500', 'GE2402', 'GE1501'],
  }

  const businessEconomics = getMajor('BBA1_BE2-1')
  businessEconomics.totalCredits = 121
  businessEconomics.requirements = businessRequirements(['EF2452', 'EF3441', 'EF3442', 'EF3450'], 18, 'Choose 18 CU from the official Business Economics elective list.')
  businessEconomics.studyPlan = plan({
    year1: commonYear1,
    year2: {
      semA: ['CB2101', 'CB2402', 'CB2240', 'EF2452', generic('GE-DR1', 'GE Distributional Requirement')],
      semB: ['CB3410', 'CB2203', 'EF3441', 'EF3442', generic('GE-DR2', 'GE Distributional Requirement')],
    },
    year3: {
      semA: [generic('GE-DR3', 'GE Distributional Requirement'), generic('COL-ELEC1', 'College Elective 1'), generic('MAJOR-ELECT1', 'Business Economics Elective 1'), generic('FREE1', 'Free Elective 1'), generic('GE-COL', 'GE / College-specified Course')],
      semB: ['EF3450', generic('GE-DR4', 'GE Distributional Requirement'), generic('COL-ELEC2', 'College Elective 2'), generic('MAJOR-ELECT2', 'Business Economics Elective 2'), generic('FREE2', 'Free Elective 2')],
    },
    year4: {
      semA: ['CB4303', generic('COL-ELEC3', 'College Elective 3'), generic('MAJOR-ELECT3', 'Business Economics Elective 3'), generic('MAJOR-ELECT4', 'Business Economics Elective 4'), generic('FREE3', 'Free Elective 3')],
      semB: [generic('MAJOR-ELECT5', 'Business Economics Elective 5'), generic('MAJOR-ELECT6', 'Business Economics Elective 6'), generic('FREE4', 'Free Elective 4'), generic('FREE5', 'Free Elective 5'), generic('FREE6', 'Free Elective 6')],
    },
  })

  const finance = getMajor('BBA1_FIN3-1')
  finance.totalCredits = 121
  finance.requirements = businessRequirements(['EF3320', 'EF3333', 'EF4321', 'EF4313', 'EF4314', 'EF4822', 'EF4331'], 9, 'Choose 9 CU from the official Finance elective list.')
  finance.studyPlan = plan({
    year1: commonYear1,
    year2: {
      semA: ['CB2101', 'CB2402', 'CB2240', 'CB3410', generic('GE-DR1', 'GE Distributional Requirement')],
      semB: ['CB2203', 'EF3320', 'EF3333', generic('GE-DR2', 'GE Distributional Requirement'), generic('COL-ELEC1', 'College Elective 1')],
    },
    year3: {
      semA: ['EF4321', generic('GE-DR3', 'GE Distributional Requirement'), generic('COL-ELEC2', 'College Elective 2'), generic('MAJOR-ELECT1', 'Finance Elective 1'), generic('FREE1', 'Free Elective 1')],
      semB: ['EF4313', 'EF4314', 'EF4822', generic('GE-DR4', 'GE Distributional Requirement'), generic('FREE2', 'Free Elective 2')],
    },
    year4: {
      semA: ['CB4303', generic('GE-COL', 'GE / College-specified Course'), generic('COL-ELEC3', 'College Elective 3'), generic('MAJOR-ELECT2', 'Finance Elective 2'), generic('FREE3', 'Free Elective 3')],
      semB: ['EF4331', generic('MAJOR-ELECT3', 'Finance Elective 3'), generic('FREE4', 'Free Elective 4'), generic('FREE5', 'Free Elective 5'), generic('FREE6', 'Free Elective 6')],
    },
  })

  const marketing = getMajor('BBA1_MKT1-1')
  marketing.totalCredits = 121
  marketing.requirements = businessRequirements(['MKT3602', 'MKT3603', 'MKT4611', 'MKT4628', 'MKT4606'], 15, 'Choose 15 CU from the official Marketing elective list and complete an approved experiential-learning option.')
  marketing.studyPlan = plan({
    year1: commonYear1,
    year2: {
      semA: ['CB2101', 'CB2402', 'CB2240', 'MKT3602', generic('GE-DR1', 'GE Distributional Requirement')],
      semB: ['CB3410', 'CB2203', 'MKT3603', generic('GE-DR2', 'GE Distributional Requirement'), generic('COL-ELEC1', 'College Elective 1')],
      summer: [{ code: 'MKT1641 / MKT1671 / MKT2643A / MKT2672 / MKT3673', title: 'Approved Marketing experiential-learning option', credits: 0, remarks: 'Choose the approved option applicable to the student cohort.' }],
    },
    year3: {
      semA: ['MKT4611', 'MKT4628', generic('MAJOR-ELECT1', 'Marketing Elective 1'), generic('GE-DR3', 'GE Distributional Requirement'), generic('FREE1', 'Free Elective 1')],
      semB: ['MKT4606', generic('MAJOR-ELECT2', 'Marketing Elective 2'), generic('GE-DR4', 'GE Distributional Requirement'), generic('COL-ELEC2', 'College Elective 2'), generic('FREE2', 'Free Elective 2')],
    },
    year4: {
      semA: ['CB4303', generic('GE-COL', 'GE / College-specified Course'), generic('COL-ELEC3', 'College Elective 3'), generic('MAJOR-ELECT3', 'Marketing Elective 3'), generic('FREE3', 'Free Elective 3')],
      semB: [generic('MAJOR-ELECT4', 'Marketing Elective 4'), generic('MAJOR-ELECT5', 'Marketing Elective 5'), generic('FREE4', 'Free Elective 4'), generic('FREE5', 'Free Elective 5'), generic('FREE6', 'Free Elective 6')],
    },
  })

  for (const item of [businessEconomics, finance, marketing]) addNote(item, derivedPlanDisclosure)
}

function classRequirements(majorCoreCredits, majorCore, majorElectiveCredits, freeCredits, electiveTitle = 'Approved Major Elective') {
  return {
    gatewayEducation: requirementSection(31, ['GE1401', 'GE2412', 'GE1501', 'GE1601', generic('GE-DR', 'GE Distributional Requirements', 12), generic('GE-COLLEGE', 'College-specified GE Courses', 9)]),
    collegeRequirement: requirementSection(6, [generic('COL-LIB', 'Liberal Arts Studies Course'), generic('COL-SOC', 'Social Sciences Studies Course')]),
    majorCore: requirementSection(majorCoreCredits, majorCore),
    majorElectives: requirementSection(majorElectiveCredits, [generic('MAJOR-ELECTIVE', electiveTitle)], { chooseCredits: majorElectiveCredits }),
    freeElectives: requirementSection(freeCredits, [], { note: 'Use approved free electives or a minor.' }),
  }
}

function applyClassDerivedPlans() {
  const tvb = getMajor('BA1_TVB-1')
  const tvbCore = ['COM2105', 'COM2118', 'COM2116', 'COM2202', 'COM2303', 'COM3115', 'COM3119', 'COM3209', 'COM3508', 'COM4305', 'COM4306', 'COM4307', 'COM4308']
  tvb.totalCredits = 121
  tvb.requirements = classRequirements(39, tvbCore, 15, 30, 'TVB Core Elective / Major Elective')
  tvb.studyPlan = plan({
    year1: {
      semA: ['GE1401', 'GE1601', 'GE1501', 'COM2105', generic('GE-COL1', 'College-specified GE Course 1'), generic('COL-LIB', 'Liberal Arts Studies Course')],
      semB: ['GE2412', 'COM2118', generic('GE-COL2', 'College-specified GE Course 2'), generic('COL-SOC', 'Social Sciences Studies Course'), generic('GE-DR1', 'GE Distributional Requirement')],
    },
    year2: {
      semA: ['COM2202', 'COM2303', 'COM3119', generic('GE-DR2', 'GE Distributional Requirement'), generic('GE-COL3', 'College-specified GE Course 3')],
      semB: ['COM2116', 'COM3115', generic('GE-DR3', 'GE Distributional Requirement'), generic('FREE1', 'Free Elective 1'), generic('FREE2', 'Free Elective 2')],
    },
    year3: {
      semA: ['COM3209', 'COM3508', 'COM4307', generic('GE-DR4', 'GE Distributional Requirement'), generic('FREE3', 'Free Elective 3')],
      semB: ['COM4305', 'COM4306', generic('MAJOR-ELECT1', 'TVB Core Elective'), generic('MAJOR-ELECT2', 'TVB Major Elective 1'), generic('FREE4', 'Free Elective 4')],
    },
    year4: {
      semA: [generic('MAJOR-ELECT3', 'TVB Major Elective 2'), generic('MAJOR-ELECT4', 'TVB Major Elective 3'), generic('FREE5', 'Free Elective 5'), generic('FREE6', 'Free Elective 6'), generic('FREE7', 'Free Elective 7')],
      semB: ['COM4308', generic('MAJOR-ELECT5', 'TVB Major Elective 4'), generic('FREE8', 'Free Elective 8'), generic('FREE9', 'Free Elective 9'), generic('FREE10', 'Free Elective 10')],
    },
  })

  const mdcm = getMajor('BA1_MDCM-1')
  const mdcmCore = ['COM2105', 'COM2118', 'COM2103', 'COM2202', 'COM2303', 'COM2501', 'COM2509', 'COM3109', 'COM3115', 'COM3119', 'COM4604']
  mdcm.totalCredits = 121
  mdcm.requirements = classRequirements(33, mdcmCore, 27, 24, 'MDCM Major Elective')
  mdcm.studyPlan = plan({
    year1: {
      semA: ['GE1401', 'GE1601', 'GE1501', 'COM2105', generic('GE-COL1', 'College-specified GE Course 1'), generic('COL-LIB', 'Liberal Arts Studies Course')],
      semB: ['GE2412', 'COM2118', generic('GE-COL2', 'College-specified GE Course 2'), generic('COL-SOC', 'Social Sciences Studies Course'), generic('GE-DR1', 'GE Distributional Requirement')],
    },
    year2: {
      semA: ['COM2202', 'COM2303', 'COM3119', generic('GE-DR2', 'GE Distributional Requirement'), generic('GE-COL3', 'College-specified GE Course 3')],
      semB: ['COM2103', 'COM2501', 'COM2509', generic('GE-DR3', 'GE Distributional Requirement'), generic('FREE1', 'Free Elective 1')],
    },
    year3: {
      semA: [generic('MAJOR-ELECT1', 'MDCM Major Elective 1'), generic('MAJOR-ELECT2', 'MDCM Major Elective 2'), generic('MAJOR-ELECT3', 'MDCM Major Elective 3'), generic('GE-DR4', 'GE Distributional Requirement'), generic('FREE2', 'Free Elective 2')],
      semB: ['COM3109', 'COM3115', generic('MAJOR-ELECT4', 'MDCM Major Elective 4'), generic('MAJOR-ELECT5', 'MDCM Major Elective 5'), generic('FREE3', 'Free Elective 3')],
    },
    year4: {
      semA: [generic('MAJOR-ELECT6', 'MDCM Major Elective 6'), generic('MAJOR-ELECT7', 'MDCM Major Elective 7'), generic('MAJOR-ELECT8', 'MDCM Major Elective 8'), generic('FREE4', 'Free Elective 4'), generic('FREE5', 'Free Elective 5')],
      semB: ['COM4604', generic('MAJOR-ELECT9', 'MDCM Major Elective 9'), generic('FREE6', 'Free Elective 6'), generic('FREE7', 'Free Elective 7'), generic('FREE8', 'Free Elective 8')],
    },
  })

  const irga = getMajor('BSS1_IRGA-1')
  const irgaCore = ['PIA2012', 'PIA2105', 'PIA2402', 'PIA2030', 'PIA2050', 'PIA3031', 'PIA3126', 'PIA3130', 'PIA3151', 'PIA3800', 'PIA3812', 'PIA3032', 'PIA3121', 'PIA3123', 'PIA3142', 'PIA3153', 'PIA4123', 'PIA4152']
  irga.totalCredits = 121
  irga.requirements = classRequirements(51, irgaCore, 12, 21, 'IRGA Major Elective')
  irga.studyPlan = plan({
    year1: {
      semA: ['GE1401', 'GE1601', 'GE1501', 'PIA2012', generic('GE-COL1', 'College-specified GE Course 1'), generic('COL-LIB', 'Liberal Arts Studies Course')],
      semB: ['GE2412', 'PIA2105', 'PIA2402', generic('GE-COL2', 'College-specified GE Course 2'), generic('COL-SOC', 'Social Sciences Studies Course')],
    },
    year2: {
      semA: ['PIA2030', 'PIA2050', 'PIA3031', generic('GE-DR1', 'GE Distributional Requirement'), generic('GE-COL3', 'College-specified GE Course 3')],
      semB: ['PIA3126', 'PIA3130', 'PIA3151', generic('GE-DR2', 'GE Distributional Requirement'), generic('FREE1', 'Free Elective 1')],
      summer: ['PIA3800', 'PIA3812'],
    },
    year3: {
      semA: ['PIA3032', 'PIA3121', 'PIA3123', 'PIA3142', generic('GE-DR3', 'GE Distributional Requirement')],
      semB: ['PIA3153', 'PIA4123', 'PIA4152', generic('GE-DR4', 'GE Distributional Requirement'), generic('MAJOR-ELECT1', 'IRGA Major Elective 1')],
    },
    year4: {
      semA: [generic('MAJOR-ELECT2', 'IRGA Major Elective 2'), generic('MAJOR-ELECT3', 'IRGA Major Elective 3'), generic('MAJOR-ELECT4', 'IRGA Major Elective 4'), generic('FREE2', 'Free Elective 2'), generic('FREE3', 'Free Elective 3')],
      semB: [generic('FREE4', 'Free Elective 4'), generic('FREE5', 'Free Elective 5'), generic('FREE6', 'Free Elective 6'), generic('FREE7', 'Free Elective 7')],
    },
  })

  const crso = getMajor('BSS1_CRSO-1')
  const foundationAndCommon = ['SS1011', 'SS1101', 'SS1024', 'SS2025', 'SS2034', 'SS2029', 'SS2030', 'SS3119', 'SS3120']
  const criminology = ['SS2709', 'SS4217', 'SS4296', 'SS4300', 'SS4207', 'SS4718']
  const sociology = ['SS3417', 'SS3419', 'SS3423', 'SS3428', 'SS4601', 'SS4595']
  const commonCrsoPlan = {
    year1: {
      semA: ['GE1401', 'GE1601', 'GE1501', 'SS1011', generic('GE-COL1', 'College-specified GE Course 1'), generic('COL-LIB', 'Liberal Arts Studies Course')],
      semB: ['GE2412', 'SS1101', 'SS1024', generic('GE-COL2', 'College-specified GE Course 2'), generic('COL-SOC', 'Social Sciences Studies Course')],
    },
    year2: {
      semA: ['SS2034', 'SS2029', 'SS2030', generic('GE-DR1', 'GE Distributional Requirement'), generic('GE-COL3', 'College-specified GE Course 3')],
      semB: ['SS2025', 'SS3119', 'SS3120', generic('GE-DR2', 'GE Distributional Requirement'), generic('FREE1', 'Free Elective 1')],
    },
  }
  const criminologyPlan = plan({
    ...commonCrsoPlan,
    year3: {
      semA: ['SS4300', 'SS4207', { code: 'SS4296', credits: 3, officialPlacement: 'Year 3 Semesters A and B' }, generic('GE-DR3', 'GE Distributional Requirement'), generic('FREE2', 'Free Elective 2')],
      semB: ['SS2709', 'SS4217', { code: 'SS4296', credits: 3, officialPlacement: 'Year 3 Semesters A and B' }, generic('GE-DR4', 'GE Distributional Requirement'), generic('MAJOR-ELECT1', 'Criminology and Sociology Elective 1')],
    },
    year4: {
      semA: [generic('MAJOR-ELECT2', 'Criminology and Sociology Elective 2'), generic('MAJOR-ELECT3', 'Criminology and Sociology Elective 3'), generic('FREE3', 'Free Elective 3'), generic('FREE4', 'Free Elective 4'), generic('FREE5', 'Free Elective 5')],
      semB: ['SS4718', generic('FREE6', 'Free Elective 6'), generic('FREE7', 'Free Elective 7'), generic('FREE8', 'Free Elective 8'), generic('FREE9', 'Free Elective 9')],
    },
  })
  const sociologyPlan = plan({
    ...commonCrsoPlan,
    year3: {
      semA: ['SS3417', 'SS3423', { code: 'SS4595', credits: 3, officialPlacement: 'Year 3 Semesters A and B' }, generic('GE-DR3', 'GE Distributional Requirement'), generic('FREE2', 'Free Elective 2')],
      semB: ['SS3419', 'SS3428', 'SS4601', { code: 'SS4595', credits: 3, officialPlacement: 'Year 3 Semesters A and B' }, generic('GE-DR4', 'GE Distributional Requirement')],
    },
    year4: {
      semA: [generic('MAJOR-ELECT1', 'Criminology and Sociology Elective 1'), generic('MAJOR-ELECT2', 'Criminology and Sociology Elective 2'), generic('MAJOR-ELECT3', 'Criminology and Sociology Elective 3'), generic('FREE3', 'Free Elective 3'), generic('FREE4', 'Free Elective 4')],
      semB: [generic('FREE5', 'Free Elective 5'), generic('FREE6', 'Free Elective 6'), generic('FREE7', 'Free Elective 7'), generic('FREE8', 'Free Elective 8'), generic('FREE9', 'Free Elective 9')],
    },
  })
  const crsoRequirements = (streamCourses) => classRequirements(48, [...foundationAndCommon, ...streamCourses], 9, 27, 'Criminology and Sociology Major Elective')
  crso.totalCredits = 121
  crso.studyPlan = criminologyPlan
  crso.requirements = crsoRequirements(criminology)
  crso.defaultStreamCode = 'CRIM'
  crso.requireStreamSelection = true
  crso.streams = [
    stream('CRIM', 'Criminology Stream', criminologyPlan, crso, { totalCredits: 121, requirements: crsoRequirements(criminology), allCourses: criminology }),
    stream('SOC', 'Applied Sociology Stream', sociologyPlan, crso, { totalCredits: 121, requirements: crsoRequirements(sociology), allCourses: sociology }),
  ]

  for (const item of [tvb, mdcm, irga, crso]) addNote(item, derivedPlanDisclosure)
}

function makeFlagshipStream(baseCode, code, name, studyPlan, requirements, totalCredits, extraCourses, description) {
  const base = getMajor(baseCode)
  return stream(code, name, studyPlan, base, {
    totalCredits,
    requirements,
    allCourses: extraCourses,
    description,
    notes: [derivedPlanDisclosure],
  })
}

function applyInspirePlans() {
  const item = getMajor('BSEE_INSPIRE-1')
  const build = (baseCode, code, name, totalCredits) => {
    const base = getMajor(baseCode)
    const studyPlan = clone(base.studyPlan)
    addPlanCourse(studyPlan, 'year3', 'semB', generic('FLAGSHIP-EXCHANGE', 'Compulsory INSPIRE overseas exchange / approved credit-transfer semester', 0, 'Course choices in this semester must be approved for exchange credit transfer.'))
    addPlanCourseOnce(studyPlan, 'year3', 'summer', 'SEE4000')
    addPlanCourse(studyPlan, 'year2', 'semA', { code: 'SEE4993', credits: 0.5, officialPlacement: 'Two consecutive semesters' })
    addPlanCourse(studyPlan, 'year2', 'semB', { code: 'SEE4993', credits: 0.5, officialPlacement: 'Two consecutive semesters' })
    addPlanCourse(studyPlan, 'year2', 'summer', 'SEE4994')
    addPlanCourse(studyPlan, 'year3', 'summer', 'SEE4998')

    const requirements = cloneRequirements(base)
    addRequirementCourse(requirements, 'majorCore', 'SEE4000')
    addRequirementCourse(requirements, 'majorCore', 'SEE4993', 1)
    addRequirementCourse(requirements, 'majorCore', 'SEE4994', 3)
    addRequirementCourse(requirements, 'majorCore', 'SEE4998', 3)
    return makeFlagshipStream(
      baseCode,
      code,
      name,
      studyPlan,
      requirements,
      totalCredits,
      ['SEE4000', 'SEE4993', 'SEE4994', 'SEE4995', 'SEE4998', 'SEE4999'],
      `Derived from the ${base.title} recommended plan, with INSPIRE research training and compulsory overseas exchange overlaid.`,
    )
  }

  item.streams = [
    build('BENG1_ESE-1', 'ESE', 'Energy Science and Engineering Track', 132),
    build('BENG1_EVE-1', 'EVE', 'Environmental Science and Engineering Track', 130),
  ]
  item.defaultStreamCode = 'ESE'
  item.requireStreamSelection = true
  item.totalCredits = 132
  item.studyPlan = clone(item.streams[0].studyPlan)
  item.requirements = clone(item.streams[0].requirements)
  item.allCourses = [...new Set(item.streams.flatMap((candidate) => candidate.allCourses ?? []))]
  item.notes = [
    derivedPlanDisclosure,
    'INSPIRE follows the underlying ESE or EVE curriculum, adds 7 CU of research training, and requires an approved overseas exchange. The exchange semester is shown as a zero-additional-credit marker because transferred courses depend on the host institution.',
    'The displayed research route uses SEE4993 + SEE4994 + SEE4998. SEE4995 or SEE4999 may be approved as the alternative 6-CU research route.',
  ]
}

function applyBio3Plans() {
  upsertCourse('CBM4000', 'Research Seminar', 1, 'College of Biomedicine')
  Object.assign(courses.CBM4000, {
    duration: 'Two Semesters',
    semester: 'Not offering in current academic year',
    prerequisites: [],
    prerequisitesRaw: '',
    assessment: { continuous: '100%', continuousPass: '40%' },
    detailStatus: 'parsed',
    description: 'Research seminars across two consecutive semesters in biomedicine and biomedical engineering.',
  })
  upsertCourse('CBM4001', 'Overseas Research Project', 3, 'College of Biomedicine')
  Object.assign(courses.CBM4001, {
    duration: 'One Semester',
    semester: 'Not offering in current academic year',
    prerequisites: [],
    prerequisitesRaw: '',
    assessment: { continuous: '100%', continuousPass: '40%' },
    detailStatus: 'parsed',
    description: 'Supervised research at an overseas research institute or university.',
  })

  const item = getMajor('CBIO_BIO3-1')
  const build = (baseCode, code, name, designatedCourse, designatedYear, designatedTerm) => {
    const base = getMajor(baseCode)
    const studyPlan = clone(base.studyPlan)
    addPlanCourse(studyPlan, designatedYear, designatedTerm, designatedCourse)
    addPlanCourse(studyPlan, 'year3', 'summer', 'CBM4001')
    addPlanCourse(studyPlan, 'year4', 'semA', { code: 'CBM4000', credits: 0.5, officialPlacement: 'Two consecutive semesters' })
    addPlanCourse(studyPlan, 'year4', 'semB', { code: 'CBM4000', credits: 0.5, officialPlacement: 'Two consecutive semesters' })

    const requirements = cloneRequirements(base)
    addRequirementCourse(requirements, 'majorCore', 'CBM4000', 1)
    addRequirementCourse(requirements, 'majorCore', 'CBM4001', 3)
    addRequirementCourse(requirements, 'majorElectives', designatedCourse, 3)
    const majorElectives = requirements.majorElectives
    if (majorElectives && typeof majorElectives === 'object' && typeof majorElectives.chooseCredits === 'number') {
      majorElectives.chooseCredits += 3
    }
    return makeFlagshipStream(baseCode, code, name, studyPlan, requirements, 128, ['CBM4000', 'CBM4001', designatedCourse], 'Underlying major plan plus Bio3 research seminar, overseas research project and one designated cross-disciplinary course.')
  }

  item.streams = [
    build('BENG1_BME-1', 'BME', 'BEng Biomedical Engineering', 'BMS2002', 'year3', 'semB'),
    build('BSC1_BISI-1', 'BISI', 'BSc Biological Sciences', 'BME3101', 'year3', 'semB'),
    build('BSC1_BMS-1', 'BMS', 'BSc Biomedical Sciences', 'BME2105', 'year3', 'semA'),
  ]
  item.defaultStreamCode = 'BME'
  item.requireStreamSelection = true
  item.totalCredits = 128
  item.studyPlan = clone(item.streams[0].studyPlan)
  item.requirements = clone(item.streams[0].requirements)
  item.allCourses = [...new Set(item.streams.flatMap((candidate) => candidate.allCourses ?? []))]
  item.notes = [
    derivedPlanDisclosure,
    'Bio3 adds CBM4000 Research Seminar (1 CU across two consecutive semesters), CBM4001 Overseas Research Project (3 CU), and one 3-CU course from the official cross-disciplinary list to the selected underlying major.',
    'CBM4000 and CBM4001 are currently listed as not offering in the catalogue; keep them in the graduation plan and confirm the activated offering or approved replacement with the College of Biomedicine.',
  ]
}

function applyActPlans() {
  correctCoursePrerequisites('CS3505', [], 'Completed at least 25 credit units of CS courses and attained a CGPA of 2.0 or above in the semester before the internship.')
  cloneCourseAlias('DSC3001', 'SDSC3001', {
    title: 'Big Data: The Arts and Science of Scaling',
    prerequisites: ['CS3402'],
    prerequisitesRaw: 'CS3402',
  })
  cloneCourseAlias('DSC3025', 'SDSC3025', {
    title: 'Internship for Flagship Programme',
    prerequisites: [],
    prerequisitesRaw: 'The internship must be programme-related and requires prior programme approval.',
  })
  cloneCourseAlias('DSC3026', 'SDSC3026', {
    title: 'International Professional Development',
    prerequisites: [],
    prerequisitesRaw: 'For students who have completed Year 3; placement and pre-attachment training require prior approval.',
  })
  cloneCourseAlias('DSC4016', 'SDSC4016', {
    title: 'Fundamentals of Machine Learning II',
    prerequisites: ['DSC3006', 'SDSC3006'],
    prerequisitesRaw: 'DSC3006 Fundamentals of Machine Learning I',
  })

  const item = getMajor('CC_ACT-1')
  const buildCs = (baseCode, code, name) => {
    const base = getMajor(baseCode)
    const studyPlan = clone(base.studyPlan)
    replacePlanCourse(studyPlan, 'year4', 'semB', (course) => /^MAJOR-ELECTIVE|^CYBE-ELECTIVE/.test(course.code), 'year3', 'summer', 'DSC3026')
    addPlanCourse(studyPlan, 'year3', 'summer', generic('FLAGSHIP-OVERSEAS', 'ACT premium overseas exchange / internship experience', 0))
    const requirements = cloneRequirements(base)
    addRequirementCourse(requirements, 'majorCore', 'DSC3026', 3)
    const electives = requirements.majorElectives
    if (electives && typeof electives === 'object') {
      electives.credits = Math.max(0, (Number(electives.credits) || 0) - 3)
      if (typeof electives.chooseCredits === 'number') electives.chooseCredits = Math.max(0, electives.chooseCredits - 3)
    }
    return makeFlagshipStream(baseCode, code, name, studyPlan, requirements, base.totalCredits, ['DSC3026'], 'ACT stream based on the official underlying computing major plan, with DSC3026 and the existing CS3505 internship requirement.')
  }

  const dscBase = getMajor('BSC1_DSC-1')
  const dscPlan = clone(dscBase.studyPlan)
  replacePlanCourse(dscPlan, 'year3', 'semA', (course) => /^MAJOR-ELECTIVE/.test(course.code), 'year3', 'semA', 'DSC3001')
  replacePlanCourse(dscPlan, 'year4', 'semA', (course) => /^MAJOR-ELECTIVE/.test(course.code), 'year3', 'summer', 'DSC3025')
  replacePlanCourse(dscPlan, 'year4', 'semB', (course) => /^MAJOR-ELECTIVE/.test(course.code), 'year3', 'summer', 'DSC3026')
  replacePlanCourse(dscPlan, 'year4', 'semB', (course) => /^FREE-ELECTIVE/.test(course.code), 'year4', 'semB', generic('MAJOR-ELECTIVE-ACT', 'ACT Data Science Major Elective'))
  addPlanCourse(dscPlan, 'year3', 'summer', generic('FLAGSHIP-OVERSEAS', 'ACT premium overseas exchange / internship experience', 0))
  const dscRequirements = {
    gatewayEducation: requirementSection(31, ['GE1401', 'GE2401', 'GE1501', 'GE1601', generic('GE-DR', 'GE Distributional Requirements', 12), 'CS1315', 'SDSC2003', 'CS3402']),
    collegeRequirement: requirementSection(8, ['MA1503', 'MA1508']),
    majorCore: requirementSection(52, ['SDSC1001', 'MA2508', 'MA2510', 'SDSC2001', 'SDSC2002', 'SDSC2004', 'SDSC2005', 'SDSC2102', 'CS2334', 'CS3273', 'SDSC3006', 'SDSC3007', 'SDSC4116', 'DSC3001', 'DSC3025', 'DSC3026']),
    majorElectives: requirementSection(15, [generic('MAJOR-ELECTIVE', 'Data Science Major Elective')], { chooseCredits: 15, note: 'At least 12 CU should be at B4 level under the current catalogue.' }),
    freeElectives: requirementSection(15),
  }

  const dseBase = getMajor('BSC1_DSE1-1')
  const dsePlan = clone(dseBase.studyPlan)
  replacePlanCourse(dsePlan, 'year3', 'semB', (course) => /^MAJOR-ELECTIVE/.test(course.code), 'year3', 'summer', 'DSC3025')
  replacePlanCourse(dsePlan, 'year3', 'semB', (course) => /^MAJOR-ELECTIVE/.test(course.code), 'year3', 'summer', 'DSC3026')
  replacePlanCourse(dsePlan, 'year4', 'semA', (course) => /^MAJOR-ELECTIVE/.test(course.code), 'year4', 'semA', 'DSC4016')
  addPlanCourse(dsePlan, 'year3', 'summer', generic('FLAGSHIP-OVERSEAS', 'ACT premium overseas exchange / internship experience', 0))
  const dseRequirements = {
    gatewayEducation: requirementSection(31, ['GE1401', 'GE2410', 'GE1501', 'GE1601', generic('GE-DR', 'GE Distributional Requirements', 12), 'CS1315', 'SDSC2003', 'CS3402']),
    collegeRequirement: requirementSection(8, ['MA1503', 'MA1508']),
    majorCore: requirementSection(58, ['PHY1201', 'SDSC1001', 'GE2339', 'MA2508', 'MA2510', 'SDSC2001', 'SDSC2002', 'SDSC2004', 'SDSC2102', 'SDSC3002', 'SDSC3006', 'SDSC3008', 'SDSC3060', 'CS4480', 'SDSC4116', 'DSC3025', 'DSC3026', 'DSC4016']),
    majorElectives: requirementSection(15, [generic('MAJOR-ELECTIVE', 'Data and Systems Engineering Major Elective')], { chooseCredits: 15 }),
    freeElectives: requirementSection(9),
  }

  item.streams = [
    buildCs('BSC1_CSC1-1', 'CSC', 'BSc Computer Science'),
    buildCs('BSC1_CYBE-1', 'CYBE', 'BSc Cybersecurity'),
    makeFlagshipStream('BSC1_DSC-1', 'DSC', 'BSc Data Science', dscPlan, dscRequirements, 121, ['DSC3001', 'DSC3025', 'DSC3026'], 'Current ACT Data Science core overlay, including Big Data and two flagship placements.'),
    makeFlagshipStream('BSC1_DSE1-1', 'DSE', 'BSc Data and Systems Engineering', dsePlan, dseRequirements, 121, ['DSC3025', 'DSC3026', 'DSC4016'], 'Current ACT Data and Systems Engineering core overlay, including two flagship placements and Machine Learning II.'),
  ]
  item.defaultStreamCode = 'CSC'
  item.requireStreamSelection = true
  item.totalCredits = 122
  item.studyPlan = clone(item.streams[0].studyPlan)
  item.requirements = clone(item.streams[0].requirements)
  item.allCourses = [...new Set(item.streams.flatMap((candidate) => candidate.allCourses ?? []))]
  item.notes = [
    derivedPlanDisclosure,
    'ACT is not a generic copy of the base majors: CSC/CYBE add DSC3026 alongside CS3505; DSC adds DSC3001, DSC3025 and DSC3026; DSE adds DSC3025, DSC3026 and DSC4016.',
    'DSC3025 and DSC3026 are currently listed as not offering. They remain in the plan because they are explicit ACT stream requirements; confirm the activated placement term with the College of Computing.',
  ]
}

function applyPrimePlans() {
  const item = getMajor('CENG_PRIME-1')
  const eligible = [
    ['BENG1_ARCE-1', 'ARCE', 'Architectural Engineering'],
    ['BENG1_CEG-1', 'CEG', 'Civil Engineering'],
    ['BENG1_CDE-1', 'CDE', 'Computer and Data Engineering'],
    ['BENG1_ELEL-1', 'ELEL', 'Electronic and Electrical Engineering'],
    ['BENG1_INFE-1', 'INFE', 'Information Engineering'],
    ['BENG1_ITME-1', 'ITME', 'Intelligent Manufacturing Engineering'],
    ['BENG1_MASE-1', 'MASE', 'Materials Science and Engineering'],
    ['BENG1_M.E.-1', 'ME', 'Mechanical Engineering'],
    ['BENG1_NRE-1', 'NRE', 'Nuclear and Risk Engineering'],
  ]
  const needsEeGeOverlay = new Set(['CDE', 'ELEL', 'INFE'])

  item.streams = eligible.map(([baseCode, code, name]) => {
    const base = getMajor(baseCode)
    const studyPlan = clone(base.studyPlan)
    if (needsEeGeOverlay.has(code)) {
      addPlanCourse(studyPlan, 'year1', 'semA', 'GE1401')
      addPlanCourse(studyPlan, 'year1', 'semA', 'GE1601')
      addPlanCourse(studyPlan, 'year1', 'semB', 'GE2410')
      addPlanCourse(studyPlan, 'year2', 'semA', 'GE1501')
      addPlanCourse(studyPlan, 'year2', 'semB', generic('GE-DR1', 'GE Distributional Requirement'))
      addPlanCourse(studyPlan, 'year3', 'semA', generic('GE-DR2', 'GE Distributional Requirement'))
      addPlanCourse(studyPlan, 'year3', 'semB', generic('GE-DR3', 'GE Distributional Requirement'))
      addPlanCourse(studyPlan, 'year4', 'semA', generic('GE-DR4', 'GE Distributional Requirement'))
    }
    addPlanCourse(studyPlan, 'year2', 'summer', generic('FLAGSHIP-PRIME-RESEARCH', 'PRIME research attachment / faculty mentorship checkpoint', 0))
    addPlanCourse(studyPlan, 'year3', 'semB', generic('FLAGSHIP-PRIME-OVERSEAS', 'PRIME multinational / overseas engineering experience', 0))
    addPlanCourse(studyPlan, 'year3', 'summer', generic('FLAGSHIP-PRIME-ENTREPRENEURSHIP', 'PRIME innovation and entrepreneurship experience', 0))
    if (code === 'ITME') {
      movePlanCourse(studyPlan, 'year4', 'semA', (course) => course.code === 'SYE4036', 'year4', 'semB')
      movePlanCourse(studyPlan, 'year4', 'semB', (course) => course.code.startsWith('MAJOR-ELECTIVE'), 'year4', 'semA')
    }
    if (code === 'NRE') {
      movePlanCourse(studyPlan, 'year4', 'semA', (course) => course.code === 'MNE4231', 'year4', 'semB')
      movePlanCourse(studyPlan, 'year4', 'semB', (course) => course.code.startsWith('MAJOR-ELECTIVE'), 'year4', 'semA')
    }
    const candidate = makeFlagshipStream(baseCode, code, name, studyPlan, cloneRequirements(base), 121, [], `Official ${name} curriculum with the PRIME research, innovation and multinational-experience checkpoints overlaid.`)
    candidate.allCourses = candidate.allCourses.filter((rawCode) => {
      const codeToCheck = lookupCode(rawCode)
      const isGenericCode = /^(GE|FREE|MINOR|COL|SCHOOL|STREAM|MAJOR|FLAGSHIP)|-ELECT/i.test(rawCode)
      return isGenericCode || Boolean(courses[rawCode] || courses[codeToCheck])
    })
    return candidate
  })

  item.defaultStreamCode = 'ARCE'
  item.requireStreamSelection = true
  item.totalCredits = 121
  item.studyPlan = clone(item.streams[0].studyPlan)
  item.requirements = clone(item.streams[0].requirements)
  item.allCourses = [...new Set(item.streams.flatMap((candidate) => candidate.allCourses ?? []))]
  item.notes = [
    derivedPlanDisclosure,
    'The current PRIME admission page lists nine eligible engineering majors. Each stream inherits its underlying major schedule; PRIME research, innovation and multinational experiences are shown as zero-additional-credit checkpoints because the official page does not assign universal course codes or fixed semesters.',
    'CDE, ELEL and INFE inherit their official EE flowcharts. The 22 CU of university GE courses omitted from those compact flowcharts are added to reach the official 121-CU degree minimum.',
  ]
}

function applyCreateFlagshipPlans() {
  const item = getMajor('SCM_CREATE-1')
  const mappings = [
    ['BA1_CRM-1', 'BA_CRM', 'BA Creative Media'],
    ['BSC1_CRM1-1', 'BSC_CRM', 'BSc Creative Media'],
    ['BAS1_NEM-1', 'BAS_NEM', 'BAS New Media'],
  ]
  item.streams = mappings.map(([baseCode, code, name]) => {
    const base = getMajor(baseCode)
    const createStream = base.streams?.find((candidate) => candidate.code === 'CREATE')
    if (!createStream) throw new Error(`${baseCode} is missing its CREATE stream`)
    const studyPlan = clone(createStream.studyPlan)
    if (code === 'BAS_NEM') {
      replacePlanCourse(studyPlan, 'year2', 'semB', (course) => course.code === 'ART-SCIENCE-STUDIO1', 'year2', 'semB', 'SM3804')
      replacePlanCourse(studyPlan, 'year3', 'semA', (course) => course.code === 'ART-SCIENCE-STUDIO2', 'year3', 'semA', 'SM3805')
    }
    return makeFlagshipStream(
      baseCode,
      code,
      name,
      studyPlan,
      clone(createStream.requirements ?? base.requirements),
      124,
      [...(createStream.allCourses ?? []), 'SM2724A', 'SM2724B', 'SM2724C'],
      `${name} official sample plan with the three 1-CU CREATE leadership and creativity modules overlaid.`,
    )
  })
  item.defaultStreamCode = 'BA_CRM'
  item.requireStreamSelection = true
  item.totalCredits = 124
  item.studyPlan = clone(item.streams[0].studyPlan)
  item.requirements = clone(item.streams[0].requirements)
  item.allCourses = [...new Set(item.streams.flatMap((candidate) => candidate.allCourses ?? []))]
  item.notes = [
    derivedPlanDisclosure,
    'Each CREATE option inherits the corresponding official Creative Media / New Media sample plan and adds SM2724A, SM2724B and SM2724C (1 CU each). Students may use any three distinct approved SM2724 modules where the official curriculum permits substitution.',
    'SM2724A is placed in its currently confirmed Semester B; the later leadership modules are provisionally spread across Summer terms because their future offering terms are not yet activated in the current catalogue.',
    'The BAS New Media reference chooses SM3804 and SM3805 as replaceable Art and Science Studio examples before SM4712C, so the graduation-project prerequisite chain remains visible.',
  ]
}

function greatGateway(mathCourses) {
  return requirementSection(31, ['GE1401', 'GE2401', 'GE1501', 'GE1601', generic('GE-DR', 'GE Distributional Requirements', 12), ...mathCourses, 'CS1302'])
}

function greatCollegeRequirements() {
  return requirementSection(13, ['CSCI2002', 'CHEM1300', 'PHY1101', 'CHEM2004A', 'CHEM2008A'], {
    note: 'Research Methodology (1 CU), two approved Group I science courses, and two approved Group II science courses.',
  })
}

function applyGreatPlans() {
  correctCoursePrerequisites('CSCI4005', [], 'Students must have completed Year 3, obtain prior placement approval, and complete pre-attachment training.')
  correctCoursePrerequisites('MA2508', ['MA1201', 'MA1301', 'MA1503', 'MA1508', 'MA1401'], 'Grade B or above in MA1201 with MA approval; or MA1301; or both MA1503 and MA1508; programme-approved equivalent preparation applies.')
  correctCoursePrerequisites('MA2510', ['MA1201', 'MA1301', 'MA1503', 'MA1508', 'MA1401'], 'Grade B or above in MA1201 with MA approval; or MA1301; or both MA1503 and MA1508; programme-approved equivalent preparation applies.')
  upsertCourse('MA1400', 'Calculus I', 3, 'Department of Mathematics')
  Object.assign(courses.MA1400, {
    semester: 'Semester A 2026/27, Semester B 2026/27',
    prerequisites: [],
    prerequisitesRaw: '',
    assessment: { continuous: '30%', exam: '70%', examDuration: '3 hours', examPass: '30%' },
    detailStatus: 'parsed',
  })
  upsertCourse('MA1401', 'Calculus II', 3, 'Department of Mathematics')
  Object.assign(courses.MA1401, {
    semester: 'Semester B 2026/27',
    prerequisites: ['MA1400'],
    prerequisitesRaw: 'MA1400 Calculus I',
    assessment: { continuous: '30%', exam: '70%', examDuration: '3 hours', examPass: '30%' },
    detailStatus: 'parsed',
  })
  upsertCourse('MA1505', 'Linear Algebra I', 3, 'Department of Mathematics')
  Object.assign(courses.MA1505, {
    semester: 'Not offering in current academic year',
    prerequisites: ['MA1400'],
    prerequisitesRaw: 'MA1400 Calculus I',
    assessment: { continuous: '30%', exam: '70%', examDuration: '3 hours', examPass: '30%' },
    detailStatus: 'parsed',
  })
  upsertCourse('MA2505', 'Linear Algebra II', 3, 'Department of Mathematics')
  Object.assign(courses.MA2505, {
    semester: 'Not offering in current academic year',
    prerequisites: ['MA1505'],
    prerequisitesRaw: 'MA1505 Linear Algebra I',
    assessment: { continuous: '30%', exam: '70%', examDuration: '3 hours', examPass: '30%' },
    detailStatus: 'parsed',
  })

  const chemistryPlan = plan({
    year1: {
      semA: ['GE1401', 'GE1601', 'MA1200', 'CS1302', 'CHEM1300', 'PHY1101'],
      semB: ['GE2401', 'GE1501', 'MA1201', 'CSCI2002', 'CHEM2004A', 'CHEM2008A'],
    },
    year2: {
      semA: ['MA2172', 'MGT2324', generic('GE-DR1', 'GE Distributional Requirement'), generic('FREE1', 'Free Elective 1'), generic('FREE2', 'Free Elective 2')],
      semB: [generic('GE-DR2', 'GE Distributional Requirement'), generic('MAJOR-ELECT1', 'Chemistry GREAT Elective 1'), generic('MAJOR-ELECT2', 'Chemistry GREAT Elective 2'), generic('FREE3', 'Free Elective 3'), generic('FREE4', 'Free Elective 4')],
      summer: ['CSCI4002'],
    },
    year3: {
      semA: ['CHEM3015', 'CHEM3027', generic('GE-DR3', 'GE Distributional Requirement'), generic('FREE5', 'Free Elective 5')],
      semB: ['CHEM3014', 'CHEM3016', 'MGT4305', generic('GE-DR4', 'GE Distributional Requirement'), generic('FLAGSHIP-EXCHANGE', 'Compulsory GREAT overseas academic / research exchange', 0)],
      summer: ['CSCI4005'],
    },
    year4: {
      semA: ['CHEM4086', generic('MAJOR-ELECT3', 'Chemistry GREAT Elective 3'), generic('FREE6', 'Free Elective 6')],
      semB: ['CHEM4087', generic('MAJOR-ELECT4', 'Chemistry GREAT Elective 4')],
    },
  })
  const chemistryRequirements = {
    gatewayEducation: greatGateway(['MA1200', 'MA1201']),
    collegeRequirement: greatCollegeRequirements(),
    majorCore: requirementSection(41, ['CHEM3014', 'CHEM3015', 'CHEM3016', 'CHEM3027', 'CHEM4086', 'CHEM4087', 'MA2172', 'MGT2324', 'MGT4305']),
    majorElectives: requirementSection(18, ['CSCI4002', 'CSCI4005', generic('MAJOR-ELECTIVE', 'Chemistry GREAT Elective')], { chooseCredits: 18, note: 'Select from the official Chemistry major electives except CHEM4036.' }),
    freeElectives: requirementSection(18),
  }

  const mathematicsPlan = plan({
    year1: {
      semA: ['GE1401', 'GE1601', 'MA1400', 'CS1302', 'CHEM1300', 'PHY1101'],
      semB: ['GE2401', 'GE1501', 'MA1401', 'MA1505', 'CHEM2004A'],
    },
    year2: {
      semA: ['MA2505', 'MA2508', 'MA2510', 'CS2360', generic('GE-DR1', 'GE Distributional Requirement')],
      semB: ['CHEM2008A', 'MA3511', 'MA3515', 'CS2468', generic('GE-DR2', 'GE Distributional Requirement'), 'CSCI2002'],
    },
    year3: {
      semA: ['MA3512', 'MA3518', 'MA3525', 'MA3510', generic('GE-DR3', 'GE Distributional Requirement')],
      semB: ['MA3514', 'MA3517', generic('GE-DR4', 'GE Distributional Requirement'), generic('FREE1', 'Free Elective 1'), generic('FREE2', 'Free Elective 2'), generic('FLAGSHIP-EXCHANGE', 'Compulsory GREAT overseas academic / research exchange', 0)],
      summer: ['CSCI4002', 'CSCI4005'],
    },
    year4: {
      semA: ['MA4510', 'MGT2324', generic('FREE3', 'Free Elective 3'), generic('FREE4', 'Free Elective 4')],
      semB: [generic('FREE-BALANCE', 'Approved 4-CU free-elective combination', 4, 'Use approved unrestricted courses totalling 4 CU.')],
    },
  })
  const mathematicsRequirements = {
    gatewayEducation: greatGateway(['MA1400', 'MA1401']),
    collegeRequirement: greatCollegeRequirements(),
    majorCore: requirementSection(55, ['MA1505', 'MA2505', 'MA2508', 'MA2510', 'MA3511', 'MA3512', 'MA3514', 'MA3515', 'MA3517', 'MA3518', 'MA3525', 'CS2360', 'CS2468', 'MGT2324', 'MA3510', 'MA4510']),
    majorElectives: requirementSection(0),
    freeElectives: requirementSection(22, ['CSCI4002', 'CSCI4005'], { note: 'Includes the GREAT local placement and overseas internship; remaining credits are approved free electives.' }),
  }

  const physicsPlan = plan({
    year1: {
      semA: ['GE1401', 'GE1601', 'MA1200', 'CS1302', 'PHY1101', 'PHY1202'],
      semB: ['GE2401', 'GE1501', 'MA1201', 'CSCI2002', 'MA1501', 'CHEM2004A'],
    },
    year2: {
      semA: ['MA2158', 'MGT2324', 'PHY2212', generic('GE-DR1', 'GE Distributional Requirement'), generic('FREE1', 'Free Elective 1')],
      semB: ['PHY2191', 'PHY2213', 'PHY3204', generic('GE-DR2', 'GE Distributional Requirement'), generic('FREE2', 'Free Elective 2')],
    },
    year3: {
      semA: ['PHY3202', 'PHY3205', 'PHY3231', 'PHY3251', generic('GE-DR3', 'GE Distributional Requirement')],
      semB: ['PHY3115', 'PHY3272', 'PHY3290', generic('GE-DR4', 'GE Distributional Requirement'), generic('FREE3', 'Free Elective 3'), generic('FLAGSHIP-EXCHANGE', 'Compulsory GREAT overseas academic / research exchange', 0)],
      summer: ['CSCI4002', 'CSCI4005'],
    },
    year4: {
      semA: ['PHY4172', 'PHY4218', generic('FREE4', 'Free Elective 4'), generic('FREE5', 'Free Elective 5')],
      semB: ['PHY4219', generic('FREE-BALANCE', 'Approved 2-CU free-elective combination', 2, 'Use approved unrestricted courses totalling 2 CU.')],
    },
  })
  const physicsRequirements = {
    gatewayEducation: greatGateway(['MA1200', 'MA1201']),
    collegeRequirement: requirementSection(13, ['CSCI2002', 'PHY1101', 'PHY1202', 'MA1501', 'CHEM2004A']),
    majorCore: requirementSection(54, ['MA2158', 'MGT2324', 'PHY2191', 'PHY2212', 'PHY2213', 'PHY3115', 'PHY3202', 'PHY3204', 'PHY3205', 'PHY3231', 'PHY3251', 'PHY3272', 'PHY3290', 'PHY4172', 'PHY4218', 'PHY4219']),
    majorElectives: requirementSection(0),
    freeElectives: requirementSection(23, ['CSCI4002', 'CSCI4005'], { note: 'Includes the GREAT local placement and overseas internship; remaining credits are approved free electives.' }),
  }

  const item = getMajor('CSCI_GREAT-1')
  item.streams = [
    makeFlagshipStream('BSC1_CHEM-1', 'CHEM', 'BSc Chemistry', chemistryPlan, chemistryRequirements, 121, ['CHEM4086', 'CHEM4087', 'CSCI4002', 'CSCI4005'], 'Chemistry GREAT curriculum with two independent-research courses, entrepreneurship training, local placement and overseas internship.'),
    makeFlagshipStream('BSC1_CM-1', 'CM', 'BSc Computing Mathematics', mathematicsPlan, mathematicsRequirements, 121, ['MA3510', 'MA4510', 'CSCI4002', 'CSCI4005'], 'Computing Mathematics GREAT curriculum with Independent Research I/II, local placement and overseas internship.'),
    makeFlagshipStream('BSC1_PHY-1', 'PHY', 'BSc Physics', physicsPlan, physicsRequirements, 121, ['PHY4218', 'PHY4219', 'CSCI4002', 'CSCI4005'], 'Physics GREAT ordinary route with Independent Research I/II, local placement and overseas internship.'),
  ]
  item.defaultStreamCode = 'CHEM'
  item.requireStreamSelection = true
  item.totalCredits = 121
  item.studyPlan = clone(item.streams[0].studyPlan)
  item.requirements = clone(item.streams[0].requirements)
  item.allCourses = [...new Set(item.streams.flatMap((candidate) => candidate.allCourses ?? []))]
  item.notes = [
    derivedPlanDisclosure,
    'Every GREAT stream includes research methodology, discipline-specific independent research, at least one local summer placement, one overseas summer internship and an overseas academic/research exchange marker.',
    'MA1505 and MA2505 are required by the current Computing Mathematics GREAT curriculum but their course pages currently say not offering. The plan keeps them visible and asks students to confirm the activated term or approved replacement. Some mathematics course pages also retain legacy prerequisite codes; the conflict detector intentionally surfaces those for departmental confirmation.',
  ]
}

function applyDerivedReferencePlans() {
  applyManagementSchedule()
  applyBusinessDerivedPlans()
  applyClassDerivedPlans()
  applyInspirePlans()
  applyBio3Plans()
  applyActPlans()
  applyPrimePlans()
  applyCreateFlagshipPlans()
  applyGreatPlans()
}

function applySourceMetadata() {
  const manifestCodes = new Set(Object.keys(undergraduatePlanSources))
  const dataCodes = new Set(majors.map((item) => item.code))
  if (manifestCodes.size !== dataCodes.size || [...dataCodes].some((code) => !manifestCodes.has(code))) {
    throw new Error('The undergraduate source manifest must cover every programme exactly once.')
  }

  for (const item of majors) {
    const source = undergraduatePlanSources[item.code]
    const sourceUrl = source.sourceUrl ?? item.url
    item.studyPlanStatus = source.status
    item.studyPlanSourceTitle = source.sourceTitle
    item.studyPlanSourceUrl = sourceUrl
    item.requirementsSourceUrl = item.requirementsSourceUrl ?? item.url
    item.lastVerified = LAST_VERIFIED
    item.studyPlanRevision = ['BENG1_CDE-1', 'BENG1_ELEL-1', 'BENG1_INFE-1', 'BENG1_MEE-1'].includes(item.code)
      ? 'ee-2026-27-v2'
      : `ug-source-audit-${LAST_VERIFIED}`

    item.notes = (item.notes ?? []).filter((note) => !/study plan is derived|diy reference plan|arranged reference plan|No official semester-by-semester study plan was confirmed\. The semester grid is intentionally blank/i.test(note))
    if (source.status === 'diy') {
      const years = Math.max(4, Object.keys(item.studyPlan ?? {}).length)
      item.studyPlan = emptyStudyPlan(years)
      addNote(item, 'No official semester-by-semester study plan was confirmed. The semester grid is intentionally blank; use the complete graduation requirement and course pool to build a DIY plan.')
    }

    for (const candidate of item.streams ?? []) {
      const expected = source.streamCredits?.[candidate.code]
      const streamStatus = expected === 0 || source.status === 'diy' ? 'diy' : source.status
      candidate.studyPlanStatus = streamStatus
      candidate.studyPlanSourceTitle = candidate.studyPlanSourceTitle ?? source.sourceTitle
      candidate.studyPlanSourceUrl = candidate.studyPlanSourceUrl ?? sourceUrl
      candidate.requirementsSourceUrl = candidate.requirementsSourceUrl ?? item.requirementsSourceUrl
      candidate.lastVerified = LAST_VERIFIED
      candidate.studyPlanRevision = `ug-source-audit-${LAST_VERIFIED}`
      if (streamStatus === 'diy') {
        const years = Math.max(4, Object.keys(candidate.studyPlan ?? {}).length)
        candidate.studyPlan = emptyStudyPlan(years)
      }
      if ((candidate.allCourses ?? []).length === 0) {
        const requirementCodes = Object.values(candidate.requirements ?? {})
          .flatMap((section) => section && typeof section === 'object' && Array.isArray(section.courses) ? section.courses : [])
          .map((course) => lookupCode(course.code))
          .filter((code) => courses[code])
        candidate.allCourses = [...new Set([...(item.allCourses ?? []), ...requirementCodes])]
      }
    }

    addPlanCoursesToPool(item)
  }
}

function validateExpectedTotals() {
  const errors = []
  for (const item of majors) {
    const source = undergraduatePlanSources[item.code]
    const actual = totalPlanCredits(item.studyPlan)
    if (actual !== source.expectedPlanCredits) {
      errors.push(`${item.code}: main plan ${actual} CU, expected ${source.expectedPlanCredits}`)
    }
    for (const [streamCode, expected] of Object.entries(source.streamCredits ?? {})) {
      const candidate = item.streams?.find((stream) => stream.code === streamCode)
      if (!candidate) {
        errors.push(`${item.code}: missing stream ${streamCode}`)
        continue
      }
      const streamTotal = totalPlanCredits(candidate.studyPlan)
      if (streamTotal !== expected) errors.push(`${item.code}/${streamCode}: ${streamTotal} CU, expected ${expected}`)
    }
  }
  if (errors.length) throw new Error(`Undergraduate source audit failed:\n${errors.join('\n')}`)
}

applyBiomedicalPlans()
applyBusinessPlans()
applyEngineeringPlans()
applyLiberalArtsPlans()
applySocialSciencePlans()
applySciencePlans()
applyCreativeMediaPlans()
applySeePlans()
applyLawPlan()
applyDerivedReferencePlans()
applySourceMetadata()
validateExpectedTotals()

writeFileSync(majorsPath, `${JSON.stringify(majors, null, 2)}\n`)
writeFileSync(coursesPath, `${JSON.stringify(courses, null, 2)}\n`)
console.log(`Applied source-locked undergraduate plans and metadata for ${majors.length} programmes.`)
