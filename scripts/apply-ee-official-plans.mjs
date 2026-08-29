import { readFileSync, writeFileSync } from 'node:fs'

const majorsPath = new URL('../src/data/all-majors.json', import.meta.url)
const coursesPath = new URL('../src/data/courses.json', import.meta.url)

const majors = JSON.parse(readFileSync(majorsPath, 'utf8'))
const courses = JSON.parse(readFileSync(coursesPath, 'utf8'))

const REVISION = 'ee-2026-27-v2'
const LAST_VERIFIED = '2026-08-29'
const INTERNSHIP_CODES = ['EE4085', 'EE4086', 'EE4087']

const sources = {
  CDE: {
    title: 'Structure and Flowchart for BEng in Computer and Data Engineering (2026/27 Entering Major)',
    planUrl: 'https://www.ee.cityu.edu.hk/home/doc/programme/CDE_Major_flowchart_2026_Entering_Major.pdf',
    requirementsUrl: 'https://www.ee.cityu.edu.hk/en/current_students/undergraduate/major/admission_beng-cde_majorcurriculum',
  },
  ELEL: {
    title: 'Structure and Flowchart for BEng in Electronic and Electrical Engineering (2026/27 Entering Major)',
    planUrl: 'https://www.ee.cityu.edu.hk/home/docs/programme/2026-27_ELEL_EnteringMajor_6-Mar-2026.pdf',
    requirementsUrl: 'https://www.ee.cityu.edu.hk/en/current_students/undergraduate/major/admission_beng-elel_majorcurriculum',
  },
  INFE: {
    title: 'Programme Structure for BEng in Information Engineering (2026/27 Entering Major, v3)',
    planUrl: 'https://www.ee.cityu.edu.hk/home/docs/programme/INFE_Programme_Structure_2026-2027_v3.pdf',
    requirementsUrl: 'https://www.ee.cityu.edu.hk/en/current_students/undergraduate/major/admission_beng-infe_majorcurriculum',
  },
  MEE: {
    title: 'Structure and Flowchart for BEng in Microelectronics Engineering (2026/27 Entering Major)',
    planUrl: 'https://www.ee.cityu.edu.hk/home/doc/programme/MEE_Entering_Major_2026-27.pdf',
    requirementsUrl: 'https://www.ee.cityu.edu.hk/current_students/undergraduate/major/admission_beng-mee_majorcurriculum',
  },
}

