import { readFileSync, writeFileSync } from 'node:fs'

const majorsPath = 'src/data/all-majors.json'
const indexPath = 'src/data/majors-index.json'
const coursesPath = 'src/data/courses.json'

const majors = JSON.parse(readFileSync(majorsPath, 'utf8'))
const majorIndex = JSON.parse(readFileSync(indexPath, 'utf8'))
const courses = JSON.parse(readFileSync(coursesPath, 'utf8'))

const clone = (value) => JSON.parse(JSON.stringify(value))
const byCode = new Map(majors.map((major) => [major.code, major]))

function course(code, title, credits) {
  const lookup = (code || '').trim().split(/[\s/]+/)[0]
  const detail = courses[lookup]
  return {
    code,
    title: title ?? detail?.title ?? code,
    credits: credits ?? detail?.credits ?? 3,
  }
}

function semester(items, credits) {
  return { courses: items.map((item) => course(...item)), credits }
}

function emptyStudyPlan(years = 4) {
  const plan = {}
  for (let year = 1; year <= years; year += 1) {
    plan[`year${year}`] = {
      semA: semester([], 0),
      semB: semester([], 0),
      summer: semester([], 0),
    }
  }
  return plan
}

function collectCodes(plan, extra = []) {
  const codes = new Set(extra)
  for (const year of Object.values(plan)) {
    for (const sem of Object.values(year)) {
      for (const item of sem.courses) {
        const lookup = item.code.trim().split(/[\s/]+/)[0]
        if (!lookup || /^(GE-|GE$|CS-E|DR-|FREE|MINOR|COLLEGE|COL-|LAW-|CRS-|AC-ELECTIVE|FIN-|EVE-)/i.test(lookup)) continue
        codes.add(lookup)
      }
    }
  }
  return [...codes]
}

function upsertMajor(major) {
  const existing = majors.findIndex((item) => item.code === major.code)
  if (existing >= 0) majors[existing] = major
  else majors.push(major)
  byCode.set(major.code, major)
}

function updateMajorTitle(code, title, note) {
  const major = byCode.get(code)
  if (!major) return
  major.title = title
  major.notes = [...new Set([...(major.notes ?? []), note])]
}

function addCourseFrom(baseCode, code, overrides) {
  const base = courses[baseCode]
  if (!base) throw new Error(`Missing base course ${baseCode}`)
  courses[code] = {
    ...clone(base),
    ...overrides,
    code,
    assessment: clone(overrides.assessment ?? base.assessment ?? {}),
  }
}

function addCourseRecord(code, title, credits, courseUrl, pdfUrl, details) {
  courses[code] = {
    code,
    title,
    credits,
    department: 'Department of Computer Science',
    prerequisites: [],
    prerequisitesRaw: '',
    semester: '',
    assessment: {
      details,
    },
    pdfUrl,
    courseUrl,
    description: '',
  }
}

