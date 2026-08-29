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
    ['year1', 'semA'],
    ['year2', 'semA'],
    ['year3', 'semA'],
  ]
  const createCodes = ['SM2724A', 'SM2724B', 'SM2724C']
  placements.forEach(([year, term], index) => {
    result[year][term].courses.push(generic(createCodes[index], 'Leadership & Creativity (CREATE Stream)', 1, `CREATE registration ${index + 1} of 3; students may choose any three distinct SM2724A/B/C/D/E/F modules.`))
    result[year][term].credits += 1
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
    semA: ['CS3301', 'CS4386', 'SM2603', generic('MAJOR-ELECTIVE4', 'SCM Major Elective'), generic('MAJOR-ELECTIVE5', 'CS / SCM Major Elective')],
    semB: ['CS4182', 'CS4187', generic('MAJOR-ELECTIVE8', 'SCM Major Elective'), generic('MAJOR-ELECTIVE9', 'CS / SCM Major Elective'), generic('FREE2', 'Free Elective / Minor')],
  } }).year3
  const animation = clone(bscPlan)
  animation.year3 = plan({ year3: {
    semA: ['CS3301', 'SM3605', 'SM3701', generic('MAJOR-ELECTIVE4', 'CS Major Elective'), generic('MAJOR-ELECTIVE5', 'CS / SCM Major Elective')],
    semB: ['CS4182', 'SM4124', generic('MAJOR-ELECTIVE8', 'CS / SCM Major Elective'), generic('MAJOR-ELECTIVE9', 'CS / SCM Major Elective'), generic('FREE2', 'Free Elective / Minor')],
  } }).year3
  const interaction = clone(bscPlan)
  interaction.year3 = plan({ year3: {
    semA: ['CS3301', 'CS3483', { code: 'SM2233 / SM2260', title: 'Multimedia Production Project / Interactive Narrative', credits: 3 }, generic('MAJOR-ELECTIVE4', 'SCM Major Elective'), generic('MAJOR-ELECTIVE5', 'CS / SCM Major Elective')],
    semB: ['CS4187', { code: 'SM3610 / SM2716', title: 'Hardware Hacking / Physical Computing and Tangible Media', credits: 3 }, generic('MAJOR-ELECTIVE8', 'CS / SCM Major Elective'), generic('MAJOR-ELECTIVE9', 'CS / SCM Major Elective'), generic('FREE2', 'Free Elective / Minor')],
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
  const ese = getMajor('BENG1_ESE-1')
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

    item.notes = (item.notes ?? []).filter((note) => !/study plan is derived|diy reference plan|arranged reference plan/i.test(note))
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
applySourceMetadata()
validateExpectedTotals()

writeFileSync(majorsPath, `${JSON.stringify(majors, null, 2)}\n`)
writeFileSync(coursesPath, `${JSON.stringify(courses, null, 2)}\n`)
console.log(`Applied source-locked undergraduate plans and metadata for ${majors.length} programmes.`)