function upsertSupplementaryCourses() {
  courses.PHY1202 = {
    ...courses.PHY1202,
    prerequisites: [],
    prerequisitesRaw: 'Pre-requisite: HKDSE Mathematics Compulsory Part or equivalent. Pre-cursor: HKDSE Physics, Combined Science with Physics, AP1200/PHY1200, or equivalent.',
    sourceUrl: 'https://www.cityu.edu.hk/catalogue/ug/current/course/PHY1202.htm',
  }

  courses.EE2303 = {
    ...courses.EE2303,
    code: 'EE2303',
    title: 'Applied AI Systems in Information Engineering: Lifecycle and Human-Centered Design',
    credits: 3,
    department: 'Department of Electrical Engineering',
    prerequisites: ['CS2311'],
    prerequisitesRaw: 'Pre-requisite: CS2311. Pre-cursors: EE1001 and EE1004 and (MA1201 or MA1301).',
    semester: 'Semester B 2026/27',
    assessment: {
      continuous: '70%',
      exam: '30%',
      examDuration: '2 hours',
      minCAPass: '30%',
      minExamPass: '30%',
      details: 'Official indicative assessment: continuous assessment 70% and examination 30%. Students must achieve at least 30% in both coursework and the examination.',
    },
    pdfUrl: 'https://www.cityu.edu.hk/ug/202627/course/EE2303.pdf',
    courseUrl: 'https://www.cityu.edu.hk/catalogue/ug/current/course/EE2303.htm',
    description: 'Explores the full lifecycle of AI system development in information engineering, including user requirements, business objectives, deployment, maintenance, ethics, and a collaborative real-world AI prototyping project.',
    catalogue: 'ug',
    detailStatus: 'parsed',
    sourceUrl: 'https://www.cityu.edu.hk/catalogue/ug/current/course/EE2303.htm',
  }

  const p5Courses = {
    EE5410: {
      title: 'Signal Processing',
      prerequisitesRaw: 'Pre-cursor: EE3008, EE3112, EE3210, or equivalent.',
      assessment: { continuous: '50%', exam: '50%', examDuration: '2 hours' },
      description: 'P5-level elective listed by the official undergraduate major curriculum. Students can only use either EE4015 or EE5410 to fulfil the applicable curriculum requirement.',
    },
    EE5438: {
      title: 'Applied Deep Learning',
      prerequisitesRaw: 'Pre-cursors: MA2001, MA3160 and EE3206. Exclusive course: EE4016.',
      assessment: { continuous: '70%', exam: '30%', examDuration: '1.5 hours' },
      description: 'P5-level elective listed by the official undergraduate major curriculum. Students can only use either EE4016 or EE5438 to fulfil the applicable curriculum requirement.',
    },
    EE5808: {
      title: 'Topics in Computer Graphics',
      prerequisitesRaw: 'Requires suitable mathematics and programming background. Exclusive course: EE4208.',
      assessment: { continuous: '50%', exam: '50%', examDuration: '2 hours' },
      description: 'P5-level elective listed by the official undergraduate major curriculum. Students can only use either EE4208 or EE5808 to fulfil the applicable curriculum requirement.',
    },
  }

  for (const [code, detail] of Object.entries(p5Courses)) {
    courses[code] = {
      ...courses[code],
      code,
      title: detail.title,
      credits: 3,
      department: 'Department of Electrical Engineering',
      prerequisites: [],
      prerequisitesRaw: detail.prerequisitesRaw,
      semester: courses[code]?.semester ?? '',
      assessment: detail.assessment,
      pdfUrl: `https://www.cityu.edu.hk/pg/202627/course/${code}.pdf`,
      courseUrl: `https://www.cityu.edu.hk/catalogue/pg/current/course/${code}.htm`,
      description: detail.description,
      catalogue: 'pg',
      detailStatus: 'linked-unparsed',
      sourceUrl: `https://www.cityu.edu.hk/catalogue/pg/current/course/${code}.htm`,
    }
  }

  courses.MSE4171 = {
    ...courses.MSE4171,
    code: 'MSE4171',
    title: 'Electronic Packaging and Materials',
    credits: 3,
    department: 'Department of Materials Science and Engineering',
    prerequisites: [],
    prerequisitesRaw: 'Pre-cursor: AP2102 or MSE2102. Equivalent course: AP4171.',
    semester: 'Not offering in current academic year',
    assessment: {
      continuous: '50%',
      exam: '50%',
      examDuration: '1.5 hours',
    },
    pdfUrl: 'https://www.cityu.edu.hk/ug/202526/course/MSE4171.pdf',
    courseUrl: 'https://www.cityu.edu.hk/catalogue/ug/current/course/MSE4171.htm',
    description: 'Introduces electronic packaging and the materials behaviour and reliability issues relevant to electronic packaging. It remains in the official MEE elective list but is marked as not currently offered in the course catalogue.',
    catalogue: 'ug',
    detailStatus: 'parsed',
    sourceUrl: 'https://www.cityu.edu.hk/catalogue/ug/current/course/MSE4171.htm',
  }
}

function course(code, overrides = {}) {
  const record = courses[code]
  if (!record && !overrides.title) throw new Error(`Missing course metadata for ${code}`)
  return {
    code,
    title: overrides.title ?? record?.title ?? code,
    credits: overrides.credits ?? record?.credits ?? 3,
    ...(overrides.remarks ? { remarks: overrides.remarks } : {}),
    ...(overrides.officialPlacement ? { officialPlacement: overrides.officialPlacement } : {}),
  }
}

function alternative(code, title) {
  return { code, title, credits: 3, remarks: 'Choose one of the two listed mathematics courses.' }
}

function generic(code, title, credits, remarks) {
  return { code, title, credits, ...(remarks ? { remarks } : {}) }
}

function electiveCourses(codes, remarks = {}) {
  return codes.map(code => course(code, remarks[code] ? { remarks: remarks[code] } : {}))
}