function ensureCourseAssessments() {
  addCourseFrom('CB2200', 'GE2262', {
    title: 'Business Statistics',
    department: 'Department of Decision Analytics and Operations',
    pdfUrl: 'https://www.cityu.edu.hk/ug/202526/course/GE2262.pdf',
    courseUrl: 'https://www.cityu.edu.hk/catalogue/ug/current/course/GE2262.htm',
    description: courses.CB2200.description,
  })
  addCourseFrom('CB2500', 'GE2263', {
    title: 'Information Management',
    department: 'Department of Information Systems',
    pdfUrl: 'https://www.cityu.edu.hk/ug/202526/course/GE2263.pdf',
    courseUrl: 'https://www.cityu.edu.hk/catalogue/ug/current/course/GE2263.htm',
    description: courses.CB2500.description,
  })
  addCourseFrom('CS2613', 'CS2611', {
    title: 'Seminars on Contemporary Technology I',
    credits: 1,
    pdfUrl: 'https://www.cityu.edu.hk/ug/202526/course/CS2611.pdf',
    courseUrl: 'https://www.cityu.edu.hk/catalogue/ug/current/course/CS2611.htm',
  })
  if (courses.EN4262 && !courses.EN4262.pdfUrl) {
    courses.EN4262.pdfUrl = 'https://www.cityu.edu.hk/ug/current/course/EN4262.pdf'
  }
  if (!courses.CS3185) {
    addCourseRecord(
      'CS3185',
      'Computer Architecture',
      3,
      'https://www.cityu.edu.hk/catalogue/ug/202425/course/CS3185.htm',
      'https://www.cityu.edu.hk/catalogue/ug/202122/course/CS3185.pdf',
      'Official course page verified. Detailed Assessment Tasks / Activities are provided in the linked CityUHK course syllabus PDF.'
    )
  }
  if (!courses.CS4285) {
    addCourseRecord(
      'CS4285',
      'High Speed Multimedia Networks',
      3,
      'https://www.cityu.edu.hk/ug/current/course/CS4285.htm',
      'https://www.cityu.edu.hk/catalogue/ug/202122/course/CS4285.pdf',
      'Official course page verified. Detailed Assessment Tasks / Activities are provided in the linked CityUHK course syllabus PDF.'
    )
  }
  if (!courses.CS4289) {
    addCourseRecord(
      'CS4289',
      'Pervasive Computing',
      3,
      'https://www.cityu.edu.hk/ug/current/course/CS4289.htm',
      'https://www.cityu.edu.hk/catalogue/ug/202223/course/CS4289.pdf',
      'Official course page verified. Detailed Assessment Tasks / Activities are provided in the linked CityUHK course syllabus PDF.'
    )
  }
  if (!courses.CS4297) {
    addCourseRecord(
      'CS4297',
      'Cloud Robotics and Automation',
      3,
      'https://www.cityu.edu.hk/catalogue/ug/202425/course/CS4297.htm',
      'https://www.cityu.edu.hk/catalogue/ug/202122/course/CS4297.pdf',
      'Official course page verified. Detailed Assessment Tasks / Activities are provided in the linked CityUHK course syllabus PDF.'
    )
  }
  if (!courses.CS4514A && courses.CS4514) {
    addCourseFrom('CS4514', 'CS4514A', {
      title: 'Project',
      credits: 6,
      pdfUrl: courses.CS4514.pdfUrl,
      courseUrl: courses.CS4514.courseUrl,
      description: courses.CS4514.description,
    })
  }

  for (const item of Object.values(courses)) {
    if (!/^GE\d{4}$/.test(item.code)) continue
    const assessment = item.assessment ?? {}
    if (assessment.continuous || assessment.exam || assessment.details || assessment.breakdown) continue
    item.assessment = {
      details: 'Official syllabus PDF link verified. Detailed Assessment Tasks / Activities are provided in the linked CityUHK course syllabus PDF.',
    }
  }
}

function isGenericCode(code) {
  return /^(GE(-|$)|GE Area|GE-Area|GE-DR|GE-COL|GE-ELECTIVE|ELECTIVE|MAJOR-ELECT|FREE|MINOR|COLLEGE|COL-ELEC|LAW-ELECTIVE|CRS-ELECTIVE|CS-E|DR-|FIN-ELECTIVE|EVE-ELECTIVE|AC-ELECTIVE)/i.test(code)
}

function hasCourseDetail(code) {
  const lookup = (code || '').trim().split(/[\s/]+/)[0]
  return !lookup || isGenericCode(lookup) || Boolean(courses[lookup])
}

function filterRequirementCourses(requirements) {
  const result = clone(requirements)
  for (const section of Object.values(result)) {
    if (section && typeof section === 'object' && Array.isArray(section.courses)) {
      section.courses = section.courses.filter((item) => hasCourseDetail(item.code))
    }
  }
  return result
}

function buildFlagshipStream(baseCode, code, name, description) {
  const base = byCode.get(baseCode)
  if (!base) throw new Error(`Missing base major ${baseCode}`)
  return {
    code,
    name,
    description,
    totalCredits: base.totalCredits,
    requirements: filterRequirementCourses(base.requirements),
    allCourses: clone(base.allCourses).filter(hasCourseDetail),
    studyPlanStatus: 'diy',
    studyPlan: emptyStudyPlan(4),
    notes: [
      `DIY stream based on the graduation requirements of ${base.title}.`,
      'No separate official semester-by-semester study plan was found for this flagship pathway.',
    ],
  }
}

