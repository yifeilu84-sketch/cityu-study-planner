import { mkdirSync, writeFileSync } from 'node:fs'

const DATA_DIR = 'src/data'

const SOURCE = {
  officialSample: {
    kind: 'official-sample',
    label: 'Official sample schedule',
    description: 'CityUHK publishes a sample study schedule for this programme. Treat it as an official sample, not a compulsory path.',
  },
  requirementsDiy: {
    kind: 'requirements-diy',
    label: 'DIY from graduation requirements',
    description: 'No official semester-by-semester study plan has been confirmed. Use the official requirements and course pool to build your own plan.',
  },
  researchDiy: {
    kind: 'research-diy',
    label: 'Research DIY planner',
    description: 'Research degrees are not converted into a taught-course semester plan. Use the empty grid with research milestones and official research areas.',
  },
}

function slug(value) {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function programmeUrl(college, department, code) {
  return `https://www.cityu.edu.hk/pg/programme/program-list/2026/${slug(college)}/${slug(department)}/${code.toLowerCase()}`
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function emptySemester() {
  return { courses: [], credits: 0 }
}

function emptyStudyPlan(years) {
  const plan = {}
  for (let year = 1; year <= years; year += 1) {
    plan[`year${year}`] = {
      semA: emptySemester(),
      semB: emptySemester(),
      summer: emptySemester(),
    }
  }
  return plan
}

function semester(courseList) {
  return {
    courses: courseList,
    credits: courseList.reduce((sum, course) => sum + (course.credits ?? 0), 0),
  }
}

function studyPlanFromYears(years) {
  const plan = {}
  years.forEach((year, index) => {
    plan[`year${index + 1}`] = {
      semA: semester(year.semA ?? []),
      semB: semester(year.semB ?? []),
      summer: semester(year.summer ?? []),
    }
  })
  return plan
}

function courseUrl(code) {
  return `https://www.cityu.edu.hk/catalogue/pg/current/course/${code.toLowerCase()}.htm`
}

function makeCourse(code, title, credits = 3, options = {}) {
  return {
    code,
    title,
    credits,
    department: options.department ?? 'Department of Computer Science',
    prerequisites: options.prerequisites ?? [],
    prerequisitesRaw: options.prerequisitesRaw ?? '',
    semester: options.semester ?? '',
    assessment: options.assessment ?? {
      details: 'Official PG catalogue page linked; detailed assessment should be checked from the course page.',
    },
    pdfUrl: options.pdfUrl ?? '',
    courseUrl: options.courseUrl ?? courseUrl(code),
    description: options.description ?? '',
    catalogue: 'pg',
    detailStatus: options.detailStatus ?? 'linked-unparsed',
    sourceUrl: options.sourceUrl ?? courseUrl(code),
  }
}

const pgCourses = {
  CS5222: makeCourse('CS5222', 'Computer Networks and Internets', 3, {
    assessment: {
      continuous: '30%',
      exam: '70%',
      examDuration: '2 hours',
      details: 'Continuous Assessment: 30%; Examination: 70%.',
    },
    detailStatus: 'parsed',
  }),
  CS5351: makeCourse('CS5351', 'Software Engineering'),
  CS5481: makeCourse('CS5481', 'Data Engineering'),
  CS5491: makeCourse('CS5491', 'Artificial Intelligence'),
  CS6534: makeCourse('CS6534', 'Guided Study'),
  CS6520: makeCourse('CS6520', 'Project', 6),
  CS5188: makeCourse('CS5188', 'Virtual Reality Technologies and Applications'),
  CS5483: makeCourse('CS5483', 'Data Warehousing and Data Mining'),
  CS5489: makeCourse('CS5489', 'Machine Learning: Algorithms and Applications'),
  CS5285: makeCourse('CS5285', 'Information Security for eCommerce'),
  CS5294: makeCourse('CS5294', 'Information Security Technology Management'),
  CS5182: makeCourse('CS5182', 'Computer Graphics'),
  CS5187: makeCourse('CS5187', 'Vision and Image'),
  CS6290: makeCourse('CS6290', 'Privacy-enhancing Technologies'),
  CS6537: makeCourse('CS6537', 'Guided Study in Information Security'),
  CS5486: makeCourse('CS5486', 'Intelligent Systems'),
  CS5487: makeCourse('CS5487', 'Machine Learning: Principles and Practice'),
  CS6493: makeCourse('CS6493', 'Natural Language Processing'),
  CS6535: makeCourse('CS6535', 'Guided Study in Artificial Intelligence'),
  CS5286: makeCourse('CS5286', 'Algorithms and Techniques for Web Searching'),
  CS5296: makeCourse('CS5296', 'Cloud Computing: Theory and Practice'),
  CS6536: makeCourse('CS6536', 'Guided Study in Data Science'),
  CS5293: makeCourse('CS5293', 'Topics on Information Security'),
  CS5367: makeCourse('CS5367', 'Computer Games Design'),
  CS6187: makeCourse('CS6187', 'Vision and Language'),
  CS6382: makeCourse('CS6382', 'Selected Topics in Computer Science'),
  CS6487: makeCourse('CS6487', 'Topics in Machine Learning'),
  CS6521: makeCourse('CS6521', 'Thesis', 6),
  CS6538: makeCourse('CS6538', 'Guided Study in Computer Science'),
  CS5488: makeCourse('CS5488', 'Big Data Algorithms and Techniques'),
  CS5288: makeCourse('CS5288', 'Cryptography: Theory and Practice'),
  CS5185: makeCourse('CS5185', 'Multimedia Technologies and Applications'),
  CS5282: makeCourse('CS5282', 'Practical Optimization Algorithms and Techniques'),
  CS5348: makeCourse('CS5348', 'Software Quality Engineering'),
  CS6175: makeCourse('CS6175', 'Virtual Reality and Game-Engine Technologies'),
  CS6491: makeCourse('CS6491', 'Topics in Optimization and its Applications in Computer Science'),
  EC5001: makeCourse('EC5001', 'Introduction to eCommerce', 3, {
    department: 'Department of Information Systems',
    courseUrl: 'https://www.cityu.edu.hk/catalogue/pg/current/course/ec5001.htm',
    sourceUrl: 'https://www.cityu.edu.hk/catalogue/pg/current/course/ec5001.htm',
  }),
}

function ref(code, overrides = {}) {
  const course = pgCourses[code]
  return {
    code,
    title: overrides.title ?? course?.title ?? code,
    credits: overrides.credits ?? course?.credits ?? 0,
    remarks: overrides.remarks,
  }
}

const mscComputerScienceCodes = [
  'CS5222', 'CS5351', 'CS5481',
  'CS5487', 'CS6493', 'CS6535', 'CS5286', 'CS5296', 'CS5489', 'CS6536', 'CS5293', 'CS6290', 'CS6537',
  'CS5188', 'CS5367', 'CS6187', 'CS6382', 'CS6487', 'CS6520', 'CS6521', 'CS6534', 'CS6538',
  'CS5491', 'CS5187', 'CS5486', 'CS5483', 'CS5488', 'CS5285', 'CS5288', 'CS5294', 'CS5182', 'CS5185',
  'CS5282', 'CS5348', 'CS6175', 'CS6491', 'EC5001',
]

const mscComputerScienceRequirements = {
  summary: '30 credit units: 9 CU core courses plus at least 21 CU electives, including at least 3 CU from Group I electives.',
  sections: [
    {
      key: 'core',
      title: 'Core courses',
      credits: 9,
      courses: ['CS5222', 'CS5351', 'CS5481'].map((code) => ref(code)),
    },
    {
      key: 'group-i',
      title: 'Electives Group I',
      credits: 3,
      chooseCredits: 3,
      courses: [
        'CS5487', 'CS6493', 'CS6535', 'CS5286', 'CS5296', 'CS5489', 'CS6536', 'CS5293', 'CS6290',
        'CS6537', 'CS5188', 'CS5367', 'CS6187', 'CS6382', 'CS6487', 'CS6520', 'CS6521', 'CS6534', 'CS6538',
      ].map((code) => ref(code)),
      note: 'Students need at least 3 CU from Group I as part of the 21 CU elective requirement.',
    },
    {
      key: 'group-ii',
      title: 'Electives Group II',
      credits: 0,
      courses: [
        'CS5491', 'CS5187', 'CS5486', 'CS5483', 'CS5488', 'CS5285', 'CS5288', 'CS5294', 'CS5182',
        'CS5185', 'CS5282', 'CS5348', 'CS6175', 'CS6491', 'EC5001',
      ].map((code) => ref(code)),
    },
  ],
  notes: [
    'Official schedule page describes these as sample study schedules for illustration; each student should plan with academic advice.',
    'Project CS6520 is displayed across Semester B and Summer in the official sample schedule.',
  ],
}

const p53StudyPlanVariants = [
  {
    code: 'full-time-no-stream-project',
    title: 'Full-time sample: no stream with project',
    mode: 'Full-time',
    sourceStatus: clone(SOURCE.officialSample),
    studyPlan: studyPlanFromYears([
      {
        semA: ['CS5222', 'CS5351', 'CS5481', 'CS5491', 'CS6534'].map((code) => ref(code)),
        semB: [
          ref('CS6520', { credits: 3, remarks: 'Project, first part' }),
          ref('CS5188'),
          ref('CS5483'),
          ref('CS5489'),
        ],
        summer: [ref('CS6520', { credits: 3, title: 'Project (continued)', remarks: 'Project continued' })],
      },
    ]),
  },
  {
    code: 'full-time-is-stream',
    title: 'Full-time sample: Information Security stream',
    mode: 'Full-time',
    sourceStatus: clone(SOURCE.officialSample),
    studyPlan: studyPlanFromYears([
      {
        semA: ['CS5222', 'CS5351', 'CS5481', 'CS5285', 'CS5294'].map((code) => ref(code)),
        semB: ['CS5182', 'CS5187', 'CS5483', 'CS6290', 'CS6537'].map((code) => ref(code)),
      },
    ]),
  },
  {
    code: 'part-time-ai-stream',
    title: 'Part-time sample: Artificial Intelligence stream',
    mode: 'Part-time',
    sourceStatus: clone(SOURCE.officialSample),
    studyPlan: studyPlanFromYears([
      {
        semA: ['CS5222', 'CS5481', 'CS5491'].map((code) => ref(code)),
        semB: ['CS5182', 'CS5489'].map((code) => ref(code)),
      },
      {
        semA: ['CS5351', 'CS5486', 'CS5487'].map((code) => ref(code)),
        semB: ['CS5187', 'CS5188'].map((code) => ref(code)),
      },
    ]),
  },
]

function mscComputerScienceProgramme() {
  return {
    code: 'P53',
    title: 'MSc Computer Science',
    award: 'Master of Science',
    type: 'taught-master',
    college: 'College of Computing',
    department: 'Department of Computer Science',
    mode: 'Full-time / Part-time / Combined mode',
    totalCredits: 30,
    url: 'https://www.cityu.edu.hk/pg/programme/program-list/2026/college-of-computing/department-of-computer-science/p53',
    curriculumUrl: 'https://www.cs.cityu.edu.hk/en/academic-programmes/msc-computer-science/curriculum/overview',
    sampleScheduleUrl: 'https://www.cs.cityu.edu.hk/en/academic-programmes/msc-computer-science/curriculum/schedule',
    courseCatalogueUrl: 'https://www.cityu.edu.hk/catalogue/pg/current/programme/MSCS1.htm',
    sourceStatus: clone(SOURCE.officialSample),
    requirements: mscComputerScienceRequirements,
    allCourses: mscComputerScienceCodes,
    studyPlan: p53StudyPlanVariants[0].studyPlan,
    studyPlanVariants: p53StudyPlanVariants,
    notes: [
      'Official programme requirement: 30 CU total, including all 9 CU core courses and at least 21 CU electives.',
      'This page preserves the official sample schedules where available and labels them as samples.',
    ],
  }
}

function genericRequirements(totalCredits) {
  return {
    summary: totalCredits
      ? `${totalCredits} credit units or programme-specific graduation requirements listed on the official programme page.`
      : 'Programme-specific graduation requirements are listed on the official programme page.',
    sections: [
      {
        key: 'official-requirements',
        title: 'Official graduation requirements',
        credits: totalCredits ?? 0,
        courses: [],
        note: 'No official semester-by-semester study plan is confirmed in this dataset. Add required/core/elective courses from the official page into the empty DIY planner.',
      },
    ],
    notes: [
      'Not an official study plan. This is an empty DIY planning grid based on programme-level requirements.',
      'Course pool will be expanded when programme-specific curriculum tables or catalogue records are parsed.',
    ],
  }
}

function taught(info) {
  if (info.code === 'P53') return mscComputerScienceProgramme()
  const plan = emptyStudyPlan(info.years ?? 2)
  return {
    code: info.code,
    title: info.title,
    award: info.award ?? inferAward(info.title),
    type: 'taught-master',
    college: info.college,
    department: info.department,
    mode: info.mode ?? 'Full-time / Part-time where offered',
    totalCredits: info.totalCredits ?? null,
    url: info.url ?? programmeUrl(info.college, info.department, info.code),
    sourceStatus: clone(SOURCE.requirementsDiy),
    requirements: genericRequirements(info.totalCredits),
    allCourses: info.allCourses ?? [],
    studyPlan: plan,
    studyPlanVariants: [
      {
        code: 'diy-empty-plan',
        title: 'DIY empty semester grid',
        mode: info.mode ?? 'Student-planned',
        sourceStatus: clone(SOURCE.requirementsDiy),
        studyPlan: plan,
      },
    ],
    notes: [
      'No confirmed official sample schedule is stored for this programme.',
      'Use the official programme page to confirm current courses, streams, and credit requirements before planning.',
    ],
  }
}

function inferAward(title) {
  if (title.startsWith('MA ')) return 'Master of Arts'
  if (title.startsWith('MSc ')) return 'Master of Science'
  if (title.startsWith('MSocSc ')) return 'Master of Social Sciences'
  if (title.startsWith('MFA ')) return 'Master of Fine Arts'
  if (title.startsWith('Master of Laws')) return 'Master of Laws'
  if (title.startsWith('Juris Doctor')) return 'Juris Doctor'
  if (title.startsWith('Postgraduate Certificate')) return 'Postgraduate Certificate'
  if (title.startsWith('Executive Master')) return 'Executive Master'
  if (title.startsWith('Master of')) return title.replace(/\s*\(.+\)$/, '')
  return 'Taught Postgraduate Award'
}

const taughtSeeds = [
  ['P88', 'MSc Venture Creation', 'College of Business', 'College of Business'],
  ['P69', 'MSc Biomedical Engineering', 'College of Biomedicine', 'Department of Biomedical Engineering'],
  ['P95', 'MSc Health Sciences and Biomedicine', 'College of Biomedicine', 'Department of Biomedical Sciences'],
  ['P98', 'MSc Neuroscience', 'College of Biomedicine', 'Department of Neuroscience'],
  ['P01A', 'Executive Master of Business Administration (Taught in Chinese)', 'College of Business', 'College of Business'],
  ['P01B', 'Executive Master of Business Administration (Taught in Chinese)', 'College of Business', 'College of Business'],
  ['P11', 'Master of Business Administration', 'College of Business', 'College of Business'],
  ['P12', 'Executive Master of Business Administration', 'College of Business', 'College of Business'],
  ['P84', 'MSc Business and Data Analytics', 'College of Business', 'Department of Management Sciences'],
  ['P02', 'MA International Accounting', 'College of Business', 'Department of Accountancy'],
  ['P10', 'MSc Professional Accounting and Corporate Governance', 'College of Business', 'Department of Accountancy'],
  ['P83', 'MSc Accounting and Finance with AI and Fintech Applications', 'College of Business', 'Department of Accountancy'],
  ['P09', 'MSc Operations and Supply Chain Management', 'College of Business', 'Department of Management Sciences'],
  ['P04', 'MSc Finance', 'College of Business', 'Department of Economics and Finance'],
  ['P13', 'MSc Applied Economics', 'College of Business', 'Department of Economics and Finance'],
  ['P15', 'MSc Financial Engineering', 'College of Business', 'Department of Economics and Finance'],
  ['P05A', 'MSc Business Information Systems (Management of Intelligent Systems Stream)', 'College of Business', 'Department of Information Systems'],
  ['P05B', 'MSc Business Information Systems (Financial and Intelligent Technology Stream)', 'College of Business', 'Department of Information Systems'],
  ['P16', 'MSc Digital Transformation and Technological Innovation', 'College of Business', 'Department of Information Systems'],
  ['P17', 'MSc Electronic Commerce', 'College of Business', 'Department of Information Systems'],
  ['P85', 'MSc Artificial Intelligence in Business', 'College of Business', 'Department of Information Systems'],
  ['P07', 'MA Global Business Management', 'College of Business', 'Department of Management'],
  ['P19', 'MSc Management and Innovation', 'College of Business', 'Department of Management'],
  ['P18', 'MSc Marketing', 'College of Business', 'Department of Marketing'],
  ['P97', 'MSc Biostatistics', 'College of Computing', 'Department of Biostatistics'],
  ['P53', 'MSc Computer Science', 'College of Computing', 'Department of Computer Science'],
  ['P75', 'MSc Artificial Intelligence', 'College of Computing', 'Department of Computer Science'],
  ['P91', 'MSc Cybersecurity', 'College of Computing', 'Department of Computer Science'],
  ['P70', 'MSc Data Science', 'College of Computing', 'Department of Data Science'],
  ['P79', 'MSc Artificial Intelligence for Sciences', 'College of Computing', 'Department of Data Science'],
  ['P52', 'MSc Construction Management', 'College of Engineering', 'Department of Architecture and Civil Engineering'],
  ['P60', 'MSc Civil and Architectural Engineering', 'College of Engineering', 'Department of Architecture and Civil Engineering'],
  ['P64', 'Master of Urban Design and Regional Planning', 'College of Engineering', 'Department of Architecture and Civil Engineering'],
  ['P82', 'Master of Architecture', 'College of Engineering', 'Department of Architecture and Civil Engineering'],
  ['P54', 'MSc Electrical and Electronic Engineering', 'College of Engineering', 'Department of Electrical Engineering'],
  ['P59', 'MSc Computer and Information Engineering', 'College of Engineering', 'Department of Electrical Engineering'],
  ['P58', 'MSc Materials Engineering and Nanotechnology', 'College of Engineering', 'Department of Materials Science and Engineering'],
  ['P66', 'MSc Mechanical Engineering', 'College of Engineering', 'Department of Mechanical Engineering'],
  ['P56', 'MSc Engineering Management', 'College of Engineering', 'Department of Systems Engineering'],
  ['P86', 'MSc Intelligent Semiconductor Manufacturing', 'College of Engineering', 'Department of Systems Engineering'],
  ['P89', 'MSc AI-Driven Innovation', 'College of Engineering', 'Department of Systems Engineering'],
  ['P92', 'MSocSc Cross Sectoral Leadership (Taught in Chinese)', 'College of Liberal Arts and Social Sciences', 'College of Liberal Arts and Social Sciences'],
  ['P34', 'MA Chinese and History', 'College of Liberal Arts and Social Sciences', 'Department of Chinese and History'],
  ['P40', 'MA English Studies', 'College of Liberal Arts and Social Sciences', 'Department of English'],
  ['P30', 'MA Language Studies', 'College of Liberal Arts and Social Sciences', 'Department of Linguistics and Translation'],
  ['P25', 'MA Communication and New Media', 'College of Liberal Arts and Social Sciences', 'Department of Media and Communication'],
  ['P39', 'MA Integrated Marketing Communication', 'College of Liberal Arts and Social Sciences', 'Department of Media and Communication'],
  ['P27', 'MA Public Policy and Management', 'College of Liberal Arts and Social Sciences', 'Department of Public and International Affairs'],
  ['P37', 'MSocSc Sustainability and Development Studies', 'College of Liberal Arts and Social Sciences', 'Department of Public and International Affairs'],
  ['P38', 'MA International Studies', 'College of Liberal Arts and Social Sciences', 'Department of Public and International Affairs'],
  ['P78', 'MA Housing and Urban Management', 'College of Liberal Arts and Social Sciences', 'Department of Public and International Affairs'],
  ['P20', 'MSocSc Counselling', 'College of Liberal Arts and Social Sciences', 'Department of Social and Behavioural Sciences'],
  ['P71', 'Master of Social Work', 'College of Liberal Arts and Social Sciences', 'Department of Social and Behavioural Sciences'],
  ['P76', 'MSocSc Psychology', 'College of Liberal Arts and Social Sciences', 'Department of Social and Behavioural Sciences'],
  ['P77', 'MA Applied Social Sciences', 'College of Liberal Arts and Social Sciences', 'Department of Social and Behavioural Sciences'],
  ['P67', 'MSc Chemistry', 'College of Science', 'Department of Chemistry'],
  ['P68', 'MSc Financial Mathematics and Statistics', 'College of Science', 'Department of Mathematics'],
  ['P50', 'MSc Physics with Data Modelling and Quantum Technologies', 'College of Science', 'Department of Physics'],
  ['P96', 'Master of Public Health', 'Jockey Club College of Veterinary Medicine and Life Sciences', 'Department of Infectious Diseases and Public Health'],
  ['P99', 'Master of Veterinary Medicine', 'Jockey Club College of Veterinary Medicine and Life Sciences', 'Department of Veterinary Clinical Sciences'],
  ['P80', 'MFA Creative Media', 'School of Creative Media', 'School of Creative Media'],
  ['P81', 'MA Creative Media', 'School of Creative Media', 'School of Creative Media'],
  ['P63', 'MSc Energy and Environment', 'School of Energy and Environment', 'School of Energy and Environment'],
  ['P41', 'Master of Laws in Arbitration and Dispute Resolution', 'School of Law', 'School of Law'],
  ['P43', 'Juris Doctor', 'School of Law', 'School of Law'],
  ['P45', 'Postgraduate Certificate in Laws', 'School of Law', 'School of Law'],
  ['P46', 'Master of Laws', 'School of Law', 'School of Law'],
  ['P93', 'Postgraduate Certificate in Patent Law', 'School of Law', 'School of Law'],
]

function researchProgramme(seed) {
  const plan = emptyStudyPlan(4)
  return {
    code: seed.code,
    title: `${seed.award ?? 'MPhil / PhD'} in ${seed.discipline}`,
    award: seed.award ?? 'MPhil / PhD',
    type: 'research-degree',
    college: seed.college,
    department: seed.department,
    mode: 'Full-time / Part-time where offered',
    totalCredits: null,
    url: 'https://www.cityu.edu.hk/pg/research-degree-programmes/research-areas',
    sourceStatus: clone(SOURCE.researchDiy),
    requirements: {
      summary: 'Research postgraduate planning depends on supervisor, research area, approved courses where required, qualifying/progress review, thesis and oral examination.',
      sections: [
        {
          key: 'research-areas',
          title: 'Research areas',
          credits: 0,
          courses: [],
          note: seed.researchAreas.join('; '),
        },
        {
          key: 'milestones',
          title: 'Research milestones checklist',
          credits: 0,
          courses: [],
          note: 'Confirm supervisor fit, prepare proposal, follow department approved-course requirements if any, complete progress review, thesis and oral examination.',
        },
      ],
      notes: [
        'This is not a taught-course study plan.',
        'No fixed semester-by-semester courses are prefilled for research degrees.',
      ],
    },
    allCourses: [],
    researchAreas: seed.researchAreas,
    studyPlan: plan,
    studyPlanVariants: [
      {
        code: 'research-diy-empty-plan',
        title: 'Research DIY empty semester grid',
        mode: 'Research milestones',
        sourceStatus: clone(SOURCE.researchDiy),
        studyPlan: plan,
      },
    ],
    notes: [
      'Research areas are taken from the official research-area directory.',
      'Approved courses, if any, should be confirmed with the department and supervisor.',
    ],
  }
}

const researchSeeds = [
  { code: 'RPG_BMS', discipline: 'Biomedical Sciences', college: 'College of Biomedicine', department: 'Department of Biomedical Sciences', researchAreas: ['Cancer biology', 'Cell biology', 'Neuroscience and regenerative medicine'] },
  { code: 'RPG_BME', discipline: 'Biomedical Engineering', college: 'College of Biomedicine', department: 'Department of Biomedical Engineering', researchAreas: ['Biomedical imaging', 'Biomaterials', 'Neural engineering'] },
  { code: 'RPG_NS', discipline: 'Neuroscience', college: 'College of Biomedicine', department: 'Department of Neuroscience', researchAreas: ['Systems neuroscience', 'Cognitive neuroscience', 'Neurotechnology'] },
  { code: 'RPG_AC', discipline: 'Accountancy', college: 'College of Business', department: 'Department of Accountancy', researchAreas: ['Accounting analytics', 'Auditing', 'Corporate governance'] },
  { code: 'RPG_EF', discipline: 'Economics and Finance', college: 'College of Business', department: 'Department of Economics and Finance', researchAreas: ['Applied economics', 'Asset pricing', 'Financial econometrics'] },
  { code: 'RPG_IS', discipline: 'Information Systems', college: 'College of Business', department: 'Department of Information Systems', researchAreas: ['AI in business', 'FinTech', 'Digital innovation'] },
  { code: 'RPG_MGT', discipline: 'Management', college: 'College of Business', department: 'Department of Management', researchAreas: ['Organisational behaviour', 'Strategic management', 'Innovation management'] },
  { code: 'RPG_MKT', discipline: 'Marketing', college: 'College of Business', department: 'Department of Marketing', researchAreas: ['Consumer behaviour', 'Marketing analytics', 'Digital marketing'] },
  { code: 'RPG_MS', discipline: 'Management Sciences', college: 'College of Business', department: 'Department of Management Sciences', researchAreas: ['Operations management', 'Business analytics', 'Decision sciences'] },
  { code: 'RPG_CS', discipline: 'Computer Science', college: 'College of Computing', department: 'Department of Computer Science', researchAreas: ['Artificial intelligence', 'Data science', 'Cybersecurity', 'Software engineering', 'Computer vision'] },
  { code: 'RPG_DS', discipline: 'Data Science', college: 'College of Computing', department: 'Department of Data Science', researchAreas: ['Statistical learning', 'Big data analytics', 'AI for science'] },
  { code: 'RPG_ACE', discipline: 'Architecture and Civil Engineering', college: 'College of Engineering', department: 'Department of Architecture and Civil Engineering', researchAreas: ['Smart city', 'Construction management', 'Structural engineering'] },
  { code: 'RPG_EE', discipline: 'Electrical Engineering', college: 'College of Engineering', department: 'Department of Electrical Engineering', researchAreas: ['Communications', 'Microelectronics', 'Power electronics', 'Signal processing'] },
  { code: 'RPG_MNE', discipline: 'Mechanical Engineering', college: 'College of Engineering', department: 'Department of Mechanical Engineering', researchAreas: ['Robotics', 'Advanced manufacturing', 'Thermo-fluid sciences'] },
  { code: 'RPG_MSE', discipline: 'Materials Science and Engineering', college: 'College of Engineering', department: 'Department of Materials Science and Engineering', researchAreas: ['Nanomaterials', 'Functional materials', 'Energy materials'] },
  { code: 'RPG_SYE', discipline: 'Systems Engineering', college: 'College of Engineering', department: 'Department of Systems Engineering', researchAreas: ['Reliability engineering', 'Smart manufacturing', 'Operations research'] },
  { code: 'RPG_CAH', discipline: 'Chinese and History', college: 'College of Liberal Arts and Social Sciences', department: 'Department of Chinese and History', researchAreas: ['Chinese literature', 'History', 'Cultural studies'] },
  { code: 'RPG_COM', discipline: 'Media and Communication', college: 'College of Liberal Arts and Social Sciences', department: 'Department of Media and Communication', researchAreas: ['Journalism', 'New media', 'Strategic communication'] },
  { code: 'RPG_EN', discipline: 'English', college: 'College of Liberal Arts and Social Sciences', department: 'Department of English', researchAreas: ['Applied linguistics', 'Literary studies', 'Professional communication'] },
  { code: 'RPG_LT', discipline: 'Linguistics and Translation', college: 'College of Liberal Arts and Social Sciences', department: 'Department of Linguistics and Translation', researchAreas: ['Translation studies', 'Language technology', 'Linguistics'] },
  { code: 'RPG_PIA', discipline: 'Public and International Affairs', college: 'College of Liberal Arts and Social Sciences', department: 'Department of Public and International Affairs', researchAreas: ['Public policy', 'International relations', 'Urban governance'] },
  { code: 'RPG_SS', discipline: 'Social and Behavioural Sciences', college: 'College of Liberal Arts and Social Sciences', department: 'Department of Social and Behavioural Sciences', researchAreas: ['Psychology', 'Social work', 'Counselling'] },
  { code: 'RPG_CHEM', discipline: 'Chemistry', college: 'College of Science', department: 'Department of Chemistry', researchAreas: ['Chemical biology', 'Materials chemistry', 'Catalysis'] },
  { code: 'RPG_MATH', discipline: 'Mathematics', college: 'College of Science', department: 'Department of Mathematics', researchAreas: ['Applied mathematics', 'Statistics', 'Financial mathematics'] },
  { code: 'RPG_PHY', discipline: 'Physics', college: 'College of Science', department: 'Department of Physics', researchAreas: ['Quantum physics', 'Materials physics', 'Data modelling'] },
  { code: 'RPG_IDPH', discipline: 'Infectious Diseases and Public Health', college: 'Jockey Club College of Veterinary Medicine and Life Sciences', department: 'Department of Infectious Diseases and Public Health', researchAreas: ['Public health', 'One Health', 'Infectious disease modelling'] },
  { code: 'RPG_VCS', discipline: 'Veterinary Clinical Sciences', college: 'Jockey Club College of Veterinary Medicine and Life Sciences', department: 'Department of Veterinary Clinical Sciences', researchAreas: ['Veterinary medicine', 'Animal health', 'Clinical sciences'] },
  { code: 'RPG_SCM', discipline: 'Creative Media', college: 'School of Creative Media', department: 'School of Creative Media', researchAreas: ['Creative media art', 'Digital culture', 'Interactive media'] },
  { code: 'RPG_E2', discipline: 'Energy and Environment', college: 'School of Energy and Environment', department: 'School of Energy and Environment', researchAreas: ['Energy systems', 'Atmospheric environment', 'Sustainability'] },
  { code: 'RPG_LAW', discipline: 'Law', college: 'School of Law', department: 'School of Law', researchAreas: ['Chinese and comparative law', 'International law', 'Dispute resolution'] },
]

function professionalDoctorate(seed) {
  const plan = emptyStudyPlan(seed.years ?? 4)
  return {
    code: seed.code,
    title: seed.title,
    award: seed.award,
    type: 'professional-doctorate',
    college: seed.college,
    department: seed.department,
    mode: seed.mode ?? 'Part-time / Professional mode where offered',
    totalCredits: seed.totalCredits ?? null,
    url: seed.url,
    sourceStatus: clone(SOURCE.requirementsDiy),
    requirements: {
      summary: 'Professional doctorate requirements should be confirmed on the official programme page. No official semester-by-semester plan is prefilled here.',
      sections: [
        {
          key: 'coursework',
          title: 'Coursework / taught component',
          credits: 0,
          courses: [],
          note: 'Confirm current coursework modules, qualifying requirements and credit units on the official programme page.',
        },
        {
          key: 'professional-research',
          title: 'Professional research / thesis component',
          credits: 0,
          courses: [],
          note: 'Plan proposal, professional research project, thesis/dissertation and examination milestones with the programme office.',
        },
      ],
      notes: [
        'Not an official study plan. Students should DIY the semester grid after confirming requirements.',
      ],
    },
    allCourses: [],
    studyPlan: plan,
    studyPlanVariants: [
      {
        code: 'professional-doctorate-diy-empty-plan',
        title: 'Professional doctorate DIY empty semester grid',
        mode: seed.mode ?? 'Professional mode',
        sourceStatus: clone(SOURCE.requirementsDiy),
        studyPlan: plan,
      },
    ],
    notes: [
      'Professional doctorate programmes often combine coursework with a professional research component.',
      'No verified official sample schedule is stored for this programme.',
    ],
  }
}

const professionalSeeds = [
  {
    code: 'DBA',
    title: 'Doctor of Business Administration',
    award: 'Doctor of Business Administration',
    college: 'College of Business',
    department: 'College of Business',
    url: 'https://www.cityu.edu.hk/pg/programme/program-list/2026/college-of-business/college-of-business/dba',
    years: 4,
  },
  {
    code: 'DBAC',
    title: 'Doctor of Business Administration (Taught in Chinese)',
    award: 'Doctor of Business Administration',
    college: 'College of Business',
    department: 'College of Business',
    url: 'https://www.cityu.edu.hk/pg/programme/program-list/2026/college-of-business/college-of-business/dbac',
    years: 4,
  },
  {
    code: 'ENGDEM',
    title: 'Engineering Doctorate (Engineering Management)',
    award: 'Engineering Doctorate',
    college: 'College of Engineering',
    department: 'Department of Systems Engineering',
    url: 'https://www.cityu.edu.hk/pg/programme/program-list/2026/college-of-engineering/department-of-systems-engineering/engdem',
    years: 4,
  },
  {
    code: 'ENGDC',
    title: 'Engineering Doctorate (Engineering Management) (Taught in Chinese)',
    award: 'Engineering Doctorate',
    college: 'College of Engineering',
    department: 'Department of Systems Engineering',
    url: 'https://www.cityu.edu.hk/pg/programme/program-list/2026/college-of-engineering/department-of-systems-engineering/engdc',
    years: 4,
  },
]

const taughtProgrammes = taughtSeeds.map(([code, title, college, department]) => (
  taught({ code, title, college, department })
))

const researchProgrammes = researchSeeds.map(researchProgramme)
const professionalProgrammes = professionalSeeds.map(professionalDoctorate)

const programmes = [
  ...taughtProgrammes,
  ...researchProgrammes,
  ...professionalProgrammes,
].sort((a, b) => {
  const typeOrder = ['taught-master', 'research-degree', 'professional-doctorate']
  return typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type) || a.college.localeCompare(b.college) || a.code.localeCompare(b.code)
})

mkdirSync(DATA_DIR, { recursive: true })
writeFileSync(`${DATA_DIR}/postgraduate-programmes.json`, `${JSON.stringify(programmes, null, 2)}\n`)
writeFileSync(`${DATA_DIR}/pg-courses.json`, `${JSON.stringify(pgCourses, null, 2)}\n`)

console.log(`Wrote ${programmes.length} postgraduate programmes and ${Object.keys(pgCourses).length} PG courses.`)