function planCourse(code, overrides = {}) {
  if (code.includes('-ELECTIVE')) {
    return generic(code, 'Technical Elective (choose from the official course pool)', 3, 'DIY choice from the official elective list.')
  }
  if (code === 'MA1200/MA1300') {
    return { ...alternative(code, 'Calculus and Basic Linear Algebra I / Enhanced Calculus and Linear Algebra I'), ...overrides }
  }
  if (code === 'MA1201/MA1301') {
    return { ...alternative(code, 'Calculus and Basic Linear Algebra II / Enhanced Calculus and Linear Algebra II'), ...overrides }
  }
  return course(code, overrides)
}

function semester(items) {
  const coursesForSemester = items.map(item => typeof item === 'string' ? planCourse(item) : planCourse(item.code, item))
  return {
    courses: coursesForSemester,
    credits: coursesForSemester.reduce((total, item) => total + (Number(item.credits) || 0), 0),
  }
}

const flexibleFirstYear = new Set(['EE1001', 'EE1002', 'EE1004', 'GE1354'])

function firstYear(physicsCode) {
  const flexible = code => ({
    code,
    officialPlacement: flexibleFirstYear.has(code) ? 'Year 1 Semester A or B' : undefined,
  })
  return {
    semA: semester(['MA1200/MA1300', flexible('EE1001'), 'CS1302', flexible('GE1354')]),
    semB: semester(['MA1201/MA1301', physicsCode, flexible('EE1004'), flexible('EE1002')]),
  }
}

function finalYear(prefix, electiveCount, firstElectiveNumber = 1) {
  const slots = Array.from({ length: electiveCount }, (_, index) => ({
    code: `${prefix}-ELECTIVE${index + firstElectiveNumber}`,
    officialPlacement: 'Year 4 Semester A or B',
  }))
  return {
    semA: semester([
      ...slots.slice(0, 2),
      { code: 'EE4080', credits: 3, officialPlacement: 'Year 4 Semesters A and B' },
      { code: 'EE2066', officialPlacement: 'Year 4 Semester A or B' },
    ]),
    semB: semester([
      { code: 'EE4080', credits: 3, officialPlacement: 'Year 4 Semesters A and B' },
      ...slots.slice(2),
    ]),
  }
}

const sharedGateway = [
  course('GE1401'),
  course('GE2410'),
  course('GE1501'),
]

function gatewayRequirements(includeWholePerson) {
  const required = [...sharedGateway]
  if (includeWholePerson) required.push(course('GE1601'))
  required.push(generic(
    'GE-DR',
    'Gateway Education Distributional Requirements',
    12,
    'Complete 12 CU and take at least one course from each of GE Areas 1, 2 and 3.',
  ))
  return {
    credits: includeWholePerson ? 22 : 21,
    courses: required,
  }
}

function collegeRequirements(physicsCode) {
  return {
    credits: 6,
    courses: [course('CS1302'), course(physicsCode)],
  }
}

function collegeSpecifiedRequirements() {
  return {
    credits: 9,
    courses: [
      alternative('MA1200/MA1300', 'MA1200 Calculus and Basic Linear Algebra I / MA1300 Enhanced Calculus and Linear Algebra I'),
      alternative('MA1201/MA1301', 'MA1201 Calculus and Basic Linear Algebra II / MA1301 Enhanced Calculus and Linear Algebra II'),
      course('EE2066', { remarks: 'EE4085 may fulfil EE2066 and EE4090 subject to the official internship rules.' }),
    ],
  }
}

const electiveRemarks = {
  CS3391: 'Mutually exclusive for curriculum fulfilment with CS4335.',
  CS4335: 'Mutually exclusive for curriculum fulfilment with CS3391.',
  CS4186: 'Mutually exclusive for curriculum fulfilment with EE4211.',
  EE4211: 'Mutually exclusive for curriculum fulfilment with CS4186.',
  EE4015: 'Mutually exclusive for curriculum fulfilment with EE5410.',
  EE5410: 'P5-level course; mutually exclusive for curriculum fulfilment with EE4015.',
  EE4016: 'Mutually exclusive for curriculum fulfilment with EE5438.',
  EE5438: 'P5-level course; mutually exclusive for curriculum fulfilment with EE4016.',
  EE4208: 'Mutually exclusive for curriculum fulfilment with EE5808.',
  EE5808: 'P5-level course; mutually exclusive for curriculum fulfilment with EE4208.',
}