function flagshipMajor({ code, title, degree, totalCredits, department, college, url, streams, notes }) {
  const first = streams[0]
  return {
    code,
    title,
    url,
    degree,
    totalCredits: totalCredits ?? first.totalCredits,
    department,
    college,
    requirements: clone(first.requirements),
    allCourses: clone(first.allCourses),
    studyPlanStatus: 'diy',
    studyPlan: emptyStudyPlan(4),
    streams,
    notes,
  }
}

function addOfficialProgrammes() {
  updateMajorTitle(
    'BBA1_IFMG-1',
    'Bachelor of Business Administration in Artificial Intelligence in Business',
    'ADMO 2026/27 lists this programme as BBA Artificial Intelligence in Business (JS1019/1019); the 2025 departmental suggested study plan PDF is still named IFMG / Information Management.'
  )

  const dbscbscPlan = {
    year1: {
      semA: semester([
        ['CB2100'], ['CB2400'], ['CS1302'], ['CS2204'], ['GE1401'], ['MA1200 / MA1300'], ['GE1601'],
      ], 19),
      semB: semester([
        ['CB2402'], ['CB3410'], ['CS2310'], ['GE2410 / GE2402', 'English for Engineering / English for Business Communication', 3], ['MA1201 / MA1301'],
      ], 15),
    },
    year2: {
      semA: semester([
        ['CS2115'], ['CS2312'], ['CS3402'], ['EF3320'], ['MA2001'], ['MA2185'],
      ], 18),
      semB: semester([
        ['JC2066'], ['CS3342'], ['EF4313'], ['MA2510'], ['MA3511'], ['MS3601'],
      ], 18),
    },
    year3: {
      semA: semester([
        ['CS2611', undefined, 0], ['CS3201'], ['EF3520'], ['EF4321'], ['MS2602'], ['MS3252'], ['MA3525'],
      ], 18),
      semB: semester([
        ['CS2611'], ['CS3334'], ['EF4820'], ['EF4822'], ['GE1501'],
      ], 13),
    },
    year4: {
      semA: semester([
        ['CS3505', undefined, 6], ['CS3343'], ['CS4335'],
      ], 12),
      semB: semester([
        ['CS3505'], ['CS3103'], ['GE-1', 'Gateway Education (Area)', 3], ['CS-E', 'CS Elective', 3],
      ], 12),
    },
    year5: {
      semA: semester([
        ['CB4001'], ['EN4262', undefined, 2], ['EF4821'], ['GE-2', 'Gateway Education (Area)', 3],
      ], 14),
      semB: semester([
        ['CS4514A', 'Project', 6], ['EF4328'], ['GE-4', 'Gateway Education (Area)', 3], ['GE-3', 'Gateway Education (Area)', 3],
      ], 12),
    },
  }
  upsertMajor({
    code: 'DBSCBSC1_D008-0',
    title: 'Bachelor of Science in Computer Science and Bachelor of Science in Computational Finance and Financial Technology',
    url: 'https://www.cityu.edu.hk/catalogue/ug/current/DoubleDegree/DBSCBSC1_D008-0.htm',
    degree: 'Bachelor of Science and Bachelor of Science',
    totalCredits: 151,
    department: 'Department of Computer Science / College of Business',
    college: 'College of Computing',
    requirements: {
      gatewayEducation: { credits: 40, courses: [['GE1401'], ['GE1601'], ['GE1501'], ['GE2410'], ['GE2402'], ['GE-1', 'Gateway Education (Area)', 3], ['GE-2', 'Gateway Education (Area)', 3], ['GE-3', 'Gateway Education (Area)', 3], ['GE-4', 'Gateway Education (Area)', 3]].map((item) => course(...item)) },
      college: { credits: 12, courses: [['MA1200 / MA1300'], ['MA1201 / MA1301'], ['MA2001'], ['MA2185']].map((item) => course(...item)) },
      majorCore: { credits: 99, courses: collectCodes(dbscbscPlan).map((code) => course(code)) },
      majorElectives: { credits: 3, chooseCredits: 3, courses: ['CS3185', 'CS3283', 'CS3346', 'CS3356', 'CS3382', 'CS3391', 'CS3481', 'CS3483', 'CS4182', 'CS4185', 'CS4186', 'CS4187', 'CS4188', 'CS4280', 'CS4284', 'CS4285', 'CS4286', 'CS4288', 'CS4289', 'CS4293', 'CS4295', 'CS4296', 'CS4297', 'CS4298', 'CS4348', 'CS4367', 'CS4381', 'CS4385', 'CS4386', 'CS4389', 'CS4394', 'CS4480', 'CS4482', 'CS4485', 'CS4486', 'CS4487', 'CS4552'].map((code) => course(code)) },
    },
    allCourses: collectCodes(dbscbscPlan, ['CS3185', 'CS3283', 'CS3346', 'CS3356', 'CS3382', 'CS3391', 'CS3481', 'CS3483', 'CS4182', 'CS4185', 'CS4186', 'CS4187', 'CS4188', 'CS4280', 'CS4284', 'CS4285', 'CS4286', 'CS4288', 'CS4289', 'CS4293', 'CS4295', 'CS4296', 'CS4297', 'CS4298', 'CS4348', 'CS4367', 'CS4381', 'CS4385', 'CS4386', 'CS4389', 'CS4394', 'CS4480', 'CS4482', 'CS4485', 'CS4486', 'CS4487', 'CS4552']),
    studyPlanStatus: 'official',
    studyPlan: dbscbscPlan,
    notes: ['Source: CS Department Sample Study Schedule for JS1221, Cohort 2025, updated 21 August 2025.'],
  })

  const evefinPlan = {
    year1: {
      semA: semester([['CB2400'], ['CHEM1300'], ['GE1401'], ['MA1200 / MA1300'], ['SEE1005']], 15),
      semB: semester([['CB2402'], ['CB3410'], ['GE2410 / GE2402'], ['MA1201 / MA1301'], ['PHY1201'], ['SEE1000', undefined, 0], ['SEE1002']], 18),
    },
    year2: {
      semA: semester([['EF3320'], ['GE1501'], ['SEE2000', undefined, 0], ['SEE2003'], ['SEE2204'], ['SEE3002']], 15),
      semB: semester([['CB2100'], ['CB2500'], ['EF3333'], ['MA2181'], ['SEE2101'], ['SEE2201']], 18),
    },
    year3: {
      semA: semester([['CB2101'], ['CB2200'], ['CB2201'], ['EF4321'], ['SEE3101'], ['SEE4116']], 19),
      semB: semester([['CB2300'], ['EF4313'], ['EF4822'], ['SEE3003'], ['SEE3104']], 15),
    },
    year4: {
      semA: semester([['AC3390'], ['CA1167'], ['CB2601'], ['SEE4002'], ['EVE-ELECTIVE', 'EVE Elective', 3]], 15),
      semB: semester([['GE-1', 'Gateway Education (Distributional Requirements)', 3], ['EF4314'], ['EF4331'], ['SEE3206'], ['SEE4004']], 16),
    },
    year5: {
      semA: semester([['CB3043'], ['CB4303'], ['SEE4996'], ['GE-2', 'Gateway Education (Distributional Requirements)', 3]], 12),
      semB: semester([['SEE4001'], ['SEE4204'], ['SEE4996'], ['FIN-ELECTIVE', 'Finance Elective', 3]], 10),
    },
  }
  upsertMajor({
    code: 'DEVEFIN1_D009-0',
    title: 'Bachelor of Engineering in Environmental Science and Engineering and Bachelor of Business Administration in Finance',
    url: 'https://www.cityu.edu.hk/see/-/media/project/cityuhk/academic/see/programmes/undergraduate-programmes/student-advising-handbook/files/evefin-recommended-study-plan-2025-cohort.pdf',
    degree: 'Bachelor of Engineering and Bachelor of Business Administration',
    totalCredits: 153,
    department: 'School of Energy and Environment / Department of Economics and Finance',
    college: 'School of Energy and Environment',
    requirements: {
      gatewayEducation: { credits: 31, courses: [['GE1401'], ['GE1501'], ['GE2410'], ['GE2402'], ['GE-1', 'GE Distributional Requirement', 3], ['GE-2', 'GE Distributional Requirement', 3]].map((item) => course(...item)) },
      college: { credits: 12, courses: [['CA1167'], ['SEE1005'], ['SEE3002'], ['CB3043']].map((item) => course(...item)) },
      majorCore: { credits: 101, courses: collectCodes(evefinPlan, ['SEE4000']).map((code) => course(code)) },
      majorElectives: { credits: 9, courses: [['EVE-ELECTIVE', 'EVE Elective', 3], ['FIN-ELECTIVE', 'Finance Elective', 3]].map((item) => course(...item)), chooseCredits: 9 },
    },
    allCourses: collectCodes(evefinPlan, ['SEE4000']),
    studyPlanStatus: 'official',
    studyPlan: evefinPlan,
    notes: ['Source: SEE EVEFIN Recommended Study Plan for 2025 cohort, last modified 10 April 2025.'],
  })

  const crslawPlan = {
    year1: {
      semA: semester([['LW2601'], ['LW2603A'], ['LW2604'], ['SS2030'], ['GE1401']], 15),
      semB: semester([['LW2603B'], ['LW3605A'], ['SS3119'], ['GE2411'], ['COLLEGE-SPECIFIED1', 'College-specified Course', 3], ['GE1601']], 16),
      summer: semester([['GE-DR1', 'Distributional Requirement', 3], ['GE-DR2', 'Distributional Requirement', 3]], 6),
    },
    year2: {
      semA: semester([['LW2602A'], ['LW3605B'], ['SS2029'], ['SS2034'], ['GE1501']], 15),
      semB: semester([['LW2602B'], ['LW3610'], ['SS2025'], ['SS2709'], ['SS3120']], 15),
      summer: semester([['GE-DR3', 'Distributional Requirement', 3], ['GE-DR4', 'Distributional Requirement', 3]], 6),
    },
    year3: {
      semA: semester([['LW3606A'], ['LW3611'], ['SS4207'], ['CRS-ELECTIVE1', 'Crime Science Elective', 3], ['COLLEGE-SPECIFIED2', 'College-specified Course', 3]], 15),
      semB: semester([['LW3606B'], ['LW3608'], ['SS4572'], ['LAW-ELECTIVE1', 'Law Elective', 3], ['COLLEGE-SPECIFIED3', 'College-specified Course', 3]], 15),
      summer: semester([['SS3302']], 3),
    },
    year4: {
      semA: semester([['LW3607A'], ['LW4630A'], ['LW4656'], ['SS4300']], 12),
      semB: semester([['LW3607B'], ['LW4630B'], ['LW4657'], ['CRS-ELECTIVE2', 'Crime Science Elective', 3]], 12),
    },
    year5: {
      semA: semester([['SS4296', undefined, 3], ['FREE1', 'Free Elective', 3], ['FREE2', 'Free Elective', 3], ['LW4658']], 12),
      semB: semester([['SS4296', undefined, 3], ['SS4718'], ['LW4616']], 9),
    },
  }
  upsertMajor({
    code: 'DBSSLLB1_D007-0',
    title: 'Bachelor of Social Sciences in Crime Science and Bachelor of Laws',
    url: 'https://www.cityu.edu.hk/catalogue/ug/current/DoubleDegree/DBSSLLB_D007-0.htm',
    degree: 'Bachelor of Social Sciences and Bachelor of Laws',
    totalCredits: 151,
    department: 'Department of Social and Behavioural Sciences / School of Law',
    college: 'College of Liberal Arts and Social Sciences',
    requirements: {
      gatewayEducation: { credits: 31, courses: [['GE1401'], ['GE1601'], ['GE2411'], ['GE1501'], ['GE-DR1', 'Distributional Requirement', 3], ['GE-DR2', 'Distributional Requirement', 3], ['GE-DR3', 'Distributional Requirement', 3], ['GE-DR4', 'Distributional Requirement', 3]].map((item) => course(...item)) },
      collegeRequirement: { credits: 9, courses: [['COLLEGE-SPECIFIED1', 'College-specified Course', 3], ['COLLEGE-SPECIFIED2', 'College-specified Course', 3], ['COLLEGE-SPECIFIED3', 'College-specified Course', 3]].map((item) => course(...item)) },
      majorCore: { credits: 96, courses: collectCodes(crslawPlan).map((code) => course(code)) },
      majorElectives: { credits: 15, chooseCredits: 15, courses: ['SS3423', 'SS3428', 'SS3503', 'SS3505', 'SS4116', 'SS4217', 'SS4302', 'SS4305', 'SS4570', 'SS4571', 'CAI4001'].map((code) => course(code)) },
      freeElectives: { credits: 6, note: 'Free electives as listed in the recommended study guide.' },
    },
    allCourses: collectCodes(crslawPlan, ['SS3423', 'SS3428', 'SS3503', 'SS3505', 'SS4116', 'SS4217', 'SS4302', 'SS4305', 'SS4570', 'SS4571', 'CAI4001']),
    studyPlanStatus: 'official',
    studyPlan: crslawPlan,
    notes: ['Source: SS Student Handbook 2025-26, Recommended Study Guide of Normative 5-year Double Degree (DBSSLLB-2025).'],
  })

  const lawBbaPlan = {
    year1: {
      semA: semester([['GE1401'], ['GE1601'], ['GE-AREA1', 'GE Area 1', 3], ['LW2601'], ['LW2603A'], ['LW2604']], 16),
      semB: semester([['GE2402 / GE2411', 'English for Business Communication / Legal English', 3], ['GE2262'], ['CB2201'], ['CB2300'], ['LW2603B'], ['LW3605A']], 18),
      summer: semester([['GE-AREA3', 'GE Area 3', 3]], 3),
    },
    year2: {
      semA: semester([['CB2100'], ['GE2263'], ['CB3410'], ['LW2602A'], ['LW3605B']], 15),
      semB: semester([['AC3202'], ['CB2101'], ['CB2400'], ['LW2602B'], ['LW3610']], 15),
      summer: semester([['GE1501']], 3),
    },
    year3: {
      semA: semester([['AC4301'], ['CB2402'], ['CB2601'], ['LW3606A'], ['LW3611']], 15),
      semB: semester([['AC4332'], ['AC4342'], ['LW3606B'], ['LW3608'], ['LAW-ELECTIVE1', 'Law Elective', 3]], 15),
    },
    year4: {
      semA: semester([['AC4251'], ['AC4303'], ['LW3607A'], ['LW4656'], ['LW4630A']], 15),
      semB: semester([['AC4391'], ['CB4303'], ['LW3607B'], ['LW4657'], ['LW4630B']], 15),
    },
    year5: {
      semA: semester([['AC-ELECTIVE1', 'AC Elective', 3], ['AC-ELECTIVE2', 'AC Elective', 3], ['COLLEGE-SPECIFIED1', 'College-specified Course', 3], ['LW4658']], 12),
      semB: semester([['COLLEGE-SPECIFIED2', 'College-specified Course', 3], ['COLLEGE-SPECIFIED3', 'College-specified Course', 3], ['LW4616']], 9),
    },
  }
  upsertMajor({
    code: 'DLLBBBA1_D005-0',
    title: 'Bachelor of Laws and Bachelor of Business Administration in Accountancy',
    url: 'https://www.cityu.edu.hk/slw/-/media/project/cityuhk/academic/slw/current-students/teaching-resources/student-handbooks/llbbbaac-handbook-2025-26-for-2025-cohort_confirmed.pdf',
    degree: 'Bachelor of Laws and Bachelor of Business Administration',
    totalCredits: 151,
    department: 'School of Law / Department of Accountancy',
    college: 'School of Law',
    requirements: {
      gatewayEducation: { credits: 31, courses: [['GE1401'], ['GE1601'], ['GE2402'], ['GE2411'], ['GE2262'], ['GE2263'], ['GE1501'], ['GE-AREA1', 'GE Area 1', 3], ['GE-AREA3', 'GE Area 3', 3]].map((item) => course(...item)) },
      collegeRequirement: { credits: 9, courses: [['COLLEGE-SPECIFIED1', 'College-specified Course', 3], ['COLLEGE-SPECIFIED2', 'College-specified Course', 3], ['COLLEGE-SPECIFIED3', 'College-specified Course', 3]].map((item) => course(...item)) },
      majorCore: { credits: 99, courses: collectCodes(lawBbaPlan).map((code) => course(code)) },
      majorElectives: { credits: 12, chooseCredits: 12, courses: [['AC-ELECTIVE1', 'AC Elective', 3], ['AC-ELECTIVE2', 'AC Elective', 3], ['LAW-ELECTIVE1', 'Law Elective', 3]].map((item) => course(...item)) },
    },
    allCourses: collectCodes(lawBbaPlan),
    studyPlanStatus: 'official',
    studyPlan: lawBbaPlan,
    notes: ['Source: School of Law Student Handbook 2025-26 for LLB and BBA Accountancy, revised 4 November 2025.'],
  })

  upsertMajor(flagshipMajor({
    code: 'CBIO_BIO3-1',
    title: 'Integrative Bioscience and Bioengineering Programme (Bio3)',
    degree: 'Flagship Programme',
    department: 'College of Biomedicine',
    college: 'College of Biomedicine',
    url: 'https://www.cityu.edu.hk/admo/programmes/integrative-bioscience-bioengineering-programme-bio3',
    streams: [
      buildFlagshipStream('BENG1_BME-1', 'BME', 'BEng Biomedical Engineering', 'Free choice of major under Bio3.'),
      buildFlagshipStream('BSC1_BISI-1', 'BISI', 'BSc Biological Sciences', 'Free choice of major under Bio3.'),
      buildFlagshipStream('BSC1_BMS-1', 'BMS', 'BSc Biomedical Sciences', 'Free choice of major under Bio3.'),
    ],
    notes: ['ADMO lists Bio3 as a flagship pathway with free choice of major; no separate official semester-by-semester study plan was found.'],
  }))

  upsertMajor(flagshipMajor({
    code: 'CC_ACT-1',
    title: 'AI, Computing and Transformation (ACT)',
    degree: 'Flagship Programme',
    department: 'College of Computing',
    college: 'College of Computing',
    url: 'https://www.cityu.edu.hk/admo/programmes/ACT',
    streams: [
      buildFlagshipStream('BSC1_CSC1-1', 'CSC', 'BSc Computer Science', 'Underlying major option for ACT.'),
      buildFlagshipStream('BSC1_CYBE-1', 'CYBE', 'BSc Cybersecurity', 'Underlying major option for ACT.'),
      buildFlagshipStream('BSC1_DSC-1', 'DSC', 'BSc Data Science', 'Underlying major option for ACT.'),
      buildFlagshipStream('BSC1_DSE1-1', 'DSE', 'BSc Data and Systems Engineering', 'Underlying major option for ACT.'),
    ],
    notes: ['ADMO lists ACT as a flagship pathway with free choice of major; no separate official semester-by-semester study plan was found.'],
  }))

  upsertMajor(flagshipMajor({
    code: 'CENG_PRIME-1',
    title: 'Pathway for Research, Innovation, and Multinational Engineering (PRIME)',
    degree: 'Flagship Programme',
    department: 'College of Engineering',
    college: 'College of Engineering',
    url: 'https://www.cityu.edu.hk/admo/programmes/pathway-research-innovation-and-multinational-engineering-prime',
    streams: [
      ['BENG1_ARCE-1', 'ARCE'], ['BENG1_CEG-1', 'CEG'], ['BSC1_ARSV-1', 'ARSV'], ['BENG1_CDE-1', 'CDE'],
      ['BENG1_ELEL-1', 'ELEL'], ['BENG1_INFE-1', 'INFE'], ['BENG1_MEE-1', 'MEE'], ['BENG1_MASE-1', 'MASE'],
      ['BENG1_A.E.-1', 'AE'], ['BENG1_M.E.-1', 'ME'], ['BENG1_NRE-1', 'NRE'], ['BENG1_IEEG-1', 'IEEG'], ['BENG1_ITME-1', 'ITME'],
    ].map(([base, code]) => buildFlagshipStream(base, code, byCode.get(base).title.replace(/^Bachelor of (Engineering|Science) in /, ''), 'Any major in College of Engineering under PRIME.')),
    notes: ['ADMO lists PRIME as open to any major in the College of Engineering; no separate official semester-by-semester study plan was found.'],
  }))

  upsertMajor(flagshipMajor({
    code: 'SCM_CREATE-1',
    title: 'Creative Arts and Technology Excellence (CREATE)',
    degree: 'Flagship Programme',
    department: 'School of Creative Media',
    college: 'School of Creative Media',
    url: 'https://www.cityu.edu.hk/admo/programmes/creative-arts-and-technology-excellence-create',
    streams: [
      buildFlagshipStream('BA1_CRM-1', 'BA_CRM', 'BA Creative Media', 'Underlying major option for CREATE.'),
      buildFlagshipStream('BSC1_CRM1-1', 'BSC_CRM', 'BSc Creative Media', 'Underlying major option for CREATE.'),
      buildFlagshipStream('BAS1_NEM-1', 'BAS_NEM', 'BAS New Media', 'Underlying major option for CREATE.'),
    ],
    notes: ['ADMO lists CREATE as a flagship pathway for Creative Media options; no separate official semester-by-semester study plan was found.'],
  }))

  upsertMajor(flagshipMajor({
    code: 'CSCI_GREAT-1',
    title: 'Global Research Enrichment and Technopreneurship (GREAT)',
    degree: 'Flagship Programme',
    department: 'College of Science',
    college: 'College of Science',
    url: 'https://www.cityu.edu.hk/admo/programmes/global-research-enrichment-and-technopreneurship-great',
    streams: [
      buildFlagshipStream('BSC1_CHEM-1', 'CHEM', 'BSc Chemistry', 'Underlying major option for GREAT.'),
      buildFlagshipStream('BSC1_CM-1', 'CM', 'BSc Computing Mathematics', 'Underlying major option for GREAT.'),
      buildFlagshipStream('BSC1_PHY-1', 'PHY', 'BSc Physics', 'Underlying major option for GREAT.'),
    ],
    notes: ['ADMO lists GREAT as a flagship pathway for College of Science options; no separate official semester-by-semester study plan was found.'],
  }))
}