const definitions = {
  'BENG1_CDE-1': {
    shortCode: 'CDE',
    totalCredits: 121,
    gatewayCredits: true,
    physicsCode: 'PHY1101',
    coreCodes: [
      'EE1001', 'EE1002', 'EE1004', 'GE1354', 'EE2000', 'EE2004', 'EE2005', 'EE2331',
      'EE3001', 'EE3009', 'EE3206', 'EE3210', 'EE3211', 'EE3220', 'EE3070', 'EE3315',
      'EE4080', 'EE4146', 'EE4090', 'CS2311', 'CS3103', 'CS3402', 'MA2001',
    ],
    coreCredits: 69,
    electiveCodes: [
      'CS3391', 'CS4335', 'CS4386', 'EE3209', 'EE3301', 'EE3331', 'EE4014', 'EE4015',
      'EE5410', 'EE4016', 'EE5438', 'EE4017', 'EE4208', 'EE5808', 'EE4211', 'CS4186',
      'EE4212', 'EE4213', 'EE4215', 'EE4216', 'EE4218', 'EE4221', 'EE4222', 'EE4304',
      'EE4316', 'SDSC3001',
    ],
    electiveCredits: 15,
    plan: {
      year1: firstYear('PHY1101'),
      year2: {
        semA: semester(['MA2001', 'EE3001', 'CS2311', 'EE2000']),
        semB: semester(['EE3211', 'EE2331', 'EE2004', 'EE2005']),
        summer: semester([]),
      },
      year3: {
        semA: semester(['EE3210', 'EE3206', 'CS3103', 'EE3009', { code: 'EE3070', officialPlacement: 'Year 3 Semester A or B' }]),
        semB: semester(['EE4146', 'CS3402', 'EE3220', 'EE3315']),
        summer: semester([{ code: 'EE4090', officialPlacement: 'Year 2 or 3 Summer' }]),
      },
      year4: finalYear('CDE', 5),
    },
    notes: [
      'This plan is transcribed from the official 2026/27 entering-major flowchart. The flowchart excludes the 22 CU University GE requirements, which remain visible in Requirements and the editable course pool.',
      'EE1001, EE1002, EE1004 and GE1354 may be completed in either Year 1 Semester A or B.',
      'EE4080 Project is a 6 CU year-long course represented as 3 CU in each Year 4 semester.',
      'EE4090 Engineering Training is a 0 CU Summer course recommended after Year 2 or Year 3.',
      'Complete 15 CU from the official elective pool; no more than two Level-3 electives may count.',
    ],
  },
  'BENG1_ELEL-1': {
    shortCode: 'ELEL',
    totalCredits: 121,
    gatewayCredits: true,
    physicsCode: 'PHY1101',
    coreCodes: [
      'EE1001', 'EE1002', 'EE1004', 'GE1354', 'EE2000', 'EE2004', 'EE2005', 'EE2104',
      'EE2108', 'EE3008', 'EE3070', 'EE3109', 'EE3114', 'EE3115', 'EE3121', 'EE3122',
      'EE3123', 'EE3124', 'EE3210', 'EE4080', 'EE4090', 'CS2311', 'MA2001',
    ],
    coreCredits: 69,
    electiveCodes: [
      'EE2331', 'EE2800', 'EE3009', 'EE3125', 'EE3206', 'EE3220', 'EE4015', 'EE4016',
      'EE4017', 'EE4035', 'EE4036', 'EE4045', 'EE4101', 'EE4105', 'EE4107', 'EE4108',
      'EE4115', 'EE4142', 'EE4146', 'EE4147', 'EE4148', 'EE4221', 'EE4316', 'EE5410', 'EE5438',
    ],
    electiveCredits: 15,
    plan: {
      year1: firstYear('PHY1101'),
      year2: {
        semA: semester(['MA2001', 'EE2108', 'EE2005', 'CS2311']),
        semB: semester(['EE3121', 'EE3210', 'EE2104', 'EE2000']),
        summer: semester([]),
      },
      year3: {
        semA: semester(['EE3114', 'EE3008', 'EE3123', 'EE2004']),
        semB: semester(['EE3109', 'EE3124', 'EE3115', 'EE3122', 'EE3070']),
        summer: semester([{ code: 'EE4090', officialPlacement: 'Year 2 or 3 Summer' }]),
      },
      year4: finalYear('ELEL', 5),
    },
    notes: [
      'This plan is transcribed from the official EE flowchart updated 6 March 2026. The flowchart excludes the 22 CU University GE requirements, which remain visible in Requirements and the editable course pool.',
      'EE1001, EE1002, EE1004 and GE1354 may be completed in either Year 1 Semester A or B.',
      'EE4080 Project is a 6 CU year-long course represented as 3 CU in each Year 4 semester.',
      'EE4090 Engineering Training is a 0 CU Summer course recommended after Year 2 or Year 3.',
      'Complete 15 CU from the official 2026/27 technical elective pool.',
    ],
  },
  'BENG1_INFE-1': {
    shortCode: 'INFE',
    totalCredits: 121,
    gatewayCredits: true,
    physicsCode: 'PHY1101',
    coreCodes: [
      'EE1001', 'EE1002', 'EE1004', 'GE1354', 'EE2000', 'EE2004', 'EE2302', 'EE2303',
      'EE2331', 'EE3008', 'EE3009', 'EE3206', 'EE3210', 'EE3301', 'EE3315', 'EE3331',
      'EE3070', 'EE4090', 'EE4080', 'CS2311', 'CS3103', 'CS3402', 'MA2001',
    ],
    coreCredits: 69,
    electiveCodes: [
      'EE4014', 'EE4017', 'EE4036', 'EE4212', 'EE4316', 'CS4186', 'CS4482', 'EE3209',
      'EE3220', 'EE4015', 'EE4016', 'EE4146', 'EE4211', 'EE4215', 'EE4221', 'EE4222',
      'EE5410', 'EE5438', 'CS3391', 'CS4386', 'EE4208', 'EE4213', 'EE4216', 'EE4304', 'EE5808',
    ],
    electiveCredits: 15,
    plan: {
      year1: firstYear('PHY1101'),
      year2: {
        semA: semester(['MA2001', 'EE2302', 'CS2311', 'EE2000']),
        semB: semester(['EE3331', 'EE3009', 'EE2303', 'EE2004']),
        summer: semester([]),
      },
      year3: {
        semA: semester(['EE3210', 'EE3301', 'CS3402', 'EE2331', { code: 'EE3070', officialPlacement: 'Year 3 Semester A or B' }]),
        semB: semester(['EE3008', 'EE3315', 'EE3206', 'CS3103']),
        summer: semester([{ code: 'EE4090', officialPlacement: 'Year 2 or 3 Summer' }]),
      },
      year4: finalYear('INFE', 5),
    },
    notes: [
      'This plan is transcribed from the official 2026/27 Programme Structure v3 updated 5 March 2026. The flowchart excludes the 22 CU University GE requirements, which remain visible in Requirements and the editable course pool.',
      'EE2303 replaces the obsolete EE2005 placement in the 2026/27 INFE structure and is offered in Semester B 2026/27.',
      'EE1001, EE1002, EE1004 and GE1354 may be completed in either Year 1 Semester A or B.',
      'EE4080 Project is a 6 CU year-long course represented as 3 CU in each Year 4 semester; EE4090 is a 0 CU Summer course after Year 2 or Year 3.',
      'Complete 15 CU from the official elective pool.',
    ],
  },
  'BENG1_MEE-1': {
    shortCode: 'MEE',
    totalCredits: 120,
    gatewayCredits: false,
    physicsCode: 'PHY1202',
    coreCodes: [
      'EE1001', 'EE1002', 'EE1004', 'GE1354', 'EE2000', 'EE2004', 'EE2005', 'EE2104',
      'EE2800', 'EE3008', 'EE3070', 'EE3115', 'EE3121', 'EE3122', 'EE3210', 'EE3220',
      'EE3800', 'EE3801', 'EE4080', 'EE4090', 'CS2311', 'MA2001',
    ],
    coreCredits: 66,
    electiveCodes: [
      'SYE4006', 'EE3009', 'EE3109', 'EE3114', 'EE3125', 'EE4015', 'EE5410', 'EE4035',
      'EE4036', 'EE4101', 'EE4105', 'EE4107', 'EE4108', 'EE4142', 'EE4146', 'EE4316',
      'EE4802', 'EE4803', 'EE4804', 'MSE4171',
    ],
    electiveCredits: 18,
    plan: {
      year1: firstYear('PHY1202'),
      year2: {
        semA: semester(['MA2001', 'EE2000', 'EE2005', 'CS2311']),
        semB: semester(['EE2800', 'EE3121', 'EE3210', 'EE2104']),
        summer: semester([]),
      },
      year3: {
        semA: semester(['EE3800', 'EE3008', 'EE3801', 'EE2004']),
        semB: semester(['MEE-ELECTIVE1', 'EE3115', 'EE3122', 'EE3220', 'EE3070']),
        summer: semester([{ code: 'EE4090', officialPlacement: 'Year 2 or 3 Summer' }]),
      },
      year4: finalYear('MEE', 5, 2),
    },
    notes: [
      'This plan follows the official 2026/27 MEE flowchart placement and the latest official curriculum requirements. The flowchart excludes the 21 CU University GE requirements, which remain visible in Requirements and the editable course pool.',
      'The MEE curriculum page updated 19 September 2025 lists PHY1202 as the College Requirement; it supersedes the PHY1101 label in the earlier 27 June 2025 flowchart. PHY1202 is therefore used in the same Year 1 Semester B slot.',
      'EE1001, EE1002, EE1004 and GE1354 may be completed in either Year 1 Semester A or B.',
      'EE4080 Project is a 6 CU year-long course represented as 3 CU in each Year 4 semester; EE4090 is a 0 CU Summer course after Year 2 or Year 3.',
      'Complete 18 CU from the official elective pool: one Year 3 slot and five final-year slots.',
    ],
  },
}

function unique(values) {
  return [...new Set(values)]
}

function assertCredits(definition) {
  const gateway = definition.gatewayCredits ? 22 : 21
  const total = gateway + 6 + 9 + definition.coreCredits + definition.electiveCredits
  if (total !== definition.totalCredits) {
    throw new Error(`${definition.shortCode} requirement credits add to ${total}, expected ${definition.totalCredits}`)
  }
}

function updateMajor(code, definition) {
  assertCredits(definition)
  const major = majors.find(item => item.code === code)
  if (!major) throw new Error(`Missing major ${code}`)

  const source = sources[definition.shortCode]
  const coreCourses = definition.coreCodes.map(code => course(code))
  const majorElectives = electiveCourses(definition.electiveCodes, electiveRemarks)
  const foundationCodes = [
    'GE1401', 'GE2410', 'GE1501',
    ...(definition.gatewayCredits ? ['GE1601'] : []),
    'MA1200', 'MA1300', 'MA1201', 'MA1301', 'CS1302', definition.physicsCode, 'EE2066',
  ]

  major.totalCredits = definition.totalCredits
  major.requirements = {
    gatewayEducation: gatewayRequirements(definition.gatewayCredits),
    college: collegeRequirements(definition.physicsCode),
    collegeRequirement: collegeSpecifiedRequirements(),
    majorCore: {
      credits: definition.coreCredits,
      courses: coreCourses,
    },
    majorElectives: {
      credits: definition.electiveCredits,
      courses: majorElectives,
      chooseCredits: definition.electiveCredits,
    },
  }
  major.studyPlan = definition.plan
  major.studyPlanStatus = 'structure'
  major.studyPlanSourceTitle = source.title
  major.studyPlanSourceUrl = source.planUrl
  major.requirementsSourceUrl = source.requirementsUrl
  major.lastVerified = LAST_VERIFIED
  major.studyPlanRevision = REVISION
  major.notes = definition.notes
  major.allCourses = unique([
    ...foundationCodes,
    ...definition.coreCodes,
    ...definition.electiveCodes,
    ...INTERNSHIP_CODES,
  ])
}

upsertSupplementaryCourses()
for (const [code, definition] of Object.entries(definitions)) updateMajor(code, definition)

writeFileSync(majorsPath, `${JSON.stringify(majors, null, 2)}\n`)
writeFileSync(coursesPath, `${JSON.stringify(courses, null, 2)}\n`)

console.log(`Applied official ${REVISION} data to ${Object.keys(definitions).length} EE undergraduate majors.`)