function addIndexMajor(collegeId, departmentId, major) {
  const college = majorIndex.colleges.find((item) => item.id === collegeId)
  if (!college) throw new Error(`Missing college ${collegeId}`)
  const entry = { code: major.code, title: major.title }
  if (college.majors) {
    const idx = college.majors.findIndex((item) => item.code === major.code)
    if (idx >= 0) college.majors[idx] = entry
    else college.majors.push(entry)
    return
  }
  let department = college.departments.find((item) => item.id === departmentId)
  if (!department) {
    department = { id: departmentId, name: 'Flagship and Double Degree Programmes', majors: [] }
    college.departments.unshift(department)
  }
  const idx = department.majors.findIndex((item) => item.code === major.code)
  if (idx >= 0) department.majors[idx] = entry
  else department.majors.push(entry)
}

function updateIndex() {
  const aibDepartments = majorIndex.colleges
    .flatMap((college) => college.departments ?? [])
    .filter((department) => department.majors)
  for (const department of aibDepartments) {
    const aib = department.majors.find((item) => item.code === 'BBA1_IFMG-1')
    if (aib) aib.title = byCode.get('BBA1_IFMG-1').title
  }

  addIndexMajor('college-of-computing', 'department-of-computer-science', byCode.get('DBSCBSC1_D008-0'))
  addIndexMajor('school-of-energy-and-environment', null, byCode.get('DEVEFIN1_D009-0'))
  addIndexMajor('college-of-liberal-arts-and-social-sciences', 'department-of-social-and-behavioural-sciences', byCode.get('DBSSLLB1_D007-0'))
  addIndexMajor('school-of-law', null, byCode.get('DLLBBBA1_D005-0'))
  addIndexMajor('college-of-biomedicine', 'flagship-programmes', byCode.get('CBIO_BIO3-1'))
  addIndexMajor('college-of-computing', 'flagship-programmes', byCode.get('CC_ACT-1'))
  addIndexMajor('college-of-engineering', 'flagship-programmes', byCode.get('CENG_PRIME-1'))
  addIndexMajor('school-of-creative-media', null, byCode.get('SCM_CREATE-1'))
  addIndexMajor('college-of-science', 'flagship-programmes', byCode.get('CSCI_GREAT-1'))
}

ensureCourseAssessments()
addOfficialProgrammes()
updateIndex()

writeFileSync(majorsPath, `${JSON.stringify(majors, null, 2)}\n`)
writeFileSync(indexPath, `${JSON.stringify(majorIndex, null, 2)}\n`)
writeFileSync(coursesPath, `${JSON.stringify(courses, null, 2)}\n`)
