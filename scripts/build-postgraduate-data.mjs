import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'

const DATA_DIR = 'src/data'
const PG_COURSE_DETAILS_FILE = `${DATA_DIR}/pg-course-details.json`

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
    description: 'Research degrees are not converted into a fixed semester plan. Use the empty grid with the coursework pool, research milestones and official research areas.',
  },
}

const COURSE_LIST_STATUS = {
  official(sourceUrl) {
    return {
      kind: 'official-course-list',
      label: 'Official course list parsed',
      description: 'The required/elective course pool is parsed from an official CityUHK curriculum or programme page. The semester grid remains DIY unless an official sample schedule is available.',
      sourceUrl,
    }
  },
  officialTitles(sourceUrl) {
    return {
      kind: 'official-title-list',
      label: 'Official course/component titles parsed',
      description: 'The required/elective course titles or curriculum component titles are parsed from an official CityUHK curriculum or programme page. Some course codes and assessment details still need catalogue matching.',
      sourceUrl,
    }
  },
  unconfirmed: {
    kind: 'course-list-unconfirmed',
    label: 'Course list not yet structured',
    description: 'The official programme page is linked, but this site has not yet structured the required/elective course list for this programme.',
  },
  research(sourceUrl) {
    return {
      kind: 'official-course-list',
      label: 'Research coursework pool parsed',
      description: 'Research postgraduate degrees have coursework requirements. This pool combines SGS research coursework entries, department-approved research courses where published, and CityUHK PG catalogue courses from the same academic unit. The semester grid remains DIY because no fixed study schedule is published.',
      sourceUrl,
    }
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

function loadPgCourseDetails() {
  if (!existsSync(PG_COURSE_DETAILS_FILE)) return {}
  const parsed = JSON.parse(readFileSync(PG_COURSE_DETAILS_FILE, 'utf8'))
  return Object.fromEntries(
    Object.entries(parsed).filter(([code]) => !code.startsWith('_')),
  )
}

const pgCourseDetails = loadPgCourseDetails()

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
  SDSC5001: makeCourse('SDSC5001', 'Statistical Machine Learning I', 3, { department: 'Department of Data Science' }),
  SDSC5002: makeCourse('SDSC5002', 'Exploratory Data Analysis and Visualization', 3, { department: 'Department of Data Science' }),
  SDSC5003: makeCourse('SDSC5003', 'Storing and Retrieving Data', 3, { department: 'Department of Data Science' }),
  SDSC6001: makeCourse('SDSC6001', 'Statistical Machine Learning II', 3, { department: 'Department of Data Science' }),
  SDSC6002: makeCourse('SDSC6002', 'Research Projects for Data Science', 3, { department: 'Department of Data Science' }),
  SDSC6003: makeCourse('SDSC6003', 'Bayesian Data Analysis', 3, { department: 'Department of Data Science' }),
  SDSC6004: makeCourse('SDSC6004', 'Topics of Artificial Intelligence for Smart Cities', 3, { department: 'Department of Data Science' }),
  SDSC6006: makeCourse('SDSC6006', 'Dissertation', 6, { department: 'Department of Data Science' }),
  SDSC6007: makeCourse('SDSC6007', 'Dynamic Programming and Reinforcement Learning', 3, { department: 'Department of Data Science' }),
  CS5611: makeCourse('CS5611', 'Seminar on AI Ethics', 1),
  CS5493: makeCourse('CS5493', 'Topics in Autonomous Driving'),
  CS6522: makeCourse('CS6522', 'Project in Autonomous Driving', 6),
  CS6523: makeCourse('CS6523', 'Internship in Autonomous Driving', 6),
  CS5494: makeCourse('CS5494', 'Topics in Generative AI'),
  CS6524: makeCourse('CS6524', 'Project in Generative AI', 6),
  CS6525: makeCourse('CS6525', 'Internship in Generative AI', 6),
  CS5495: makeCourse('CS5495', 'Explainable AI'),
  CS5297: makeCourse('CS5297', 'Topics in AI Security'),
  CS6526: makeCourse('CS6526', 'Project in Trustworthy AI', 6),
  CS6527: makeCourse('CS6527', 'Internship in Trustworthy AI', 6),
  CS6528: makeCourse('CS6528', 'Internship in Artificial Intelligence', 6),
  CS6529: makeCourse('CS6529', 'Project in Artificial Intelligence', 6),
  CS5612: makeCourse('CS5612', 'Seminar on Contemporary Cybersecurity', 1),
  CS5291: makeCourse('CS5291', 'Cybersecurity Forensics and Incident Response'),
  CS5292: makeCourse('CS5292', 'Cybersecurity Audits and Compliance'),
  CS6283: makeCourse('CS6283', 'Advanced Topics in Mobile and IoT Security'),
  CS5295: makeCourse('CS5295', 'Network and Cloud Security'),
  CS6284: makeCourse('CS6284', 'Advanced Topics in Software Security'),
  CS5298: makeCourse('CS5298', 'Blockchain and Web3.0 Security'),
  CS6531: makeCourse('CS6531', 'Project in Cybersecurity', 6),
  CS6532: makeCourse('CS6532', 'Internship in Cybersecurity'),
  CS5281: makeCourse('CS5281', 'Internet Application Development'),
  IS5314: makeCourse('IS5314', 'eBusiness System Integration', 3, { department: 'Department of Information Systems' }),
  IS5414: makeCourse('IS5414', 'Analysis and Design of eCommerce Systems', 3, { department: 'Department of Information Systems' }),
  IS6321: makeCourse('IS6321', 'Business Intelligence Applications', 3, { department: 'Department of Information Systems' }),
  IS6400: makeCourse('IS6400', 'Business Data Analytics', 3, { department: 'Department of Information Systems' }),
  IS6640: makeCourse('IS6640', 'Information Systems Planning and Strategy', 3, { department: 'Department of Information Systems' }),
  SEE5114: makeCourse('SEE5114', 'Energy, Environment and Sustainable Development', 3, { department: 'School of Energy and Environment' }),
  SEE6201: makeCourse('SEE6201', 'Environmental and Energy Policy', 3, { department: 'School of Energy and Environment' }),
  SEE5211: makeCourse('SEE5211', 'Data Analysis in Environmental Applications', 3, { department: 'School of Energy and Environment' }),
  SEE5212: makeCourse('SEE5212', 'Environmental Pollution: Theories, Measurement and Mitigation', 3, { department: 'School of Energy and Environment' }),
  SEE6103: makeCourse('SEE6103', 'Energy Conversion: Theory and Methodology', 3, { department: 'School of Energy and Environment' }),
  SEE6104: makeCourse('SEE6104', 'Energy Conservation and Audit', 3, { department: 'School of Energy and Environment' }),
  SEE6118: makeCourse('SEE6118', 'Emerging Energy Technologies', 3, { department: 'School of Energy and Environment' }),
  SEE6123: makeCourse('SEE6123', 'Electrochemical Energy Storage', 3, { department: 'School of Energy and Environment' }),
  SEE6124: makeCourse('SEE6124', 'Fuel Processing', 3, { department: 'School of Energy and Environment' }),
  SEE6125: makeCourse('SEE6125', 'Carbon Capture Use and Storage', 3, { department: 'School of Energy and Environment' }),
  SEE5201: makeCourse('SEE5201', 'Air Pollution and Atmospheric Chemistry', 3, { department: 'School of Energy and Environment' }),
  SEE6203: makeCourse('SEE6203', 'Environmental Impact Assessment: Principles and Practice', 3, { department: 'School of Energy and Environment' }),
  SEE6212: makeCourse('SEE6212', 'Environmental Modelling', 3, { department: 'School of Energy and Environment' }),
  SEE6213: makeCourse('SEE6213', 'Wastewater Engineering and Water Quality Assessment', 3, { department: 'School of Energy and Environment' }),
  SEE6214: makeCourse('SEE6214', 'Solid Waste Treatment and Management', 3, { department: 'School of Energy and Environment' }),
  SEE6224: makeCourse('SEE6224', 'Environmental Engineering Science', 3, { department: 'School of Energy and Environment' }),
  SEE5202: makeCourse('SEE5202', 'Climate Change: Science, Adaptation and Mitigation', 3, { department: 'School of Energy and Environment' }),
  SEE6101: makeCourse('SEE6101', 'Energy Generation and Storage Systems', 3, { department: 'School of Energy and Environment' }),
  SEE6115: makeCourse('SEE6115', 'Carbon Audit and Management', 3, { department: 'School of Energy and Environment' }),
  SEE6122: makeCourse('SEE6122', 'Advanced Thermosciences for Energy Engineering', 3, { department: 'School of Energy and Environment' }),
  SEE6225: makeCourse('SEE6225', 'Environmental Assessment', 3, { department: 'School of Energy and Environment' }),
  SEE6999: makeCourse('SEE6999', 'Dissertation', 6, { department: 'School of Energy and Environment' }),
  LW6959: makeCourse('LW6959', 'Energy and Environmental Law', 6, { department: 'School of Law' }),
  AC5511: makeCourse('AC5511', 'Financial and Management Accounting', 3, { department: 'Department of Accountancy' }),
  AC6761: makeCourse('AC6761', 'Artificial Intelligence Accounting', 3, { department: 'Department of Accountancy' }),
  EF5042: makeCourse('EF5042', 'Corporate Finance', 3, { department: 'Department of Economics and Finance' }),
  EF5560: makeCourse('EF5560', 'Fintech and AI in Finance', 3, { department: 'Department of Economics and Finance' }),
  EE5437: makeCourse('EE5437', 'IoT Technologies for Future City Applications', 3, { department: 'Department of Electrical Engineering' }),
  IS5113: makeCourse('IS5113', 'AI Ethics and Regulations', 3, { department: 'Department of Information Systems' }),
  IS5238: makeCourse('IS5238', 'Business Practice Internship', 3, { department: 'Department of Information Systems' }),
  IS5311: makeCourse('IS5311', 'JAVA Programming for Business Applications', 3, { department: 'Department of Information Systems' }),
  IS5312: makeCourse('IS5312', 'Analytical Programming with Python', 3, { department: 'Department of Information Systems' }),
  IS5313: makeCourse('IS5313', 'Foundations of Information and Electronic Business Systems', 3, { department: 'Department of Information Systems' }),
  IS5411: makeCourse('IS5411', 'Systems Analysis and Design', 3, { department: 'Department of Information Systems' }),
  IS5413: makeCourse('IS5413', 'Database Management Systems', 3, { department: 'Department of Information Systems' }),
  IS5540: makeCourse('IS5540', 'Project Management and Quality Assurance', 3, { department: 'Department of Information Systems' }),
  IS5542: makeCourse('IS5542', 'Generative Artificial Intelligence for Business', 3, { department: 'Department of Information Systems' }),
  IS5740: makeCourse('IS5740', 'Management Support and Business Intelligence Systems', 3, { department: 'Department of Information Systems' }),
  IS5743: makeCourse('IS5743', 'Information Technology Based Business Transformation', 3, { department: 'Department of Information Systems' }),
  IS5940: makeCourse('IS5940', 'Innovation and Technology Entrepreneurship', 3, { department: 'Department of Information Systems' }),
  IS6000: makeCourse('IS6000', 'Research Methods for the IS Manager', 3, { department: 'Department of Information Systems' }),
  IS6200: makeCourse('IS6200', 'Blockchain Technology and Business Applications', 3, { department: 'Department of Information Systems' }),
  IS6335: makeCourse('IS6335', 'Data Visualization', 3, { department: 'Department of Information Systems' }),
  IS6400: makeCourse('IS6400', 'Business Data Analytics', 3, { department: 'Department of Information Systems' }),
  IS6421: makeCourse('IS6421', 'Human-Computer Interaction and Multimedia', 3, { department: 'Department of Information Systems' }),
  IS6423: makeCourse('IS6423', 'Artificial Intelligence for Business Applications', 3, { department: 'Department of Information Systems' }),
  IS6523: makeCourse('IS6523', 'Information Systems Infrastructure and Security Management', 3, { department: 'Department of Information Systems' }),
  IS6602: makeCourse('IS6602', 'Information Systems Consulting', 3, { department: 'Department of Information Systems' }),
  IS6608: makeCourse('IS6608', 'Digital Transformation and Technological Innovation in the Organisation', 3, { department: 'Department of Information Systems' }),
  IS6620: makeCourse('IS6620', 'Large Language Model with Prompt Engineering for Business', 3, { department: 'Department of Information Systems' }),
  IS6640: makeCourse('IS6640', 'Information Systems Planning and Strategy', 3, { department: 'Department of Information Systems' }),
  IS6912: makeCourse('IS6912', 'Information Systems Project', 6, { department: 'Department of Information Systems' }),
  IS6914: makeCourse('IS6914', 'Information Analytics Management Project', 3, { department: 'Department of Information Systems' }),
  IS6930: makeCourse('IS6930', 'Management Consulting in Asia', 3, { department: 'Department of Information Systems' }),
  IS6940C: makeCourse('IS6940C', 'Information Technology Leadership Forum', 3, { department: 'Department of Information Systems' }),
  IS6941: makeCourse('IS6941', 'Machine Learning & Social Media Analytics', 3, { department: 'Department of Information Systems' }),
  MGT6310: makeCourse('MGT6310', 'People Analytics', 3, { department: 'Department of Management' }),
  MKT6614: makeCourse('MKT6614', 'Advanced Marketing Analytics', 3, { department: 'Department of Marketing' }),
  MS5215: makeCourse('MS5215', 'AI-Enhanced Business Analytics with Excel and Python', 3, { department: 'Department of Management Sciences' }),
  MS5217: makeCourse('MS5217', 'Statistical Data Analysis', 3, { department: 'Department of Management Sciences' }),
  MS6219: makeCourse('MS6219', 'Predictive Modeling and Forecasting for Business', 3, { department: 'Department of Management Sciences' }),
  MS6711: makeCourse('MS6711', 'Data Mining', 3, { department: 'Department of Management Sciences' }),
}

function addPgCourses(entries, department) {
  for (const [code, title, credits = 3, courseDepartment = department] of entries) {
    if (!pgCourses[code]) {
      pgCourses[code] = makeCourse(code, title, credits, { department: courseDepartment })
    }
  }
}

addPgCourses([
  ['CA5018', 'Modelling and Computational Techniques for Built Environment'],
  ['CA5101', 'Production Management'],
  ['CA5104', 'Management Workshops'],
  ['CA5106', 'Project Management'],
  ['CA5108', 'Virtual Design and Construction'],
  ['CA5217', 'Environmental Economics, Planning and Policy'],
  ['CA5236', 'Transportation and Land Planning'],
  ['CA5244', 'Methods of Analysis in Civil Engineering and Engineering Mechanics'],
  ['CA5248', 'Indoor Environmental Quality'],
  ['CA5249', 'Energy Management for Building Sustainability'],
  ['CA5250', 'Renewable Energy for a Sustainable Building Performance'],
  ['CA5251', 'Sustainable Building Development'],
  ['CA5252', 'Building Environment Modelling for Sustainability Analysis'],
  ['CA5563', 'Advanced Digital Construction'],
  ['CA5564', 'Sensing and Data Analytics for Smart Buildings'],
  ['CA5601', 'Building Engineering Systems and Maintenance'],
  ['CA5603', 'Professional Research Methods'],
  ['CA5693', 'Geotechnical and Foundation Engineering'],
  ['CA6110', 'Statistical Methods and Data Analytics'],
  ['CA6120', 'Value Management for Construction'],
  ['CA6220', 'Urban Economics and Regional Planning'],
  ['CA6232', 'Contract Strategy and Administration'],
  ['CA6233', 'Contract and Dispute Management'],
  ['CA6241', 'Geographic Data Management and Planning Analysis'],
  ['CA6318', 'Planning Practice, Law, and Ethics in Hong Kong'],
  ['CA6535', 'Dissertation - Civil Engineering', 9],
  ['CA6536', 'Dissertation - Building Environment and Sustainability', 9],
  ['CA6537', 'Dissertation - Construction Project Management', 9],
  ['CA6538', 'Dissertation - Digital Construction Management', 9],
  ['CA6608', 'Modern Structural Engineering'],
  ['CA6694', 'Geomechanics'],
  ['PIA5003', 'Project Planning and Management for Development', 3, 'Department of Public and International Affairs'],
  ['PIA5711', 'Environmental Governance in China', 3, 'Department of Public and International Affairs'],
  ['PIA6502', 'Sustainable Development: Theory and Policy', 3, 'Department of Public and International Affairs'],
  ['SEE6102', 'Energy Efficiency and Conservation Technologies', 3, 'School of Energy and Environment'],
], 'Department of Architecture and Civil Engineering')

addPgCourses([
  ['MNE5101', 'Principles of Nuclear Engineering'],
  ['MNE5103', 'Risk and Reliability Engineering'],
  ['MNE5112', 'Mechanical Design with Advanced Material & Additive Manufacturing'],
  ['MNE6008', 'Dissertation', 9],
  ['MNE6110', 'Mechanical Behaviour of Materials: From Metallic to Biomedical/ Biological Materials'],
  ['MNE6113', 'Advanced Thermo-fluid'],
  ['MNE6115', 'Bio-inspired Robots'],
  ['MNE6116', 'Applied Engineering Mechanics'],
  ['MNE6119', 'Electron Microscopy'],
  ['MNE6124', 'Advanced Micro/Nano Robotics'],
  ['MNE6125', 'Engineering Methods'],
  ['MNE6127', 'Microfluidics: From Fundamentals to Applications'],
  ['MNE6129', 'Sustainable Engineering Practice'],
  ['MNE6130', 'Modern Robotics'],
  ['MNE6131', 'Nuclear Reactor Systems, Safety and Waste Management'],
  ['MNE6132', 'Materials in Nuclear Engineering'],
  ['MNE6133', 'Physical Effects of Radiation Damage'],
  ['MNE6134', 'Advanced Risk and Resilience Assessment'],
  ['MNE6135', 'Two-phase Flow and Boiling Heat Transfer'],
  ['MNE6138', 'Fundamentals of Nuclear Engineering'],
], 'Department of Mechanical Engineering')

addPgCourses([
  ['SS5110', 'Assessment and Interventions in Mental Health Counselling'],
  ['SS5111', 'Social Welfare Policy System and Reform'],
  ['SS5112', 'Social Welfare Management'],
  ['SS5114', 'Legal Issues for the Social Worker'],
  ['SS5115', 'Social Sciences Theories for Social Work', 0],
  ['SS5117', 'Social Work as a Profession'],
  ['SS5204', 'Penology & Rehabilitation of Offenders'],
  ['SS5208', 'Cognitive-behavioural Interventions'],
  ['SS5209', 'Social Work Theories and Practice I: Working with Individuals and Families'],
  ['SS5210', 'Social Work Theories and Practice II: Working with Groups'],
  ['SS5211', 'Social Work Theories and Practice III: Community Work and Macro-level Social Work Practice'],
  ['SS5212', 'Human Behaviour and Diversity'],
  ['SS5213', 'Social Work Research Methods'],
  ['SS5215', 'Diversity and Social Work'],
  ['SS5216', 'Contemporary Intervention Approaches'],
  ['SS5301', 'Advanced Theories in Criminology'],
  ['SS5302', 'Research Methods in Social Sciences'],
  ['SS5303', 'Criminal Justice in Hong Kong and the Pacific'],
  ['SS5304', 'Psychology and Crime'],
  ['SS5305', 'Policing Studies'],
  ['SS5316', 'Aggressive Behavior and Homicide'],
  ['SS5400', 'Applied Sociology'],
  ['SS5401', 'Social Science Perspectives'],
  ['SS5423', 'Programme Design & Evaluation'],
  ['SS5424', 'Crime, Law and Security'],
  ['SS5426', 'Social Problems'],
  ['SS5427', 'Special Topics in Applied Sociology'],
  ['SS5428', 'Applied Social Statistical Analysis'],
  ['SS5430', 'Case Management and Practice'],
  ['SS5750', 'Perception and Cognition'],
  ['SS5751', 'Learning and Behavior'],
  ['SS5752', 'Life Span Development'],
  ['SS5753', 'Advanced Social Psychology'],
  ['SS5755', 'Applying Psychology to Contemporary Issues'],
  ['SS5756', 'Biological Basis of Behavior'],
  ['SS5757', 'Personality Theories and Assessment'],
  ['SS5758', 'Educational Psychology'],
  ['SS5759', 'Educational Assessment and Evaluation'],
  ['SS5763', 'Special Topics in Psychology of Education'],
  ['SS5782', 'Psychopathology and Diagnosis of Mental Disorder'],
  ['SS5783', 'Psychological Research Design and Analysis'],
  ['SS5791', 'Advanced Health Psychology'],
  ['SS5794', 'Psychological Testing'],
  ['SS5798B', 'Dissertation', 6],
  ['SS5799', 'Capstone Project in Psychology'],
  ['SS5800', 'Counselling Theories and Practice'],
  ['SS5801', 'Counselling in Society and Across Culture'],
  ['SS5802', 'Group Counselling and Therapy'],
  ['SS5803', 'Psychopathology'],
  ['SS5805', 'Narrative-based Therapeutic Conversations: Theory and Practice'],
  ['SS5814', 'Vocational Counselling and Assessment'],
  ['SS5821', 'Counselling Children and Youth'],
  ['SS5822', 'Family-based Service and Family Practice'],
  ['SS5825', 'Marital Preparation, Enrichment and Therapy'],
  ['SS5832', 'Counselling Older Adults'],
  ['SS5836', 'Evidence-based Assessment Management of Mental Disorders'],
  ['SS5837', 'Community Mental Health: Theory and Practice'],
  ['SS5838', 'Mental Health Crisis Intervention and Resolution'],
  ['SS5839', 'Neurodiversity, Students with Special Educational and Emotional Needs'],
  ['SS5840', 'Dementia Care and Mental Health Counselling for Older People'],
  ['SS5841', 'Counselling Skills Laboratory and Ethics'],
  ['SS6219', 'Practicum Related Workshop I', 1],
  ['SS6220', 'Practicum Related Workshop II', 1],
  ['SS6221', 'Practicum Related Workshop III', 1],
  ['SS6291', 'Fieldwork I', 8],
  ['SS6292', 'Fieldwork II', 8],
  ['SS6293', 'Integrative Social Work Seminar'],
  ['SS6308', 'Master\'s Thesis in Criminology', 6],
  ['SS6404', 'Master\'s Integrative Project in Clinical Mental Health Practice'],
  ['SS6591', 'Integrative Project', 6],
  ['SS6805', 'Project', 6],
  ['SS6805B', 'Project', 6],
  ['SS6806', 'Counselling Practicum', 6],
], 'Department of Social and Behavioural Sciences')

addPgCourses([
  ['FB6873', 'Innovation Internship 1', 2],
  ['FB6874', 'Innovation Internship 2', 2],
  ['FB6875', 'Crypto Assets: Valuation, Accounting and Auditing', 2],
  ['FB6876', 'Family Business Innovation and Succession', 2],
  ['FB6877', 'Modern Project Management', 2],
  ['FB6878', 'Corporate Sustainability and ESG Strategies', 4],
  ['FB6801', 'Business Innovations: Asia Field Study 1', 4],
  ['FB6802', 'Business Innovations: Asia Field Study 2', 4],
  ['FB6803', 'Business Innovations: Global Field Study 1', 4],
  ['FB6804', 'Business Innovations: Global Field Study 2', 4],
  ['FB6812', 'EMBA Consulting Project', 4],
  ['FB6890', 'Management, Strategy and Leadership (including Student Orientation)', 4],
  ['FB6891', 'Strategic Issues on Fintech and Financial Services', 4],
  ['FB6892', 'Strategic Innovation Management', 4],
  ['FB6893', 'Innovations in Marketing', 4],
  ['FB6894', 'Digitalization and Technology Management', 4],
  ['FB6895', 'Venture Capital and Private Equity', 4],
  ['FB6896', 'Strategies on Initial Public Offering and Debt Financing', 4],
  ['FB6897', 'Strategies on Merger, Acquisitions and Turnaround', 4],
  ['FB6898', 'Modern Logistics and Supply Chain', 4],
  ['FB6931', 'Corporate Financial Strategy', 2],
  ['FB6932', 'Marketing Strategies for Business Impacts', 2],
  ['FB6933', 'Global Economic Environments and Business Strategies', 2],
  ['FB6934', 'Accounting, Strategy and Control', 2],
  ['FB6935', 'Applied Microeconomics for Business Leaders', 2],
  ['FB6936', 'IT Leadership for Executives', 2],
  ['FB6937', 'Business Models and Operational Strategies', 2],
  ['FB6938', 'Topics in Global and Asia Business', 2],
  ['FB6939', 'Topics in Sustainability', 2],
  ['FB6941', 'Topics in Marketing and Management', 2],
  ['FB6943', 'Topics in Business and Technology', 2],
  ['FB6944', 'Topics in Innovation and Entrepreneurship', 2],
  ['FB6945', 'Corporate Governance, Directorship and Business Ethics', 2],
  ['FB8001D', 'Methodology for Applied Business Research I', 3],
  ['FB8002D', 'Methodology for Applied Business Research II', 3],
  ['FB8004D', 'Residential Workshop I', 2],
], 'College of Business')

addPgCourses([
  ['LW6102E', 'Introduction to Common Law System and Methodology', 3],
  ['LW6113E', 'Law and Technology', 3],
  ['LW6115E', 'Selected Issues on Chinese IP Law', 3],
  ['LW6152E', 'Cyber Governance and Law', 3],
  ['LW6196E', 'International and Comparative Law of Trade Marks and Patents', 3],
  ['LW6199E', 'Commercialisation of Intellectual Property', 3],
  ['LW6208E', 'Patent Drafting and Litigation', 1.5],
  ['LW6209E', 'Patent Procedures', 1.5],
  ['LW6210E', 'International and Comparative Law of Patents', 1.5],
  ['LW6211E', 'Commercialisation of Patents', 1.5],
], 'School of Law')

addPgCourses([
  ['CHEM6114', 'Food Processing and Food Chemistry'],
  ['CHEM6118', 'Advanced Chemical Instrumentation'],
  ['CHEM6119', 'Frontiers in Chemical Biology'],
  ['CHEM6121', 'Academic and Industrial Research, Development and Innovation'],
  ['CHEM6123', 'Postgraduate Symposium', 1],
  ['CHEM6125', 'Selected Topics in Chemistry & Molecular Sciences'],
  ['CHEM6126', 'Advanced Seminar Series'],
  ['CHEM6127', 'Dissertation', 14],
  ['CHEM6128', 'Environmental Health and Risk Assessment'],
  ['CHEM6129', 'Advanced Directed Studies', 6],
  ['CHEM6130', 'Cosmetic Product Development and Formulation'],
  ['CHEM6131', 'Frontiers in Modern Synthetic Chemistry'],
  ['CHEM6132', 'Frontiers in Sustainable Energy Conversion and Storage'],
  ['CHEM6133', 'Advanced Entrepreneurship Programme in Chemistry'],
], 'Department of Chemistry')

addPgCourses([
  ['BIOS6901', 'Spatial Data Analysis', 3, 'Department of Biostatistics'],
  ['CAI5001', 'The Principles of Digital Health', 3, 'CityUHK Academy of Innovation'],
  ['CAI5002', 'Commercialization of Digital Health', 3, 'CityUHK Academy of Innovation'],
  ['CAI5003', 'Clinical Research Awareness & Data Learning Environment', 3, 'CityUHK Academy of Innovation'],
  ['MA5617', 'Statistical Data Analysis', 3, 'Department of Mathematics'],
  ['MA6633', 'Statistical Modelling for Data Mining', 3, 'Department of Mathematics'],
  ['PH6201', 'Advanced Epidemiology'],
  ['PH6203', 'Applied Public Health Projects', 9],
  ['PH6205', 'Intermediate Level Statistics for One Health'],
  ['PH6206', 'Practicum', 6],
  ['PH6207', 'Global Scholars Training', 9],
  ['PH6208', 'Public Health Insights: Global Perspectives from Research and Practice'],
  ['PH8001', 'Computational Biology, Experimental Design and Data Science'],
  ['PH8003', 'Communication Skills - Conference Organisation'],
], 'Department of Infectious Diseases and Public Health')

addPgCourses([
  ['VCS5001', 'Integrated Small Animal Medicine: Part I'],
  ['VCS5002', 'Integrated Small Animal Medicine: Part II'],
  ['VCS5003', 'Integrated Small Animal Medicine: Part III'],
  ['VCS5004', 'Integrated Small Animal Medicine: Part IV'],
  ['VCS5005', 'Clinical Practice and Professional Skills'],
  ['VSC5006', 'Evidence-Based Medicine'],
  ['VCS5007', 'Exotic Animal Clinical Medicine'],
  ['VCS5008', 'Applied Advanced Diagnostic Medicine'],
  ['VCS8001', 'Introduction to Food Animal Medicine'],
], 'Department of Veterinary Clinical Sciences')

addPgCourses([
  ['CAH5741', 'Cultural Heritage Theories and Practices in China', 3, 'Department of Chinese and History'],
  ['CLA5001', 'Cross Sectoral Leadership'],
  ['CLA5002', 'Research Design and Methods'],
  ['CLA5003', 'Innovative Finance for Global Leaders'],
  ['CLA5004', 'Impact Management and Evaluation'],
  ['CLA5005', 'Marketing for Social Impact'],
  ['CLA5006', 'Technology for Social Transformation'],
  ['CLA5007', 'Project Management and Capstone'],
  ['CLA5008', 'Public Sector Innovation'],
  ['CLA5009', 'Cultural Policy and Diplomacy'],
  ['CLA5010', 'Social Entrepreneurship'],
  ['CLA5011', 'Experiential Learning - Field Trip'],
  ['CLA5012', 'Experiential Learning - Internship'],
  ['COM5110', 'Public Communication Campaign Management', 3, 'Department of Media and Communication'],
  ['COM5402', 'Public Relations Strategies', 3, 'Department of Media and Communication'],
], 'College of Liberal Arts and Social Sciences')

addPgCourses([
  ['BME5108', 'Human Machine Interface'],
  ['BME5110', 'Biomedical Engineering Design'],
  ['BME5111', 'Regenerative Medicine'],
  ['BME6005', 'Micro Systems Technology'],
  ['BME6008', 'Dissertation', 9],
  ['BME6022', 'Project Development Study'],
  ['BME6045', 'Industrial Case Study'],
  ['BME6101', 'Manufacturing of Biomedical Devices'],
  ['BME6111', 'Biomedical Instrumentation'],
  ['BME6114', 'Advanced Control Systems'],
  ['BME6115', 'Biorobotics'],
  ['BME6117', 'Biomedical Safety and Risk Assessment'],
  ['BME6118', 'Biomedical Imaging and Biophotonics'],
  ['BME6121', 'Biomechanics'],
  ['BME6122', 'Physiological Modeling'],
  ['BME6123', 'Flexible Bioelectronics for Medical Applications'],
  ['BME6135', 'Engineering Principles for Drug Delivery'],
  ['BME6136', 'Advanced Biomaterials for Healthcare and Biomedical Applications'],
  ['BME6137', 'Medical Diagnostics'],
  ['BME6138', 'Robotics in Minimally Invasive Healthcare'],
  ['BME6139', 'AI in Medical Imaging'],
  ['BME6140', 'Advanced Optical Microscopy for Biomedical Engineering'],
  ['BME6141', 'Fundamentals and Applications of Single-molecule Biophysics in Rapid Diagnostics'],
  ['BME6142', 'Rapid Diagnostic Devices for Personalized Healthcare'],
  ['BME6145', 'Applied Artificial Intelligence for Biomedical and Healthcare Applications'],
], 'Department of Biomedical Engineering')

addPgCourses([
  ['BIOS5800', 'Probability'],
  ['BIOS5801', 'Statistical Computing'],
  ['BIOS6900', 'Time Series Analysis'],
  ['BMS5001', 'Common Diseases and Genomic Medicine'],
  ['BMS5002', 'Infectious Disease Management'],
  ['BMS5007', 'Pharmacology Principles in Drug Discovery and Development'],
  ['BMS5008', 'Fundamental and Advanced Multi-omics Research'],
  ['BMS5009', 'Ageing and the Science of Human Longevity'],
  ['BMS5010', 'Artificial Intelligence in Health Science Research and Management'],
  ['BMS5011', 'Wearable Technologies and Digital Medicine'],
  ['BMS5012', 'Nutrition Science and Stress Management'],
  ['BMS5013', 'Storytelling of Health Science Data with Analysis and Visualization'],
  ['BMS5100', 'Research Project Study in Biomedical Sciences, Life Sciences and Relevant Disciplines', 9],
  ['BMS5101', 'Project Study in Management and Relevant Disciplines', 6],
  ['BMS8103', 'Cell and Molecular Biology Research'],
  ['BMS8105', 'Biotherapy and Nanomedicine'],
  ['BMS8106', 'Stem Cell and Regenerative Medicine'],
  ['BMS8107', 'Cancer Biology and Precision Medicine'],
  ['BMS8110', 'Genomics and Bioinformatics'],
  ['BMS8111', 'Immunology and Infectious Diseases'],
  ['BMS8112', 'Viruses, Immunity and Ageing'],
  ['BMS8113', 'Advanced Biomedical Materials and Devices'],
  ['MS5216', 'Decision Analytics', 3, 'Department of Management Sciences'],
  ['MS5411', 'Healthcare Management', 3, 'Department of Management Sciences'],
], 'Department of Biomedical Sciences')

addPgCourses([
  ['NS5001', 'Research Methodology and Ethics'],
  ['NS5002', 'Neurobiology of Disease'],
  ['NS5003', 'Neural Basis of Learning and Memory'],
  ['NS5004', 'Molecular and Cellular Neuroscience'],
  ['NS5005', 'Sensory and Motor Neuroscience'],
  ['NS5006', 'Cognitive and Behavioral Neuroscience'],
  ['NS5007', 'Human and Artificial Intelligence'],
  ['NS5008', 'Neuropharmacology'],
  ['NS5009', 'Ethical Application of Artificial Intelligence in Biological Sciences and Healthcare'],
  ['NS6001', 'Research Project in Neuroscience', 6],
  ['NS6002', 'Advanced Computational Neuroscience'],
  ['NS8002', 'Advanced Neuroscience'],
], 'Department of Neuroscience')

addPgCourses([
  ['DSC5001', 'Statistical Machine Learning I'],
  ['DSC6004', 'Topics of Artificial Intelligence for Smart Cities'],
  ['DSC6008', 'Design of Experiments'],
  ['DSC6019', 'Embodied AI and Applications'],
  ['DSC6020', 'Artificial Intelligence for Scientific Knowledge Discovery'],
  ['DSC6021', 'Generative Artificial Intelligence'],
  ['DSC6022', 'Research Projects for Artificial Intelligence for Sciences'],
  ['DSC6023', 'Internship in Artificial Intelligence for Sciences'],
  ['DSC6024', 'Dissertation for Artificial Intelligence for Sciences', 6],
  ['DSC6025', 'AI for Materials Science'],
  ['DSC6026', 'Social Network Analysis'],
  ['DSC6027', 'Topics of AI for Computational Social Sciences'],
  ['DSC6028', 'Medical Image and Analysis'],
  ['DSC6029', 'Topics of Artificial Intelligence for Biomedical Studies'],
  ['DSC6030', 'Quantum Machine Learning'],
  ['CHEM6134', 'AI for Chemistry', 3, 'Department of Chemistry'],
  ['PHY5503', 'Introduction to Quantum Technology', 3, 'Department of Physics'],
  ['PHY5504', 'Data Acquisition & Processing Skills for Physicists I', 3, 'Department of Physics'],
  ['PHY5505', 'Data Acquisition & Processing Skills for Physicists II', 3, 'Department of Physics'],
  ['PHY5506', 'Data Analysis and Modelling in Physics', 3, 'Department of Physics'],
  ['PHY6502', 'Advanced Computational Methods for Simulation and Modelling', 3, 'Department of Physics'],
  ['PHY6603', 'Introduction to Quantum Information', 3, 'Department of Physics'],
  ['PHY6604', 'Machine Learning in Physics', 3, 'Department of Physics'],
  ['MSE5301', 'Instrumentation for Materials Characterization', 3, 'Department of Materials Science and Engineering'],
  ['MSE5303', 'Structure and Deformation of Materials', 3, 'Department of Materials Science and Engineering'],
  ['MSE6181', 'Photonics in Nanomaterial Systems and Devices', 3, 'Department of Materials Science and Engineering'],
  ['MSE6183', 'Computational Methods for Materials Science', 3, 'Department of Materials Science and Engineering'],
  ['MSE6265', 'Quantum Theory of Semiconductors', 3, 'Department of Materials Science and Engineering'],
], 'Department of Data Science')

addPgCourses([
  ['EE5410', 'Signal Processing'],
  ['EE5412', 'Telecommunication Networks'],
  ['EE5415', 'Mobile Applications Design and Development'],
  ['EE5425', 'Fundamentals of Radio Frequency (RF) Circuit Engineering'],
  ['EE5430', 'Advanced CMOS Technology'],
  ['EE5434', 'Machine Learning for Signal Processing Applications'],
  ['EE5436', 'Fundamentals and Applications of Photonics'],
  ['EE5437', 'Internet of Things Technologies for Future City Applications'],
  ['EE5438', 'Applied Deep Learning'],
  ['EE5606', 'Artificial Intelligence for Antennas in Wireless Communication'],
  ['EE5607', 'Advanced Computer Architecture'],
  ['EE5608', 'Modern Cloud Architecture and Deployment Practices'],
  ['EE5609', 'Computer Networks: Architecture, Protocols, and Applications'],
  ['EE5805', 'Java Network Programming'],
  ['EE5808', 'Topics in Computer Graphics'],
  ['EE5811', 'Topics in Computer Vision'],
  ['EE5815', 'Topics in Security Technology'],
  ['EE6427', 'Modern Power Electronics'],
  ['EE6428', 'Optical Communications'],
  ['EE6435', 'Multi-Dimensional Data Modeling and its Applications'],
  ['EE6450', 'Advanced Topics in Engineering I'],
  ['EE6451', 'Advanced Topics in Engineering II'],
  ['EE6603', 'Wireless Communication Technologies'],
  ['EE6605', 'Complex Networks: Modeling, Dynamics and Control'],
  ['EE6610', 'Queueing Theory with Telecommunications Applications'],
  ['EE6611', 'Directed Studies for Taught Postgraduate Students'],
  ['EE6615', 'Nanotechnology for Devices and Microsystems'],
  ['EE6619', 'Antenna Design for Wireless Communications'],
  ['EE6620', 'Linear Systems Theory and Design'],
  ['EE6621', 'Computational Physiology and Neural Systems'],
  ['EE6622', 'Topics in Smart Grids'],
  ['EE6623', 'Sustainable Energy Systems'],
  ['EE6625', 'Hardware Architectures for Artificial Intelligence and Machine Learning'],
  ['EE6626', 'AI-enabled Autonomous Driving'],
  ['EE6627', 'Quantitative Finance: Principles and Applications'],
  ['EE6680', 'Dissertation', 9],
  ['EE6690', 'Internship Scheme in Electrical Industry'],
  ['EE6691', 'Applied Research Internship Scheme in Electrical Engineering', 15],
  ['EE8401', 'Advanced Topics in Applied Electromagnetics'],
  ['EE8402', 'Advanced Topics in Power and Energy Systems'],
  ['EE8403', 'Machine Learning for Signal Processing Applications'],
  ['EE8404', 'Nanotechnology for Devices and Microsystems'],
  ['EE8405', 'Queueing Theory with Telecommunications Applications'],
], 'Department of Electrical Engineering')

addPgCourses([
  ['CAI6002', 'Venture Creation Seminar', 3, 'CityUHK Academy of Innovation'],
  ['EF5010', 'Economics for Business', 3, 'Department of Economics and Finance'],
  ['EF5052', 'Investments', 3, 'Department of Economics and Finance'],
  ['EF5342', 'Financial Systems, Markets and Instruments', 3, 'Department of Economics and Finance'],
  ['MGT5204', 'Management and Organizations', 3, 'Department of Management'],
  ['MGT5205', 'Strategic Management', 3, 'Department of Management'],
  ['MGT5313', 'International Organizational Behaviour', 3, 'Department of Management'],
  ['MGT5316', 'Human Resources Management', 3, 'Department of Management'],
  ['MGT6314', 'Global Human Resource Management', 3, 'Department of Management'],
  ['MGT6325', 'International Entrepreneurship & Intrapreneurship', 3, 'Department of Management'],
  ['MGT6326', 'Managing International Business', 3, 'Department of Management'],
  ['MNE6001', 'CAD/CAM Integration', 3, 'Department of Mechanical Engineering'],
  ['MNE6002', 'Computer Controlled Systems', 3, 'Department of Mechanical Engineering'],
  ['MNE6005', 'Micro Systems Technology', 3, 'Department of Mechanical Engineering'],
  ['MNE6007', 'Advanced Automation Technology', 3, 'Department of Mechanical Engineering'],
  ['MNE6046', 'Nano-manufacturing', 3, 'Department of Mechanical Engineering'],
  ['MNE6126', 'Sensors for Robotics, AI and Control Systems', 3, 'Department of Mechanical Engineering'],
  ['MNE6128', 'Advanced Machine Learning and Quantum Computation for Engineering', 3, 'Department of Mechanical Engineering'],
  ['MSE6121', 'Thin Film Technology and Nanocrystalline Coatings', 3, 'Department of Materials Science and Engineering'],
  ['PH5101', 'Introduction to Health Economics and Outcomes Research', 3, 'Department of Infectious Diseases and Public Health'],
  ['PH5105', 'Basic Biostatistics in Public Health', 3, 'Department of Infectious Diseases and Public Health'],
  ['PH5106', 'Fundamentals of Epidemiology in Public Health', 3, 'Department of Infectious Diseases and Public Health'],
  ['PH6202', 'Infectious Disease Epidemiology and Disease Control', 3, 'Department of Infectious Diseases and Public Health'],
  ['PH6204', 'Public Health Surveillance and Risk Analysis', 3, 'Department of Infectious Diseases and Public Health'],
  ['SDSC8007', 'Deep Learning', 3, 'Department of Data Science'],
  ['SDSC8009', 'Data Mining and Knowledge Discovery', 3, 'Department of Data Science'],
  ['SDSC6016', 'Predictive Analytics and Financial Applications', 3, 'Department of Data Science'],
  ['SM5306', 'Cinematic Arts Workshop', 3, 'School of Creative Media'],
  ['SM5307', 'Digital Media and Moving Images', 3, 'School of Creative Media'],
  ['SM5332', 'Making Things Blip, Blink & Move: Introduction to Physical Computing', 3, 'School of Creative Media'],
  ['SM5345', 'Introduction to Digital Processes: From Creative Computation to Fabrication', 3, 'School of Creative Media'],
  ['SM5354', 'Design Thinking and Innovation in Media', 3, 'School of Creative Media'],
  ['SM6325', 'Philosophy of Technology and New Media', 3, 'School of Creative Media'],
  ['SYE5006', 'Operations Management', 3, 'Department of Systems Engineering'],
  ['SYE5009', 'Industrial Marketing Management for Engineers', 3, 'Department of Systems Engineering'],
  ['SYE5010', 'Engineering Management Principles and Concepts', 3, 'Department of Systems Engineering'],
  ['SYE6009', 'Project Management', 3, 'Department of Systems Engineering'],
  ['SYE6012', 'Technological Innovation and Entrepreneurship', 3, 'Department of Systems Engineering'],
  ['SYE6014', 'Asset and Maintenance Management', 3, 'Department of Systems Engineering'],
  ['SYE6015', 'Supply Chain Management', 3, 'Department of Systems Engineering'],
  ['SYE6018', 'Dissertation', 9, 'Department of Systems Engineering'],
  ['SYE6037', 'Managing Strategic Quality', 3, 'Department of Systems Engineering'],
  ['SYE6043', 'Quality and Reliability Engineering', 3, 'Department of Systems Engineering'],
  ['SYE6045', 'Industrial Case Study', 3, 'Department of Systems Engineering'],
  ['SYE6047', 'Quality Improvement: Systems and Methodologies', 3, 'Department of Systems Engineering'],
  ['SYE6050', 'Engineering Economic Analysis', 3, 'Department of Systems Engineering'],
  ['SYE6053', 'Business Process Improvement and Innovation', 3, 'Department of Systems Engineering'],
  ['SYE6101', 'Estimation and Control of Random Dynamic Systems', 3, 'Department of Systems Engineering'],
  ['SYE6102', 'Managerial Decision-Making Systems with Artificial Intelligence', 3, 'Department of Systems Engineering'],
  ['SYE6103', 'Financial Engineering for Engineering Managers', 3, 'Department of Systems Engineering'],
  ['SYE6105', 'Risk and Decision Analysis', 3, 'Department of Systems Engineering'],
  ['SYE6106', 'Intelligent Manufacturing for Engineering Managers', 3, 'Department of Systems Engineering'],
  ['SYE6107', 'Contemporary Occupational Safety and Health Management', 3, 'Department of Systems Engineering'],
  ['SYE6108', 'Energy Conservation and Management', 3, 'Department of Systems Engineering'],
  ['SYE6109', 'Semiconductor Manufacturing and Management', 3, 'Department of Systems Engineering'],
  ['SYE6110', 'Data Analysis and Artificial Intelligence for Systems Engineering', 3, 'Department of Systems Engineering'],
  ['SYE6111', 'Transportation and Logistics Management', 3, 'Department of Systems Engineering'],
  ['SYE6201', '3D IC Stacking and Advanced Packaging Technology', 3, 'Department of Systems Engineering'],
  ['SYE6202', 'Semiconductor Process Equipment and Materials', 3, 'Department of Systems Engineering'],
  ['SYE6203', 'Internship Scheme in Semiconductor Industry', 3, 'Department of Systems Engineering'],
  ['SYE6204', 'VLSI/ULSI Process Integration', 3, 'Department of Systems Engineering'],
  ['SYE6205', 'Semiconductor Thin Film Engineering', 3, 'Department of Systems Engineering'],
  ['SYE6206', 'Packaging for Nanoelectronics', 3, 'Department of Systems Engineering'],
  ['SYE6207', 'Characterization Techniques for Semiconductor Manufacturing', 3, 'Department of Systems Engineering'],
  ['SYE6301', 'Sustainability and Green Systems', 3, 'Department of Systems Engineering'],
  ['SYE6302', 'Design Science', 3, 'Department of Systems Engineering'],
  ['SYE6303', 'Multiscale Decision Making for Industrial Enterprise', 3, 'Department of Systems Engineering'],
  ['SYE6308', 'Statistical Learning in Manufacturing Quality Control', 3, 'Department of Systems Engineering'],
  ['SYE6309', 'Smart City and IoT Technologies', 3, 'Department of Systems Engineering'],
  ['SYE6601', 'Introduction to Artificial Intelligence: Concepts and Applications', 3, 'Department of Systems Engineering'],
  ['SYE6602', 'AI-Driven Innovation: Seminars and Projects', 3, 'Department of Systems Engineering'],
  ['SYE6610', 'AI Innovation Internships', 3, 'Department of Systems Engineering'],
  ['SYE6612', 'The Fourth Industrial Revolution', 3, 'Department of Systems Engineering'],
  ['SYE6620', 'AI-Based Media Entrepreneurship', 3, 'Department of Systems Engineering'],
  ['SYE6621', 'Agentic AI for Innovation', 3, 'Department of Systems Engineering'],
  ['SYE8202', 'Systems Modelling and Management', 3, 'Department of Systems Engineering'],
  ['SYE8204', 'Process Modelling and Control', 3, 'Department of Systems Engineering'],
  ['SYE8205', 'Managerial Economics', 3, 'Department of Systems Engineering'],
], 'Department of Systems Engineering')

addPgCourses([
  ['CAI6001', 'GRIT (Graduate Research and Innovation Trek) Integrated Study', 6, 'CityUHK Academy of Innovation'],
  ['CAI6003', 'Innovation Project', 12, 'CityUHK Academy of Innovation'],
  ['AC5813', 'Financial and Management Accounting', 3, 'Department of Accountancy'],
  ['AC5690', 'Corporate Governance', 3, 'Department of Accountancy'],
  ['AC6533', 'Corporate Finance and Policies', 3, 'Department of Accountancy'],
  ['COM5101', 'Communication Fundamentals', 3, 'Department of Media and Communication'],
  ['COM5104', 'Research Methods for Communication and New Media', 3, 'Department of Media and Communication'],
  ['COM5105', 'Media Economics and Financial Markets', 3, 'Department of Media and Communication'],
  ['COM5106', 'Integrated Marketing Communication', 3, 'Department of Media and Communication'],
  ['COM5107', 'Professional Communication Skills', 3, 'Department of Media and Communication'],
  ['COM5111', 'Generative AI for Digital Marketing', 3, 'Department of Media and Communication'],
  ['COM5402', 'Public Relations Strategies', 3, 'Department of Media and Communication'],
  ['COM5405', 'Consumer Behavior Insight', 3, 'Department of Media and Communication'],
  ['COM5406', 'Entrepreneurship and Business Planning', 3, 'Department of Media and Communication'],
  ['COM5408', 'Global Promotion and Branding', 3, 'Department of Media and Communication'],
  ['COM5506', 'Social Network Analysis for Communication', 3, 'Department of Media and Communication'],
  ['COM5510', 'Introduction to Artificial Intelligence', 3, 'Department of Media and Communication'],
  ['IS5010', 'Introduction to Financial Technologies', 3, 'Department of Information Systems'],
  ['IS5540', 'Project Management and Quality Assurance', 3, 'Department of Information Systems'],
  ['IS5940', 'Innovation and Technology Entrepreneurship', 3, 'Department of Information Systems'],
  ['IS6200', 'Blockchain Technology and Business Applications', 3, 'Department of Information Systems'],
  ['IS6620', 'Large Language Model with Prompt Engineering for Business', 3, 'Department of Information Systems'],
  ['LW6401', 'Dispute Resolution in Theory and Practice', 3, 'School of Law'],
  ['LW6405', 'Arbitration Law', 3, 'School of Law'],
  ['LW5957', 'Legal Studies for the Built Environment', 3, 'School of Law'],
  ['MGT5507', 'Managerial Decision Making', 3, 'Department of Management'],
  ['MGT6066', 'Business Ethics & Social Responsibility', 3, 'Department of Management'],
  ['MGT6202', 'Global Business Leadership', 3, 'Department of Management'],
  ['MGT6310', 'People Analytics', 3, 'Department of Management'],
  ['MGT6324', 'Business Intelligence in Asia', 3, 'Department of Management'],
  ['MKT5610', 'Marketing Strategy and Planning', 3, 'Department of Marketing'],
  ['MKT5641', 'Chinese Business Culture and Marketing', 3, 'Department of Marketing'],
  ['MKT5643', 'Global Marketing', 3, 'Department of Marketing'],
  ['MKT5645', 'Customer Relationship Management', 3, 'Department of Marketing'],
  ['MKT5646', 'Advertising and Integrated Marketing Communications', 3, 'Department of Marketing'],
  ['MKT5648', 'Social Media Marketing', 3, 'Department of Marketing'],
  ['MS5223', 'Project Management', 3, 'Department of Management Sciences'],
  ['PIA5000', 'PIA Postgraduate Internship', 3, 'Department of Public and International Affairs'],
  ['PIA5057', 'Collaborative Governance for Sustainability', 3, 'Department of Public and International Affairs'],
  ['PIA5500', 'Understanding the Modern Metropolis', 3, 'Department of Public and International Affairs'],
  ['PIA5504', 'The Asian Metropolis: Issues in Urban Management', 3, 'Department of Public and International Affairs'],
  ['PIA5510', 'Understanding and Managing Smart Cities', 3, 'Department of Public and International Affairs'],
  ['PIA5701', 'Comparative and International Housing and Urban Policy', 3, 'Department of Public and International Affairs'],
  ['PIA5702', 'Finance and Economics in Housing and Urban Studies', 3, 'Department of Public and International Affairs'],
  ['PIA5703', 'Contemporary Issues in Housing and Urban Management', 3, 'Department of Public and International Affairs'],
  ['PIA5704', 'Building Services Systems and Maintenance for Housing Managers', 3, 'Department of Public and International Affairs'],
  ['PIA6501', 'Urban Development and Sustainable Cities', 3, 'Department of Public and International Affairs'],
  ['PIA6505', 'Financing Sustainability: Policy and Mechanisms', 3, 'Department of Public and International Affairs'],
  ['PIA6800', 'Contemporary Management for Housing Managers', 3, 'Department of Public and International Affairs'],
  ['PIA6802', 'Advanced Housing Practice (and Residential)', 3, 'Department of Public and International Affairs'],
  ['PIA6803', 'Research Methods for Housing and Urban Management', 3, 'Department of Public and International Affairs'],
  ['PIA6804', 'MAHUM Capstone Project', 3, 'Department of Public and International Affairs'],
  ['SEE6116', 'Building Performance Assessment', 3, 'School of Energy and Environment'],
  ['SEE6125', 'Carbon Capture Use and Storage', 3, 'School of Energy and Environment'],
  ['SEE6225', 'Environmental Assessment', 3, 'School of Energy and Environment'],
], 'College of Business')

addPgCourses([
  ['CA5136', 'Foundation Studio for Values and Fundamentals in Design and Planning', 3],
  ['CA5137', 'Urban Design Studio', 6],
  ['CA5147', 'Housing and Community Development', 3],
  ['CA5148', 'Architecture and Urbanism', 3],
  ['CA5150', 'Advanced Architectural Design Studio: Urban Design', 8],
  ['CA5152', 'Advanced Architectural Design Studio: Conservation', 8],
  ['CA5159', 'Design Representation and Building Information Management', 3],
  ['CA5160', 'Advanced Architectural Design Studio: Housing and Community', 8],
  ['CA5161', 'Theory and Criticism of Architecture', 3],
  ['CA5239', 'Building and Urban Conservation', 3],
  ['CA5240', 'Urban Design and Regional Planning History, Theory and Practice', 3],
  ['CA5301', 'Professional Practice - Building Controls, Contract Administration', 3],
  ['CA5696', 'Advanced Topics in Structural and Material Design', 3],
  ['CA6138', 'Urban Design Charrette', 3],
  ['CA6162', 'Advanced Architectural Design Studio: Performance-based Design', 8],
  ['CA6163', 'Research Methods and Thesis Development Seminar in Architecture', 3],
  ['CA6164', 'Architecture Thesis Studio', 8],
  ['CA6165', 'Professional Practice and Project Administration', 3],
  ['CA6167', 'Advanced Topics in Architectural History and Theory', 3],
  ['CA6179', 'Advanced Architectural Design Studio: Digital Architecture', 8],
  ['CA6183', 'Advanced Architectural Design Studio: Comprehensive Development', 8],
  ['CA6200', 'Thesis Writing Skills', 1],
  ['CA6242', 'Advanced Topics in Sustainable Urban Development', 3],
  ['CA6319', 'Advanced Topics in Architectural Practice and Law', 3],
  ['CA6533', 'Thesis Studio for Design and Planning', 9],
  ['CA6609', 'Green Building, Architecture and People', 3],
  ['CA6701', 'Advanced Topics in Computational Design', 3],
  ['POL5701', 'Comparative and International Housing and Urban Policy', 3, 'Department of Public Policy'],
  ['POL5702', 'Finance and Economics in Housing and Urban Studies', 3, 'Department of Public Policy'],
  ['POL5703', 'Contemporary Issues of Housing and Urban Management', 3, 'Department of Public Policy'],
  ['POL6805', 'Housing Management, Local Politics and Public Relations', 3, 'Department of Public Policy'],
], 'Department of Architecture and Civil Engineering')

addPgCourses([
  ['LT5199', 'Professional Internship'],
  ['LT5401', 'Phonetics and Phonology'],
  ['LT5402', 'Syntax and Morphology'],
  ['LT5403', 'Semantics and Discourse'],
  ['LT5406', 'Psycholinguistics'],
  ['LT5407', 'Research Methodology for Applied Linguistics'],
  ['LT5408', 'Sociolinguistics'],
  ['LT5409', 'Systemic Functional Linguistics'],
  ['LT5411', 'Computational Linguistics'],
  ['LT5412', 'Language Teaching'],
  ['LT5413', 'Philosophy of Language'],
  ['LT5416', 'Historical Linguistics'],
  ['LT5417', 'Language Universals and Linguistic Typology'],
  ['LT5418', 'Second Language Pronunciation Acquisition: from Theory to Practice'],
  ['LT5420', 'Language Arts and Literature'],
  ['LT5421', 'Corpus Linguistics'],
  ['LT5422', 'Neurocognition of Language'],
  ['LT5430', 'Special Topics in Linguistics'],
  ['LT5431', 'Functional Approaches to Syntax'],
  ['LT5432', 'Lexical Semantics'],
  ['LT5451', 'Pedagogical Grammar: Chinese and English'],
  ['LT5452', 'Learning and Teaching Chinese as a Foreign Language'],
  ['LT5453', 'The Cantonese Language: Pronunciation, Lexicon and Grammar'],
  ['LT5454', 'Grammar of Chinese'],
  ['LT5455', 'Pragmatics'],
  ['LT5456', 'Text Linguistics'],
  ['LT5457', 'Computational Lexicography'],
  ['LT5458', 'Computer-Assisted Language Learning'],
  ['LT5459', 'Terminology and Translation'],
  ['LT5460', 'Studies of Second Language Acquisition'],
  ['LT5461', 'Cognition and Language Differences'],
  ['LT5462', 'Social Approaches to Language in Education'],
  ['LT5510', 'Contrastive Studies of Chinese and English Grammar'],
  ['LT5601', 'Stylistics and Translation'],
  ['LT5603', 'Theory of Translation'],
  ['LT5604', 'Translation Methodology'],
  ['LT5605', 'Interpretation Methodology'],
  ['LT5606', 'Translating Cultures'],
  ['LT5617', 'Bilingual Reading and Writing for Translators'],
  ['LT5621', 'Language and Literature in Translation'],
  ['LT5626', 'Translation and Comparative Literature'],
  ['LT5627', 'Advanced Interpreting'],
  ['LT5628', 'Human-Machine Interactive Translation'],
  ['LT5630', 'Special Topics in Translation and Interpretation'],
  ['LT5633', 'Performance and Translation'],
  ['LT5903', 'Language and its Applications'],
  ['LT5904', 'Language and Culture in Society'],
  ['LT6421', 'Advanced Topics in Corpus and Empirical Linguistics'],
  ['LT6422', 'Advanced Topics in Semantics'],
  ['LT6423', 'Advanced Topics in Syntax'],
  ['LT6505', 'Legal Translation'],
  ['LT6514', 'Advanced Legal Translation'],
  ['LT6580', 'Master\'s Project', 6],
  ['LT6582', 'Capstone Project', 3],
], 'Department of Linguistics and Translation')

addPgCourses([
  ['SM5301', 'Studio I', 3],
  ['SM5301A', 'Studio I (Games)', 3],
  ['SM5301B', 'Studio I (Human-Computer Interaction)', 3],
  ['SM5302', 'Studio II', 6],
  ['SM5302A', 'Studio II (Games)', 6],
  ['SM5302B', 'Studio II (Human-Computer Interaction)', 6],
  ['SM5303', 'Technofutures: Critical Approaches to the Metaverse, AI, and Blockchain', 3],
  ['SM5308', 'Art and Technology', 3],
  ['SM5312', 'Interactive Media I', 3],
  ['SM5313', 'Interactive Media II', 3],
  ['SM5315', 'Independent Study I', 3],
  ['SM5316', 'Topics in Media Art I', 3],
  ['SM5317', 'Digital Sound and Computer Music', 3],
  ['SM5318', 'Topics in Media History and Theory I', 3],
  ['SM5323', 'Topics in Media History and Theory II', 3],
  ['SM5325', 'Introduction to Media and Cultural Studies', 3],
  ['SM5326', 'Gender in Popular Media', 3],
  ['SM5327', 'Chinese Cinema', 3],
  ['SM5329', 'Arts Management and Curatorship', 3],
  ['SM5331', 'Topics in Media History and Theory III', 3],
  ['SM5333', 'Prototyping New Cinema: The Future Moving Image', 3],
  ['SM5334', 'Navigating Social Media: Culture, Aesthetics, and Technology', 3],
  ['SM5335', 'Archaeology of New Media Art', 3],
  ['SM5336', 'Art in the Information Age: Creative Act, Art Object, Aesthetic Perception', 3],
  ['SM5337', 'Aesthetics Beyond the Anthropocene', 3],
  ['SM5339', 'Art and Activist Games Workshop', 3],
  ['SM5343', 'Law, Policies and Global Media Platforms', 3],
  ['SM5344', 'Abstract and Experimental Animation', 3],
  ['SM5346', 'Topics in Interactive', 3],
  ['SM5347', 'Topics in Media Worlding', 3],
  ['SM5348', 'Curating Creative Media', 3],
  ['SM5349', 'Distributed Curation', 3],
  ['SM5350', 'Game Design Fundamentals', 3],
  ['SM5351', 'Introduction to Influencer Studies', 3],
  ['SM5352', 'Influencer Techniques: Aesthetics, Narratives, and Audience', 3],
  ['SM5353', 'Creative Entrepreneurship in Media', 3],
  ['SM5355', 'Korean Cinema', 3],
  ['SM5356', 'Art, Technology, and Queering', 3],
  ['SM5357', 'Media and Human Experiences: Anxiety, Nostalgia, and Transcendence', 3],
  ['SM5358', 'Qualitative Research in Social Computing and Art Technology', 3],
  ['SM5359', 'Psychology of Interactive Media and Games', 3],
  ['SM5360', 'Making Interactive Things', 3],
  ['SM5363', 'Human-Centered AI: Agents, Interaction, and Integration', 3],
  ['SM6300', 'Thesis Project - Studio I', 3],
  ['SM6300A', 'Thesis Project - Studio I (Games)', 3],
  ['SM6300B', 'Thesis Project - Studio I (Human-Computer Interaction)', 3],
  ['SM6302', 'Thesis Project - Studio II', 6],
  ['SM6302A', 'Thesis Project - Studio II (Games)', 6],
  ['SM6302B', 'Thesis Project - Studio II (Human-Computer Interaction)', 6],
  ['SM6305', 'Media Art: Theory and Practice I', 3],
  ['SM6310', 'Independent Study II', 3],
  ['SM6311', 'Topics in Media Art II', 3],
  ['SM6316', 'Media Art: Theory and Practice II', 3],
  ['SM6317', 'Research Project in Media Studies', 6],
  ['SM6319', 'Privacy and Surveillance in Art and Culture', 3],
  ['SM6322', 'The Art Market: Transaction, Activism, Analysis', 3],
  ['SM6323', 'Critical Ludology: Games, Playability and New Media Art', 3],
  ['SM6324', 'Sensory Ethnography: Critical and Creative Practices', 3],
  ['SM6328', 'Analysis and Criticism of Computer Games', 3],
  ['SM6329', 'History and Making of Exhibitions', 3],
  ['SM6331', 'Digital Media for Curating', 3],
  ['SM6332', 'Computer Games and Society', 3],
  ['SM6333', 'World Making: Artistic Strategies for Contingent Systems', 3],
  ['SM6341', 'Independent Documentary Production', 3],
  ['SM6342', 'Transcultural Collaboration - A Hong Kong-Swiss International Exchange Project', 6],
  ['SM6343', 'Collaborative Topics in Media Art', 3],
  ['SM6344', 'Technology and Aesthetics', 3],
  ['SM6345', 'Media Cultures Theory x Practice Summer Seminar', 3],
  ['SM6346', 'Social Media, Aesthetics and Curation', 3],
  ['SM6347', 'Protocols and Techniques of Decentralised Curation', 3],
  ['SM6348', 'Under the Skin of Fashion', 3],
  ['SM6349', 'Platform Cultures', 3],
  ['SM6350', 'Videographic Criticism', 3],
  ['SM6351', 'Information Visualization', 3],
], 'School of Creative Media')

addPgCourses([
  ['LW5608', 'Constitutional Law', 3],
  ['LW6103E', 'Company Law', 3],
  ['LW6105E', 'Cross-Border Restructuring and Insolvency', 3],
  ['LW6106E', 'Legal and Operational Aspects of Corporate Governance', 3],
  ['LW6107E', 'Capital and Securities Market Regulation', 3],
  ['LW6108E', 'International Finance: Law and Regulation', 3],
  ['LW6109E', 'Banking Law', 3],
  ['LW6110E', 'Commercial Law', 3],
  ['LW6111E', 'Insurance Law', 3],
  ['LW6112E', 'Human Rights Responsibilities of Business', 3],
  ['LW6118E', 'Entertainment Law', 3],
  ['LW6121E', 'Constitutional and Administrative Law of China', 3],
  ['LW6122E', 'Chinese and Comparative Financial Law', 3],
  ['LW6127E', 'International and Comparative Intellectual Property Law: Trademarks and Patents', 3],
  ['LW6129E', 'Chinese and Comparative Environmental Law', 3],
  ['LW6131C', 'Legal Systems in South East Asia', 3],
  ['LW6133E', 'International and Comparative Copyright Law', 3],
  ['LW6134E', 'Chinese and Comparative Company Law', 3],
  ['LW6136E', 'Property Rights in China: Legal, Economic, and Policy Analysis', 3],
  ['LW6138E', 'Chinese Law of Obligations', 3],
  ['LW6140E', 'Chinese and Comparative Commercial Law', 3],
  ['LW6141E', 'Chinese Foreign Trade and Investment Law', 3],
  ['LW6142E', 'International Investment Law', 3],
  ['LW6143E', 'Law and Business in Asia', 3],
  ['LW6144E', 'International Trade Law', 3],
  ['LW6145E', 'Transnational Legal Problems', 3],
  ['LW6160E', 'Advanced Study of Antidumping and Countervailing Measures', 3],
  ['LW6161E', 'Chinese and Comparative Competition Law', 3],
  ['LW6164E', 'Law of Contract', 3],
  ['LW6165E', 'Law of Tort', 3],
  ['LW6167E', 'Current Issues in WTO Law', 3],
  ['LW6169E', 'Chinese and Comparative Labour Law', 3],
  ['LW6172E', 'Law and Society in China', 3],
  ['LW6173E', 'Private International Law', 3],
  ['LW6175E', 'Maritime Insurance Law', 3],
  ['LW6176E', 'Aviation Law', 3],
  ['LW6179E', 'Maritime Arbitration Law', 3],
  ['LW6180E', 'International Commercial Contracts and Uniform Sales Law', 3],
  ['LW6181E', 'Common Law System, Reasoning and Methodology', 3],
  ['LW6187E', 'Chinese and Comparative Alternative Dispute Resolution', 3],
  ['LW6188E', 'Chinese and Comparative Maritime Law', 3],
  ['LW6189E', 'Bills of Lading Law', 3],
  ['LW6190E', 'Charterparties Law', 3],
  ['LW6191E', 'Admiralty Procedure Law', 3],
  ['LW6192E', 'Admiralty Law', 3],
  ['LW6195E', 'International and Comparative Law of Copyright, Designs and Allied Rights', 3],
  ['LW6198E', 'Intellectual Property: Law, Practice and Procedure', 3],
], 'School of Law')

const RESEARCH_COURSE_BASE_URL = 'https://www.cityu.edu.hk/sgs/student/rpg/courses/courselist'

const RESEARCH_COURSE_SOURCES = {
  SGS: `${RESEARCH_COURSE_BASE_URL}/sgs`,
  AC: `${RESEARCH_COURSE_BASE_URL}/ac`,
  ACE: `${RESEARCH_COURSE_BASE_URL}/ace`,
  BME: `${RESEARCH_COURSE_BASE_URL}/bme`,
  BMS: `${RESEARCH_COURSE_BASE_URL}/bms`,
  CAH: `${RESEARCH_COURSE_BASE_URL}/cah`,
  CHEM: `${RESEARCH_COURSE_BASE_URL}/chem`,
  COM: `${RESEARCH_COURSE_BASE_URL}/com`,
  CS: `${RESEARCH_COURSE_BASE_URL}/cs`,
  DS: `${RESEARCH_COURSE_BASE_URL}/sdsc`,
  E2: `${RESEARCH_COURSE_BASE_URL}/see`,
  EE: `${RESEARCH_COURSE_BASE_URL}/ee`,
  EF: `${RESEARCH_COURSE_BASE_URL}/ef`,
  EN: `${RESEARCH_COURSE_BASE_URL}/en`,
  IDPH: `${RESEARCH_COURSE_BASE_URL}/ph`,
  IS: `${RESEARCH_COURSE_BASE_URL}/is`,
  LAW: `${RESEARCH_COURSE_BASE_URL}/slw`,
  LT: `${RESEARCH_COURSE_BASE_URL}/lt`,
  MATH: `${RESEARCH_COURSE_BASE_URL}/ma`,
  MGT: `${RESEARCH_COURSE_BASE_URL}/mgt`,
  MKT: `${RESEARCH_COURSE_BASE_URL}/mkt`,
  MNE: `${RESEARCH_COURSE_BASE_URL}/mne`,
  MSE: `${RESEARCH_COURSE_BASE_URL}/mse`,
  MS: `${RESEARCH_COURSE_BASE_URL}/dao`,
  NS: `${RESEARCH_COURSE_BASE_URL}/ns`,
  PHY: `${RESEARCH_COURSE_BASE_URL}/phy`,
  PIA: `${RESEARCH_COURSE_BASE_URL}/pia`,
  SCM: `${RESEARCH_COURSE_BASE_URL}/scm`,
  SS: `${RESEARCH_COURSE_BASE_URL}/ss`,
  SYE: `${RESEARCH_COURSE_BASE_URL}/sye`,
  VCS: `${RESEARCH_COURSE_BASE_URL}/vcs`,
}

function addResearchCourses(entries, department, sourceUrl) {
  for (const [code, title, credits = 3] of entries) {
    if (!pgCourses[code]) {
      pgCourses[code] = makeCourse(code, title, credits, {
        department,
        sourceUrl,
        detailStatus: 'linked-unparsed',
        assessment: {
          details: 'Official research coursework list linked; detailed assessment should be confirmed from the PG catalogue or department.',
        },
      })
    }
  }
}

addResearchCourses([
  ['SG8001', 'Teaching Students: First Steps', 1],
  ['SG8002', 'English for the Medium of Instruction', 1],
], 'Chow Yei Ching School of Graduate Studies', RESEARCH_COURSE_SOURCES.SGS)

addResearchCourses([
  ['BME8103', 'Manufacturing of Biomedical Devices', 3],
  ['BME8122', 'Biomedical Engineering Design', 3],
  ['BME8125', 'Micro Systems Technology', 3],
  ['BME8127', 'Biomedical Instrumentation', 3],
  ['BME8130', 'Biomedical Safety and Risk Assessment', 3],
  ['BME8131', 'Biomedical Imaging and Biophotonics', 3],
  ['BME8132', 'Biomechanics', 3],
], 'Department of Biomedical Engineering', RESEARCH_COURSE_SOURCES.BME)

addResearchCourses([
  ['BMS8101A', 'Biomedical Research Seminar A', 1],
  ['BMS8101B', 'Biomedical Research Seminar B', 1],
  ['BMS8101C', 'Biomedical Research Seminar C', 1],
  ['BMS8101D', 'Biomedical Research Seminar D', 1],
  ['BMS8102', 'Frontiers in Biomedical Research', 2],
], 'Department of Biomedical Sciences', RESEARCH_COURSE_SOURCES.BMS)

addResearchCourses([
  ['CA8004', 'Postgraduate Seminar', 3],
  ['CA8018', 'Modelling and Computational Techniques', 3],
  ['CA8028', 'Strategies for Planning and Design', 3],
], 'Department of Architecture and Civil Engineering', RESEARCH_COURSE_SOURCES.ACE)

addResearchCourses([
  ['CAH8808', 'Research Methods for Humanities Studies', 3],
], 'Department of Chinese and History', RESEARCH_COURSE_SOURCES.CAH)

addResearchCourses([
  ['CHEM8007B', 'Window on Science B', 3],
], 'Department of Chemistry', RESEARCH_COURSE_SOURCES.CHEM)

addResearchCourses([
  ['CS8692', 'Comprehensive Studies in Selected Topics in Computer Science', 3],
  ['CS8695', 'Research In Computer Science', 2],
], 'Department of Computer Science', RESEARCH_COURSE_SOURCES.CS)

addResearchCourses([
  ['EE8001', 'Guided Studies', 3],
  ['EE5435', 'Advanced Topics in Applied Electromagnetics', 3],
  ['EE6453', 'Mobile Communication and Networks', 3],
  ['EE6624', 'Advanced Topics in Power and Energy Systems', 3],
  ['EE8461', 'Research Seminar I', 0.5],
  ['EE8462', 'Research Seminar II', 0.5],
], 'Department of Electrical Engineering', RESEARCH_COURSE_SOURCES.EE)

addResearchCourses([
  ['EF8070', 'Advanced Microeconomics', 3],
  ['EF8090', 'Advanced Econometrics', 3],
], 'Department of Economics and Finance', RESEARCH_COURSE_SOURCES.EF)

addResearchCourses([
  ['EN5315', 'Analysing Specialised Texts for Applied Purposes', 3],
  ['EN5450', 'Survey of Literary Genres', 3],
  ['EN8001', 'English Department Research Students Seminar I', 2],
  ['EN8002', 'English Department Research Students Seminar II', 2],
  ['EN8014', 'English Department Research Students Seminar III', 2],
], 'Department of English', RESEARCH_COURSE_SOURCES.EN)

addResearchCourses([
  ['LT8806', 'Advanced Topics in Linguistics Research', 3],
  ['LT8807', 'Advanced Topics in Translation and Interpretation Research', 3],
  ['LT8808', 'Research Methodology for Language Studies', 3],
  ['LT8809', 'Research Student Seminar', 3],
], 'Department of Linguistics and Translation', RESEARCH_COURSE_SOURCES.LT)

addResearchCourses([
  ['LW6100E', 'Advanced Legal Research Methodology', 3],
  ['LW6132E', 'Theory and Practice of Comparative Law', 3],
], 'School of Law', RESEARCH_COURSE_SOURCES.LAW)

addResearchCourses([
  ['MA8004', 'Selected Topics in Applied Analysis', 3],
  ['MA8005', 'Advanced Partial Differential Equations I', 3],
  ['MA8006', 'Functional Analysis and Applications', 3],
  ['MA8014', 'Advanced Methods for Scientific Computation', 3],
  ['MA8019', 'Topics in Applied Mathematics', 3],
], 'Department of Mathematics', RESEARCH_COURSE_SOURCES.MATH)

addResearchCourses([
  ['MGT8904', 'Advanced Topics in Organizational Behavior and Human Resource Management', 3],
  ['MGT8905', 'Directed Studies in Organization and Strategy', 3],
  ['MGT8906', 'Advanced Topics in Organization and Strategy', 3],
  ['MGT8907', 'Directed Studies in Organizational Behavior and Human Resource Management', 3],
], 'Department of Management', RESEARCH_COURSE_SOURCES.MGT)

addResearchCourses([
  ['MKT8630', 'Doctoral Studies: Marketing Modeling', 3],
  ['MKT8631', 'Doctoral Studies: Marketing Theory', 3],
  ['MKT8632', 'Doctoral Studies: Marketing Strategy', 3],
], 'Department of Marketing', RESEARCH_COURSE_SOURCES.MKT)

addResearchCourses([
  ['MNE8001', 'Comprehensive Studies', 3],
  ['MNE8009', 'Research Methodology', 2],
  ['MNE8101', 'Special Topics on Advanced Structural Materials', 3],
  ['MNE8102', 'Kinetics in Nanoscale Materials', 3],
  ['MNE8104', 'Nano-manufacturing', 3],
  ['MNE8105', 'Mechanical Behaviour of Materials: From Metallic to Biomedical/Biological Materials', 3],
  ['MNE8106', 'Electron Microscopy', 3],
  ['MNE8108', 'Engineering Methods', 3],
  ['MNE8109', 'Thermodynamics and Kinetics', 3],
  ['MNE8110', 'Sensors for Robotics, AI, and Control Systems', 3],
  ['MNE8111', 'Advanced Thermal Fluids', 3],
  ['MNE8112', 'CAD/CAM/CAE Integration', 3],
  ['MNE8113', 'Applied Engineering Mechanics', 3],
  ['MNE8114', 'Fundamentals of Nuclear Engineering', 3],
  ['MNE8116', 'Computer Controlled Systems', 3],
  ['MNE8117', 'Micro Systems Technology', 3],
  ['MNE8118', 'Advanced Automation Technology', 3],
  ['MNE8119', 'Sustainable Green Manufacturing', 3],
  ['MNE8120', 'Microfluidics: From Fundamentals to Applications', 3],
  ['MNE8121', 'Advanced Machine Learning and Quantum Computation for Engineering', 3],
  ['MNE8122', 'Advanced Topics in Nonlinear Dynamics, Vibration and Control', 3],
], 'Department of Mechanical Engineering', RESEARCH_COURSE_SOURCES.MNE)

addResearchCourses([
  ['MSE8001', 'Survival Skills for Research Scientists', 2],
], 'Department of Materials Science and Engineering', RESEARCH_COURSE_SOURCES.MSE)

addResearchCourses([
  ['MS8944', 'Probability and Markov Chain Models', 3],
  ['MS8945', 'Stochastic Operations Research', 3],
  ['MS8952', 'Introduction to Mathematical Statistics', 3],
  ['MS8953', 'Optimization Theory and Method', 3],
  ['MS8956', 'Advanced Regression Techniques', 3],
], 'Department of Management Sciences', RESEARCH_COURSE_SOURCES.MS)

addResearchCourses([
  ['PH6201', 'Advanced Epidemiology', 3],
  ['PH8002', 'Infectious Disease Epidemiology', 3],
  ['PH8004', 'Animal Welfare and Research Ethics', 2],
  ['PH8005', 'Principles of Immunology', 3],
  ['PH8006', 'Advanced Molecular Diagnostics and Imaging', 3],
  ['PH8007', 'Medical Imaging Instrumentation for Research and Clinical Practice', 3],
  ['PH8008', 'Multiplanar Anatomy', 3],
], 'Department of Infectious Diseases and Public Health', RESEARCH_COURSE_SOURCES.IDPH)

addResearchCourses([
  ['SEE8002', 'Scientific Writing and Communication', 3],
  ['SEE8003', 'Skills for Scientists', 2],
  ['SEE8212', 'Data Analysis in Environmental Applications', 3],
], 'School of Energy and Environment', RESEARCH_COURSE_SOURCES.E2)

addResearchCourses([
  ['SM8402', 'Research Skills and Methods', 3],
], 'School of Creative Media', RESEARCH_COURSE_SOURCES.SCM)

addResearchCourses([
  ['ADSE8201', 'Optimization and Applications', 3],
  ['ADSE8202', 'Systems Modelling and Management', 3],
], 'Department of Systems Engineering', RESEARCH_COURSE_SOURCES.SYE)

addResearchCourses([
  ['VCS8002', 'Grant Writing and Peer Review', 2],
  ['VCS8003A', 'Frontiers in Veterinary Medical Research (A)', 1],
  ['VCS8003B', 'Frontiers in Veterinary Medical Research (B)', 1],
  ['VCS8003C', 'Frontiers in Veterinary Medical Research (C)', 1],
  ['VCS8003D', 'Frontiers in Veterinary Medical Research (D)', 1],
], 'Department of Veterinary Clinical Sciences', RESEARCH_COURSE_SOURCES.VCS)

function ref(code, overrides = {}) {
  const course = pgCourses[code]
  return {
    code,
    title: overrides.title ?? course?.title ?? code,
    credits: overrides.credits ?? course?.credits ?? 0,
    remarks: overrides.remarks,
  }
}

function titleRef(programmeCode, title, credits = 3, overrides = {}) {
  return {
    code: `PGTITLE_${programmeCode}_${slug(title).replace(/-/g, '_').toUpperCase()}`,
    title,
    credits,
    remarks: overrides.remarks,
    sourceOnly: true,
    sourceUrl: overrides.sourceUrl,
  }
}

function refs(codes) {
  return codes.map((code) => ref(code))
}

function titleRefs(programmeCode, titles, credits = 3) {
  return titles.map((title) => titleRef(programmeCode, title, credits))
}

const RESEARCH_COMMON_CODES = ['SG8001', 'SG8002']

const RESEARCH_PROGRAMME_SOURCE_KEYS = {
  RPG_AC: 'AC',
  RPG_ACE: 'ACE',
  RPG_BME: 'BME',
  RPG_BMS: 'BMS',
  RPG_CAH: 'CAH',
  RPG_CHEM: 'CHEM',
  RPG_COM: 'COM',
  RPG_CS: 'CS',
  RPG_DS: 'DS',
  RPG_E2: 'E2',
  RPG_EE: 'EE',
  RPG_EF: 'EF',
  RPG_EN: 'EN',
  RPG_IDPH: 'IDPH',
  RPG_IS: 'IS',
  RPG_LAW: 'LAW',
  RPG_LT: 'LT',
  RPG_MATH: 'MATH',
  RPG_MGT: 'MGT',
  RPG_MKT: 'MKT',
  RPG_MNE: 'MNE',
  RPG_MSE: 'MSE',
  RPG_MS: 'MS',
  RPG_NS: 'NS',
  RPG_PHY: 'PHY',
  RPG_PIA: 'PIA',
  RPG_SCM: 'SCM',
  RPG_SS: 'SS',
  RPG_SYE: 'SYE',
  RPG_VCS: 'VCS',
}

const RESEARCH_EXPLICIT_CODES = {
  RPG_AC: ['AC5511', 'AC5690', 'AC6533', 'AC6761'],
  RPG_ACE: ['CA8004', 'CA8018', 'CA8028'],
  RPG_BME: ['BME8103', 'BME8122', 'BME8125', 'BME8127', 'BME8130', 'BME8131', 'BME8132'],
  RPG_BMS: ['BMS8101A', 'BMS8101B', 'BMS8101C', 'BMS8101D', 'BMS8102', 'BMS8103', 'BMS8105', 'BMS8106', 'BMS8107', 'BMS8110'],
  RPG_CAH: ['CAH8808', 'CAH5741', 'CLA5002'],
  RPG_CHEM: ['CHEM8007B', 'CHEM6134'],
  RPG_COM: ['COM5104', 'COM5105', 'COM5506'],
  RPG_CS: ['CS6382', 'CS6491', 'CS8692', 'CS8695'],
  RPG_DS: ['SDSC8007', 'SDSC8009', 'DSC6008', 'DSC6020', 'DSC6022'],
  RPG_E2: ['SEE8002', 'SEE8003', 'SEE8212'],
  RPG_EE: ['EE8001', 'EE8461', 'EE8462', 'EE5410', 'EE5435', 'EE6453', 'EE6624'],
  RPG_EF: ['EF8070', 'EF8090', 'EF5042', 'EF5052'],
  RPG_EN: ['EN8001', 'EN8002', 'EN8014', 'EN5315', 'EN5450'],
  RPG_IDPH: ['PH6201', 'PH8001', 'PH8002', 'PH8003', 'PH8004', 'PH8005', 'PH8006', 'PH8007', 'PH8008'],
  RPG_IS: ['IS6000', 'IS6400', 'IS6640'],
  RPG_LAW: ['LW6100E', 'LW6132E', 'LW6102E', 'LW6181E'],
  RPG_LT: ['LT8806', 'LT8807', 'LT8808', 'LT8809'],
  RPG_MATH: ['MA8004', 'MA8005', 'MA8006', 'MA8014', 'MA8019'],
  RPG_MGT: ['MGT8904', 'MGT8905', 'MGT8906', 'MGT8907', 'MGT5313', 'MGT6202', 'MGT6314'],
  RPG_MKT: ['MKT8630', 'MKT8631', 'MKT8632', 'MKT6614'],
  RPG_MNE: ['MNE8009', 'MNE8108', 'MNE8109', 'MNE8110', 'MNE8111', 'MNE8113', 'MNE8114', 'MNE8121', 'MNE8122'],
  RPG_MSE: ['MSE8001', 'MSE5301', 'MSE5303', 'MSE6183'],
  RPG_MS: ['MS8944', 'MS8945', 'MS8952', 'MS8953', 'MS8956'],
  RPG_NS: ['NS5001', 'NS5004', 'NS8002', 'NS6002'],
  RPG_PHY: ['PHY5503', 'PHY5504', 'PHY5505', 'PHY5506', 'PHY6502', 'PHY6603', 'PHY6604'],
  RPG_PIA: ['PIA5003', 'PIA6803', 'PIA6501', 'PIA6505'],
  RPG_SCM: ['SM8402', 'SM5358', 'SM6317'],
  RPG_SS: ['SS5790', 'SS5791', 'SS5792', 'SS5793'],
  RPG_SYE: ['ADSE8201', 'ADSE8202', 'SYE8202', 'SYE8204', 'SYE8205'],
  RPG_VCS: ['VCS8001', 'VCS8002', 'VCS8003A', 'VCS8003B', 'VCS8003C', 'VCS8003D'],
}

const RESEARCH_PREFIXES = {
  RPG_AC: ['AC'],
  RPG_ACE: [],
  RPG_BME: ['BME'],
  RPG_BMS: ['BMS', 'BIOS'],
  RPG_CAH: ['CAH', 'CLA'],
  RPG_CHEM: ['CHEM'],
  RPG_COM: ['COM', 'CLA'],
  RPG_CS: ['CS'],
  RPG_DS: ['SDSC', 'DSC'],
  RPG_E2: ['SEE'],
  RPG_EE: ['EE'],
  RPG_EF: ['EF'],
  RPG_EN: ['EN', 'CLA'],
  RPG_IDPH: ['PH'],
  RPG_IS: ['IS', 'EC'],
  RPG_LAW: ['LW'],
  RPG_LT: ['LT'],
  RPG_MATH: ['MA'],
  RPG_MGT: ['MGT'],
  RPG_MKT: ['MKT'],
  RPG_MNE: ['MNE'],
  RPG_MSE: ['MSE'],
  RPG_MS: ['MS'],
  RPG_NS: ['NS'],
  RPG_PHY: ['PHY'],
  RPG_PIA: ['PIA', 'POL', 'CLA'],
  RPG_SCM: ['SM'],
  RPG_SS: ['SS', 'CLA'],
  RPG_SYE: ['SYE', 'ADSE'],
  RPG_VCS: ['VCS', 'VSC'],
}

const RESEARCH_ADDITIONAL_DEPARTMENTS = {
  RPG_CAH: ['College of Liberal Arts and Social Sciences'],
  RPG_COM: ['College of Liberal Arts and Social Sciences'],
  RPG_EN: ['College of Liberal Arts and Social Sciences'],
  RPG_PIA: ['Department of Public Policy', 'College of Liberal Arts and Social Sciences'],
  RPG_SS: ['College of Liberal Arts and Social Sciences'],
}

function researchSourceUrl(seed) {
  const key = RESEARCH_PROGRAMME_SOURCE_KEYS[seed.code]
  return key ? RESEARCH_COURSE_SOURCES[key] : RESEARCH_COURSE_BASE_URL
}

function dedupeCodes(codes) {
  const seen = new Set()
  return codes.filter((code) => {
    if (!code || seen.has(code) || !pgCourses[code]) return false
    seen.add(code)
    return true
  })
}

function researchCandidateCodes(seed) {
  const prefixes = RESEARCH_PREFIXES[seed.code] ?? []
  const departments = new Set([seed.department, ...(RESEARCH_ADDITIONAL_DEPARTMENTS[seed.code] ?? [])])
  const fromCatalogue = Object.values(pgCourses)
    .filter((course) => !course.code.startsWith('SG'))
    .filter((course) => departments.has(course.department) || prefixes.some((prefix) => course.code.startsWith(prefix)))
    .map((course) => course.code)
    .sort((a, b) => a.localeCompare(b))

  return dedupeCodes([
    ...RESEARCH_COMMON_CODES,
    ...(RESEARCH_EXPLICIT_CODES[seed.code] ?? []),
    ...fromCatalogue,
  ])
}

function researchRefs(codes, sourceUrl, remarks = '') {
  return codes.map((code) => ({
    ...ref(code, { remarks }),
    sourceUrl,
  }))
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

const p52ConstructionManagementCurriculumUrl =
  'https://www.cityu.edu.hk/ace/-/media/project/cityuhk/academic/ace/home/master-of-science-in-construction-management_3.pdf?hash=84413C86D79B40732AA330E4DD3EC6FB&rev=cea1999488594ff18178683cbf7062c4'

const p60CivilArchitecturalEngineeringCurriculumUrl =
  'https://www.cityu.edu.hk/ace/-/media/project/cityuhk/academic/ace/home/master-of-science-in-civil-and-architectural-engineering_1.pdf?hash=348567DFAB92CC0D86E8CCB0F31ED822&rev=b485d1d7d1de4b69a951425ff1ccf7b3'

const CONFIRMED_CURRICULA = {
  P01A: {
    totalCredits: 40,
    titleOnly: true,
    curriculumUrl: 'http://embachinese.cb.cityu.edu.hk/',
    requirements: {
      summary: '40 credit units. The official Chinese EMBA admissions site links a programme brochure, but no course-by-course list or semester study plan is exposed in the readable official pages.',
      sections: [
        {
          key: 'official-brochure',
          title: 'Official programme requirement source',
          credits: 40,
          courses: [
            titleRef('P01A', 'Official Chinese EMBA programme brochure / admissions requirements', 40, {
              sourceUrl: 'http://embachinese.cb.cityu.edu.hk/doc/Brochure.pdf',
            }),
          ],
          note: 'Use this as a source marker only. The official page does not publish a structured course pool for DIY placement.',
        },
      ],
      notes: [
        'No official semester-by-semester plan is prefilled.',
        'Course-level EMBA Chinese requirements should be confirmed with the programme office before adding custom courses.',
      ],
    },
  },
  P01B: {
    totalCredits: 40,
    titleOnly: true,
    curriculumUrl: 'https://www.cb.cityu.edu.hk/emba_tsinghua-mpa/application/',
    requirements: {
      summary: '40 credit units. The official EMBA + MPA admissions pages identify the programme and booklets, but no structured CityUHK course list is exposed in the readable official pages.',
      sections: [
        {
          key: 'official-booklet',
          title: 'Official programme requirement source',
          credits: 40,
          courses: [
            titleRef('P01B', 'CityUHK EMBA + Tsinghua MPA admissions booklet', 40, {
              sourceUrl: 'https://www.cb.cityu.edu.hk/emba_tsinghua-mpa/application/',
            }),
          ],
          note: 'Use this as a source marker only. The official page links admissions booklets instead of a structured course pool.',
        },
      ],
      notes: [
        'No official semester-by-semester plan is prefilled.',
        'Do not substitute the English EMBA course pool unless the programme office confirms equivalence.',
      ],
    },
  },
  P11: {
    totalCredits: 40,
    titleOnly: true,
    curriculumUrl: 'https://mba.cb.cityu.edu.hk/full-time-mba/mba-curriculum',
    requirements: {
      summary: 'Minimum 40 credit units. The official MBA curriculum page lists core and elective course titles, but the public page does not expose catalogue course codes for every item.',
      sections: [
        {
          key: 'core',
          title: 'Core courses listed on official MBA curriculum page',
          credits: 19,
          courses: titleRefs('P11', [
            'MBA Orientation',
            'International Business Analytics and Decision Modelling',
            'Corporate Finance in Global Context',
            'Financial Reporting Analysis for International Business Decisions',
            'Artificial Intelligence in Business',
            'Information Systems for Managers in the Global Environment',
            'Managerial Decision Making',
            'Operations Management',
            'Principles of Marketing',
            'Strategic Management',
            'Digital Transformation and Innovation',
          ]),
        },
        {
          key: 'electives-projects',
          title: 'Electives / experiential courses listed on official MBA pages',
          courses: titleRefs('P11', [
            'Applications of Advanced Derivatives and AI in Finance',
            'Digital Marketing and e-Commerce',
            'Equity Capital Market Operation and Governance: A Global Perspective',
            'FinTech and Cryptocurrency',
            'Investment Analysis and Portfolio Management in a Global Framework',
            'Practical FinTech Applications',
            'AI and Blockchain Application in Business',
            'Project Management',
            'Sustainability in Business',
            'Hands-on AI Projects',
            'MBA Internship / Community Service',
            'MBA Project',
            'Entrepreneurship and Venture Plan Development',
            'Global Brand Management Workshop',
          ]),
          note: 'MBA concentration and elective availability can vary by mode and intake.',
        },
      ],
      notes: ['Official page gives a curriculum/course-title pool, not a fixed semester-by-semester plan.'],
    },
  },
  P88: {
    totalCredits: 36,
    curriculumUrl: 'https://www.cityu.edu.hk/svie/academy-of-innovation/msc-in-venture-creation',
    requirements: {
      summary: '36 credit units: 24 CU core, 6 CU core electives, and 6 CU electives, based on the official MSc Venture Creation programme structure.',
      sections: [
        {
          key: 'core',
          title: 'Core courses',
          credits: 24,
          courses: refs(['CAI6001', 'CAI6002', 'CAI6003', 'AC5813']),
        },
        {
          key: 'core-electives',
          title: 'Core electives',
          chooseCredits: 6,
          courses: refs(['MGT6325', 'IS5940', 'MKT5610', 'COM5406']),
        },
        {
          key: 'business-management-electives',
          title: 'Business / management electives',
          courses: refs(['MGT5507', 'MGT5205', 'MGT6202', 'MGT6324', 'MGT6310', 'MGT6314', 'IS6200', 'IS6620']),
        },
        {
          key: 'finance-governance-electives',
          title: 'Finance / governance electives',
          courses: refs(['AC6533', 'AC5690', 'IS5010', 'PIA6505']),
        },
        {
          key: 'marketing-electives',
          title: 'Marketing electives',
          courses: refs(['MKT5641', 'MKT5648', 'MKT5645', 'MKT5646', 'MKT5643']),
        },
        {
          key: 'sustainability-social-electives',
          title: 'Sustainability / social electives',
          courses: refs(['MGT6066', 'SEE6225', 'SEE5114', 'SEE6115', 'SEE6116', 'SEE6125', 'PIA5057', 'SS5753']),
        },
        {
          key: 'engineering-innovation-electives',
          title: 'Engineering / innovation electives',
          courses: refs(['SYE5009', 'SYE6047', 'SYE6053', 'SYE6103', 'SYE6110', 'SYE6012']),
        },
        {
          key: 'communication-electives',
          title: 'Communication / media electives',
          courses: refs(['COM5104', 'COM5105', 'COM5106', 'COM5111', 'COM5402', 'COM5405', 'COM5406', 'COM5408', 'COM5506', 'COM5510']),
        },
      ],
      notes: ['Official page says electives are subject to approval, resources and sufficient enrolment.'],
    },
  },
  P64: {
    totalCredits: 60,
    curriculumUrl: 'https://www.cityu.edu.hk/catalogue/pg/202122/programme/MUDP1.htm',
    requirements: {
      summary: '60 credit units: 24 CU core plus 36 CU electives. The current admissions page confirms the 24/36 structure; the structured course pool is taken from the official CityUHK catalogue programme record.',
      sections: [
        {
          key: 'core',
          title: 'Core courses',
          credits: 24,
          courses: refs(['CA5136', 'CA5137', 'CA5217', 'CA5240', 'CA6533']),
        },
        {
          key: 'electives',
          title: 'Elective courses',
          chooseCredits: 36,
          courses: refs([
            'CA5101', 'CA5104', 'CA5106', 'CA5108', 'CA5236', 'CA5603', 'CA6110', 'CA6120',
            'CA6138', 'CA6220', 'CA6232', 'CA6233', 'CA6241', 'CA6318', 'POL5701', 'POL5702',
            'POL5703', 'POL6805',
          ]),
          note: 'Students may take other ACE courses with programme leader approval.',
        },
      ],
      notes: [
        'No official semester-by-semester plan is prefilled.',
        'The 2026/27 admissions page summarizes the structure; students should confirm the current offered elective list before registration.',
      ],
    },
  },
  P82: {
    totalCredits: 60,
    curriculumUrl: 'https://www.cityu.edu.hk/catalogue/pg/202021/programme/MARCH1.htm',
    requirements: {
      summary: '60 credit units: 51 CU core plus 9 CU electives, based on the official CityUHK Master of Architecture catalogue programme record. No fixed semester plan is prefilled.',
      sections: [
        {
          key: 'themed-studio',
          title: 'Themed studio core',
          chooseCredits: 24,
          courses: refs(['CA5150', 'CA5152', 'CA5160', 'CA6162', 'CA6179', 'CA6183']),
          note: 'Official record says students must take at least three themed studios and only one themed studio per semester.',
        },
        {
          key: 'other-core',
          title: 'Other core courses',
          credits: 27,
          courses: refs(['CA5148', 'CA5159', 'CA5161', 'CA5301', 'CA6163', 'CA6164', 'CA6165', 'CA6200']),
        },
        {
          key: 'electives',
          title: 'Electives',
          chooseCredits: 9,
          courses: refs(['CA5147', 'CA5239', 'CA5696', 'CA6167', 'CA6242', 'CA6319', 'CA6609', 'CA6701']),
        },
      ],
      notes: [
        'No official semester-by-semester plan is prefilled.',
        'The public 2026/27 admissions page does not expose a full current course table; verify current offerings with ACE before registration.',
      ],
    },
  },
  P30: {
    totalCredits: 30,
    curriculumUrl: 'https://www.cityu.edu.hk/catalogue/pg/202526/programme/MALS.htm',
    requirements: {
      summary: '30 credit units: programme core, stream core, stream electives and free electives, based on the official 2025/26 PG catalogue.',
      sections: [
        {
          key: 'programme-core-a',
          title: 'Programme core Group A',
          chooseCredits: 3,
          courses: refs(['LT5903', 'LT5904']),
        },
        {
          key: 'programme-core-b',
          title: 'Programme core Group B',
          chooseCredits: 3,
          courses: refs(['LT6580', 'LT6582']),
          note: 'Students choose LT6582 Capstone Project or LT6580 Master\'s Project; total core CU depends on this choice.',
        },
        {
          key: 'general-linguistics-core',
          title: 'General Linguistics stream core',
          credits: 9,
          courses: refs(['LT5401', 'LT5402', 'LT5403']),
        },
        {
          key: 'corpus-empirical-core',
          title: 'Corpus and Empirical Linguistics stream core',
          credits: 9,
          courses: refs(['LT5406', 'LT5411', 'LT5421']),
        },
        {
          key: 'pedagogical-core',
          title: 'Pedagogical Linguistics stream core',
          credits: 9,
          courses: refs(['LT5407', 'LT5451', 'LT5458']),
        },
        {
          key: 'translation-core',
          title: 'Translation and Interpretation stream core',
          credits: 9,
          courses: refs(['LT5603', 'LT5604', 'LT5605']),
        },
        {
          key: 'stream-electives',
          title: 'Stream electives / free elective pool',
          chooseCredits: 15,
          courses: refs([
            'LT5417', 'LT5431', 'LT5454', 'LT5456', 'LT6422', 'LT6423', 'LT5457', 'LT5411',
            'LT5458', 'LT5510', 'LT5421', 'LT5416', 'LT5432', 'LT5451', 'LT5455', 'LT5406',
            'LT5407', 'LT5408', 'LT5430', 'LT5409', 'LT5413', 'LT5462', 'LT5199', 'LT5422',
            'LT5459', 'LT6421', 'LT5412', 'LT5418', 'LT5452', 'LT5460', 'LT5461', 'LT5420',
            'LT5453', 'LT5606', 'LT5601', 'LT5617', 'LT5627', 'LT5621', 'LT5633', 'LT5626',
            'LT5630', 'LT6505', 'LT6514', 'LT5628',
          ]),
        },
      ],
      notes: ['Official catalogue lists stream clusters and language/assessment medium remarks; students should confirm stream-specific constraints before DIY placement.'],
    },
  },
  P78: {
    totalCredits: 30,
    curriculumUrl: 'https://www.cityu.edu.hk/pia/page.aspx?p=MA_HUM',
    requirements: {
      summary: '30 credit units: 15 CU programme core, 12 CU stream core and 3 CU stream elective, based on the official PIA MAHUM programme structure.',
      sections: [
        {
          key: 'programme-core',
          title: 'Programme core courses',
          credits: 15,
          courses: refs(['PIA5701', 'PIA5702', 'PIA5703', 'PIA6803', 'PIA6804']),
        },
        {
          key: 'housing-stream-core',
          title: 'Housing Stream core courses',
          credits: 12,
          courses: refs(['LW5957', 'PIA5704', 'PIA6800', 'PIA6802']),
          note: 'LW5957 is listed by the official PIA page; catalogue detail matching may need checking.',
        },
        {
          key: 'urban-management-stream-core',
          title: 'Urban Management Stream core courses',
          credits: 12,
          courses: refs(['PIA5500', 'PIA5504', 'PIA5510', 'PIA6501']),
        },
        {
          key: 'stream-electives',
          title: 'Stream electives',
          chooseCredits: 3,
          courses: refs(['CA6220', 'COM5101', 'COM5106', 'COM5107', 'IS5540', 'LW6401', 'LW6405', 'MS5223', 'PIA5000', 'PIA5003', 'PIA5504']),
        },
      ],
      notes: ['Official page says students decide on the study stream at admission. Course offering time can vary by stream.'],
    },
  },
  P80: {
    totalCredits: 54,
    curriculumUrl: 'https://www.scm.cityu.edu.hk/en/programmes/postgraduate/mfacm',
    requirements: {
      summary: '54 credit units: 24 CU required/core courses and 30 CU electives, based on the official MFACM programme page and prospective-student curriculum.',
      sections: [
        {
          key: 'main-core',
          title: 'MFACM Main core courses',
          credits: 24,
          courses: refs(['SM5301', 'SM5302', 'SM6300', 'SM6302', 'SM5345', 'SM6333']),
        },
        {
          key: 'games-core',
          title: 'Games Stream core courses',
          credits: 24,
          courses: refs(['SM5301A', 'SM5302A', 'SM6300A', 'SM6302A', 'SM5350', 'SM5339']),
        },
        {
          key: 'hci-core',
          title: 'Human-Computer Interaction Stream core courses',
          credits: 24,
          courses: refs(['SM5301B', 'SM5302B', 'SM6300B', 'SM6302B', 'SM5354', 'SM5363']),
        },
        {
          key: 'electives',
          title: 'Elective courses',
          chooseCredits: 30,
          courses: refs([
            'SM5306', 'SM5307', 'SM5308', 'SM5312', 'SM5313', 'SM5315', 'SM5316', 'SM5317',
            'SM5318', 'SM5323', 'SM5332', 'SM5334', 'SM5335', 'SM5336', 'SM5343', 'SM5344',
            'SM5346', 'SM5347', 'SM5353', 'SM5358', 'SM5359', 'SM5360', 'SM5363', 'SM6305',
            'SM6310', 'SM6311', 'SM6316', 'SM6317', 'SM6319', 'SM6323', 'SM6324', 'SM6325',
            'SM6328', 'SM6332', 'SM6341', 'SM6342', 'SM6343', 'SM6344', 'SM6348', 'SM6351',
            'CS5182', 'CS5187', 'CS5188', 'EE5410', 'EE5437', 'EE5438', 'SYE6012', 'SYE6601',
          ]),
        },
      ],
      notes: ['Official page includes sample study path links, but no semester-by-semester sample is prefilled here.'],
    },
  },
  P81: {
    totalCredits: 30,
    curriculumUrl: 'https://www.scm.cityu.edu.hk/en/programmes/postgraduate/macm',
    requirements: {
      summary: '30 credit units: 12 CU stream core plus 18 CU electives, based on the official MACM programme page and prospective-student curriculum.',
      sections: [
        {
          key: 'technofutures-core',
          title: 'Technofutures: Theory and Culture Stream core',
          credits: 12,
          courses: refs(['SM5303', 'SM5325', 'SM6325', 'SM6333']),
        },
        {
          key: 'influencer-core',
          title: 'Influencer Studies Stream core',
          credits: 12,
          courses: refs(['SM5351', 'SM5352', 'SM6349', 'SM6350']),
        },
        {
          key: 'expanded-curation-core',
          title: 'Expanded Curation Stream core',
          credits: 12,
          courses: refs(['SM5348', 'SM5349', 'SM6346', 'SM6347']),
        },
        {
          key: 'electives',
          title: 'Elective courses',
          chooseCredits: 18,
          courses: refs([
            'SM5312', 'SM5313', 'SM5316', 'SM5329', 'SM5333', 'SM5344', 'SM6305', 'SM6316',
            'SM6322', 'SM6329', 'SM6331', 'SM6343', 'SM6348', 'SM6351', 'SM5318', 'SM5323',
            'SM5331', 'SM5335', 'SM5336', 'SM5337', 'SM5356', 'SM5357', 'SM6317', 'SM6323',
            'SM6344', 'SM5326', 'SM5327', 'SM5334', 'SM5339', 'SM5343', 'SM5355', 'SM5358',
            'SM5359', 'SM5360', 'SM6319', 'SM6324', 'SM6328', 'SM6332', 'SM6345',
          ]),
        },
      ],
      notes: ['Official MACM page describes concentrations for electives, not a fixed semester plan.'],
    },
  },
  P46: {
    totalCredits: 30,
    curriculumUrl: 'https://www.cityu.edu.hk/catalogue/pg/201920/programme/LLM3.htm',
    requirements: {
      summary: '24 credit units without foundation courses or 30 credit units with foundation courses. The current admissions page confirms streams; the structured course pool here is from an official CityUHK LLM catalogue record.',
      sections: [
        {
          key: 'foundation',
          title: 'Foundation / common law bridge for non-common-law LLB holders',
          chooseCredits: 3,
          courses: refs(['LW6102E', 'LW6181E']),
        },
        {
          key: 'chinese-comparative-law',
          title: 'Chinese and Comparative Law stream listed courses',
          chooseCredits: 15,
          courses: refs(['LW6115E', 'LW6121E', 'LW6122E', 'LW6129E', 'LW6134E', 'LW6136E', 'LW6138E', 'LW6140E', 'LW6141E', 'LW6161E', 'LW6169E', 'LW6172E', 'LW6187E']),
        },
        {
          key: 'international-economic-law',
          title: 'International Economic Law stream core/electives',
          chooseCredits: 24,
          courses: refs(['LW6142E', 'LW6144E', 'LW6143E', 'LW6145E', 'LW6160E', 'LW6167E', 'LW6173E', 'LW6180E']),
        },
        {
          key: 'common-law',
          title: 'Common Law stream core/electives',
          chooseCredits: 24,
          courses: refs(['LW5608', 'LW6164E', 'LW6165E', 'LW6102E', 'LW6181E']),
          note: 'The official record also lists JD/LLMArbDR exclusions and eligible electives; students should confirm current eligibility.',
        },
        {
          key: 'maritime-transportation-law',
          title: 'Maritime and Transportation Law stream core/electives',
          chooseCredits: 24,
          courses: refs(['LW6189E', 'LW6192E', 'LW6111E', 'LW6175E', 'LW6176E', 'LW6179E', 'LW6188E', 'LW6190E', 'LW6191E']),
        },
        {
          key: 'ip-technology-law',
          title: 'Intellectual Property and Technology Law stream core/electives',
          chooseCredits: 24,
          courses: refs(['LW6195E', 'LW6196E', 'LW6113E', 'LW6115E', 'LW6118E', 'LW6127E', 'LW6133E', 'LW6198E', 'LW6199E']),
        },
        {
          key: 'corporate-commercial-law',
          title: 'Corporate and Commercial Law stream listed courses',
          chooseCredits: 24,
          courses: refs(['LW6103E', 'LW6105E', 'LW6106E', 'LW6107E', 'LW6108E', 'LW6109E', 'LW6110E', 'LW6111E', 'LW6112E', 'LW6134E', 'LW6161E']),
        },
      ],
      notes: [
        'No official semester-by-semester plan is prefilled.',
        'The public 2026/27 admissions page points students to the LLM programme website; students should verify current stream electives and language modules with School of Law.',
      ],
    },
  },
  DBAC: {
    totalCredits: 57,
    titleOnly: true,
    curriculumUrl: 'https://www.cb.cityu.edu.hk/dba/chinese/programme/structure/',
    requirements: {
      summary: '57 credit units: 15 CU core, 12 CU electives and 30 CU doctoral thesis, based on the official Chinese DBA programme structure page.',
      sections: [
        {
          key: 'core',
          title: 'Core courses',
          credits: 15,
          courses: [
            titleRef('DBAC', 'Methodology for Applied Business Research I'),
            titleRef('DBAC', 'Methodology for Applied Business Research II'),
            titleRef('DBAC', 'Methodology for Applied Business Research III'),
            titleRef('DBAC', 'Residential Workshop I', 2),
            titleRef('DBAC', 'Residential Workshop II', 2),
            titleRef('DBAC', 'Residential Workshop III', 2),
          ],
        },
        {
          key: 'business-research-electives',
          title: 'Business research direction electives',
          chooseCredits: 12,
          courses: titleRefs('DBAC', [
            'Research in Finance',
            'Contemporary Issues on Management and Marketing Strategy',
            'Sociology Theories and Research Methods',
            'Global Advanced Management Field Study',
            'Directed Studies for DBA Participants',
          ]),
        },
        {
          key: 'sustainability-electives',
          title: 'Sustainability research direction electives',
          chooseCredits: 12,
          courses: titleRefs('DBAC', [
            'Introduction to ESG Principles',
            'Leadership and Sustainability',
            'Innovations in Sustainability Business',
            'Corporate Sustainability and Responsibility',
          ]),
        },
        {
          key: 'thesis',
          title: 'Thesis',
          credits: 30,
          courses: [titleRef('DBAC', 'Doctoral Thesis', 30)],
        },
      ],
      notes: ['Official Chinese DBA page gives a course/component structure, not a semester-by-semester plan.'],
    },
  },
  P52: {
    totalCredits: 30,
    curriculumUrl: p52ConstructionManagementCurriculumUrl,
    requirements: {
      summary: '30 credit units: Construction Project Management or Digital Construction Management stream. The official ACE PDF lists stream core courses and stream electives, but no fixed semester plan.',
      sections: [
        {
          key: 'cpm-core',
          title: 'Construction Project Management stream core',
          credits: 15,
          courses: refs(['CA5104', 'CA5106', 'CA6537']),
          note: 'The official PDF identifies 15 CU core for full-time students and 6 CU core for part-time students; CA6537 is required for full-time students.',
        },
        {
          key: 'cpm-electives',
          title: 'Construction Project Management stream electives',
          chooseCredits: 15,
          courses: refs([
            'CA5018', 'CA5101', 'CA5108', 'CA5217', 'CA5236', 'CA5603', 'CA6110', 'CA6120',
            'CA6232', 'CA6233', 'CA6318', 'CA6537',
          ]),
          note: 'Full-time students select 15 CU electives; part-time students select 24 CU. Students not taking CA6537 must take CA5603.',
        },
        {
          key: 'dcm-core',
          title: 'Digital Construction Management stream core',
          credits: 15,
          courses: refs(['CA5108', 'CA5563', 'CA6538']),
          note: 'The official PDF identifies CA6538 as required for full-time students in this stream.',
        },
        {
          key: 'dcm-electives',
          title: 'Digital Construction Management stream electives',
          chooseCredits: 15,
          courses: refs([
            'CA5018', 'CA5106', 'CA5252', 'CA5564', 'CA5603', 'CA6110', 'CA6220', 'CA6241',
            'CA6538', 'SEE6115', 'PIA5003',
          ]),
          note: 'Full-time students select 15 CU electives; part-time students select 24 CU. Students not taking CA6538 must take CA5603.',
        },
      ],
      notes: [
        'Official ACE PDF provides course pools by stream, not a semester-by-semester study plan.',
        'Some electives are cross-offered by SEE or PIA; students should confirm actual offering terms before DIY placement.',
      ],
    },
  },
  P60: {
    totalCredits: 30,
    curriculumUrl: p60CivilArchitecturalEngineeringCurriculumUrl,
    requirements: {
      summary: '30 credit units: Civil Engineering stream or Building Environment and Sustainability stream. The official ACE PDF lists stream core courses and electives, but no fixed semester plan.',
      sections: [
        {
          key: 'civil-core',
          title: 'Civil Engineering stream core',
          credits: 15,
          courses: refs(['CA5018', 'CA5244', 'CA6535']),
          note: 'The official PDF identifies 15 CU core for full-time students and 6 CU core for part-time students; CA6535 is core for full-time students.',
        },
        {
          key: 'civil-electives',
          title: 'Civil Engineering stream electives',
          chooseCredits: 15,
          courses: refs([
            'CA5106', 'CA5108', 'CA5217', 'CA5236', 'CA5601', 'CA5603', 'CA5693', 'CA6110',
            'CA6232', 'CA6535', 'CA6608', 'CA6694',
          ]),
          note: 'Full-time students select 15 CU electives; part-time students select 24 CU.',
        },
        {
          key: 'bes-core',
          title: 'Building Environment and Sustainability stream core',
          credits: 15,
          courses: refs(['CA5248', 'CA5249', 'CA6536']),
          note: 'The official PDF identifies CA6536 as core for full-time students in this stream.',
        },
        {
          key: 'bes-electives',
          title: 'Building Environment and Sustainability stream electives',
          chooseCredits: 15,
          courses: refs([
            'CA5018', 'CA5217', 'CA5250', 'CA5251', 'CA5252', 'CA6536', 'SEE5114', 'SEE6101',
            'SEE6102', 'SEE6115', 'PIA5711', 'PIA6502',
          ]),
          note: 'Full-time students select 15 CU electives; part-time students select 24 CU.',
        },
      ],
      notes: [
        'Official ACE PDF provides course pools by stream, not a semester-by-semester study plan.',
        'Some electives are cross-offered by SEE or PIA; students should confirm actual offering terms before DIY placement.',
      ],
    },
  },
  P66: {
    totalCredits: 30,
    curriculumUrl: 'https://www.cityu.edu.hk/pg/programme/program-list/2026/college-of-engineering/department-of-mechanical-engineering/p66',
    requirements: {
      summary: '30 credit units: either 4 stream core courses plus 6 elective taught courses, or 4 stream core courses plus dissertation and 3 elective taught courses.',
      sections: [
        {
          key: 'mechanical-stream-core',
          title: 'Mechanical Stream core courses',
          credits: 12,
          courses: refs(['MNE6110', 'MNE6113', 'MNE6116', 'MNE6125']),
        },
        {
          key: 'robotics-stream-core',
          title: 'Robotics Stream core courses',
          credits: 12,
          courses: refs(['MNE6007', 'MNE6116', 'MNE6126', 'MNE6130']),
        },
        {
          key: 'nuclear-stream-core',
          title: 'Nuclear Stream core courses',
          credits: 12,
          courses: refs(['MNE6116', 'MNE6131', 'MNE6132', 'MNE6138']),
        },
        {
          key: 'electives',
          title: 'Elective courses',
          chooseCredits: 18,
          courses: refs([
            'MNE5101', 'MNE5103', 'MNE5112', 'MNE6001', 'MNE6002', 'MNE6005', 'MNE6008', 'MNE6115',
            'MNE6119', 'MNE6124', 'MNE6127', 'MNE6128', 'MNE6129', 'MNE6133', 'MNE6134', 'MNE6135',
          ]),
          note: 'Students taking the dissertation path use MNE6008 plus 9 CU taught electives; otherwise select 18 CU taught electives.',
        },
      ],
      notes: ['Official programme page lists stream core courses and elective courses, not a fixed semester-by-semester plan.'],
    },
  },
  P58: {
    totalCredits: 30,
    titleOnly: true,
    curriculumUrl: 'https://www.cityu.edu.hk/pg/programme/program-list/2026/college-of-engineering/department-of-materials-science-and-engineering/p58',
    requirements: {
      summary: '30 credit units: 9 CU required courses plus 21 CU electives, based on the official MSc Materials Engineering and Nanotechnology course description.',
      sections: [
        {
          key: 'required',
          title: 'Required courses',
          credits: 9,
          courses: titleRefs('P58', [
            'Instrumentation for Materials Characterization',
            'Structure and Deformation of Materials',
            'Quantum Theory of Semiconductors',
          ]),
        },
        {
          key: 'electives',
          title: 'Elective courses',
          chooseCredits: 21,
          courses: titleRefs('P58', [
            'Thermodynamics of Materials',
            'Thin Film Technology and Nanocrystalline Coatings',
            'Nanomaterials Design for Energy Applications',
            'Photonics in Nanomaterial Systems and Devices',
            'Polymers and composites and nano-applications',
            'Computational Methods for Materials Science',
            'Biomedical Materials and Devices with Nano-applications',
            'Advanced Structural Materials',
            'Electrochemical Energy Storage',
            'Semiconductor Materials and Devices',
            'Corrosion and Surface Engineering',
            'Advanced Research',
            'Theory and Practice of TEM & Related Spectroscopy',
            'Structural Properties of Materials',
            'Kinetic and Thermodynamic Properties of Materials',
          ]),
        },
      ],
      notes: ['Official page lists course titles; catalogue course codes and assessment details still need matching.'],
    },
  },
  P50: {
    totalCredits: 30,
    titleOnly: true,
    curriculumUrl: 'https://www.cityu.edu.hk/pg/programme/program-list/2026/college-of-science/department-of-physics/p50',
    requirements: {
      summary: '30 credit units: 12 CU core plus 18 CU electives, based on the official MSc Physics course description.',
      sections: [
        {
          key: 'core',
          title: 'Core courses',
          credits: 12,
          courses: titleRefs('P50', [
            'Introduction to Quantum Technology',
            'Data Acquisition and Processing Skills for Physicists I',
            'Machine Learning in Physics',
            'Modern Topics in Physics',
          ]),
        },
        {
          key: 'electives',
          title: 'Elective courses',
          chooseCredits: 18,
          courses: titleRefs('P50', [
            'Modern Characterization Techniques for Materials Physics',
            'Frontiers in Physics',
            'Data Acquisition and Processing Skills for Physicists II',
            'Data Analysis and Modelling in Physics',
            'Physical Methods in Financial Data Modelling',
            'Modern Scattering Methods in Materials Science',
            'Advanced Quantum Mechanics',
            'Statistical Mechanics',
            'Introduction to Biophysics',
            'Introduction to Quantum Optics',
            'Advanced Instrumentation and Measurement Methods for Experimental Physics',
            'Advanced Computational Methods for Simulation and Modelling',
            'Mathematical Methods for Scientists and Engineers',
            'Physics at Nanoscale',
            'Advanced Electrodynamics',
            'Advanced Solid State Physics',
            'Energy Materials: Physics and Applications',
            'Introduction to Quantum Information',
            'Advanced Research in Physics',
          ]),
        },
      ],
      notes: ['Official page lists course titles; catalogue course codes and assessment details still need matching.'],
    },
  },
  P20: {
    totalCredits: 30,
    curriculumUrl: 'https://www.cityu.edu.hk/pg/programme/program-list/2026/college-of-liberal-arts-and-social-sciences/department-of-social-and-behavioural-sciences/p20',
    requirements: {
      summary: '30 credit units: programme core, either project/practicum completion, plus 6 CU electives, based on the official MSocSc Counselling programme structure.',
      sections: [
        {
          key: 'programme-core',
          title: 'Programme core courses',
          credits: 18,
          courses: refs(['SS5800', 'SS5801', 'SS5802', 'SS5803', 'SS5822', 'SS5841']),
        },
        {
          key: 'project-practicum',
          title: 'Project / practicum completion options',
          chooseCredits: 6,
          courses: refs(['SS6805', 'SS6805B', 'SS6806']),
          note: 'Official page says students complete either Project or Counselling Practicum; mode and eligibility differ for full-time and part-time students.',
        },
        {
          key: 'general-electives',
          title: 'General electives',
          chooseCredits: 6,
          courses: refs(['SS5208', 'SS5216', 'SS5430', 'SS5752', 'SS5757', 'SS5805']),
        },
        {
          key: 'research-methods',
          title: 'Research methods elective',
          courses: refs(['SS5302']),
          note: 'SS5302 is co-/pre-requisite for project options as described on the official page.',
        },
        {
          key: 'specialized-electives',
          title: 'Specialized electives',
          courses: refs(['SS5110', 'SS5316', 'SS5814', 'SS5821', 'SS5832']),
        },
      ],
      notes: ['Official page says electives are subject to review.'],
    },
  },
  P71: {
    totalCredits: 55,
    curriculumUrl: 'https://www.cityu.edu.hk/pg/programme/program-list/2026/college-of-liberal-arts-and-social-sciences/department-of-social-and-behavioural-sciences/p71',
    requirements: {
      summary: '55 credit units: 49 CU core plus 6 CU electives, based on the official Master of Social Work programme requirement.',
      sections: [
        {
          key: 'core',
          title: 'Core courses',
          credits: 49,
          courses: refs([
            'SS5111', 'SS5112', 'SS5114', 'SS5117', 'SS5209', 'SS5210', 'SS5211', 'SS5212', 'SS5213',
            'SS6219', 'SS6220', 'SS6221', 'SS6291', 'SS6292', 'SS6293',
          ]),
        },
        {
          key: 'electives',
          title: 'Electives',
          chooseCredits: 6,
          courses: refs(['SS5110', 'SS5115', 'SS5208', 'SS5215', 'SS5216', 'SS5802', 'SS5803', 'SS5821', 'SS5832']),
          note: 'SS5115 is a 0-CU core elective for students without a social sciences background.',
        },
      ],
      notes: ['Official page says electives are subject to University review.'],
    },
  },
  P76: {
    totalCredits: 30,
    curriculumUrl: 'https://www.cityu.edu.hk/pg/programme/program-list/2026/college-of-liberal-arts-and-social-sciences/department-of-social-and-behavioural-sciences/p76',
    requirements: {
      summary: '30 credit units: common psychology core/capstone plus 9 CU from either Applied Psychology or Education stream.',
      sections: [
        {
          key: 'common-core',
          title: 'Common core courses',
          credits: 18,
          courses: refs(['SS5750', 'SS5752', 'SS5753', 'SS5756', 'SS5757', 'SS5783']),
        },
        {
          key: 'capstone-options',
          title: 'Capstone / dissertation options',
          chooseCredits: 3,
          courses: refs(['SS5799', 'SS5798B']),
          note: 'Official page states students take either SS5799 Capstone Project or SS5798B Dissertation, with dissertation subject to approval.',
        },
        {
          key: 'applied-psychology-stream',
          title: 'Applied Psychology Stream courses',
          chooseCredits: 9,
          courses: refs(['SS5755', 'SS5782', 'SS5791', 'SS5794']),
        },
        {
          key: 'education-stream',
          title: 'Education Stream courses',
          chooseCredits: 9,
          courses: refs(['SS5751', 'SS5758', 'SS5759', 'SS5763']),
        },
      ],
      notes: ['The official page also discusses a non-programme make-up course for applicants without prior psychology background.'],
    },
  },
  P77: {
    totalCredits: 30,
    curriculumUrl: 'https://www.cityu.edu.hk/pg/programme/program-list/2026/college-of-liberal-arts-and-social-sciences/department-of-social-and-behavioural-sciences/p77',
    requirements: {
      summary: '30 credit units in one selected stream: Sociology, Criminology, or Clinical Mental Health Practice, based on the official MA Applied Social Sciences programme structure.',
      sections: [
        {
          key: 'sociology-programme-core',
          title: 'Sociology stream programme core',
          credits: 6,
          courses: refs(['SS5302', 'SS5426']),
        },
        {
          key: 'sociology-stream-core',
          title: 'Sociology stream core',
          credits: 18,
          courses: refs(['SS5400', 'SS5401', 'SS5423', 'SS5428', 'SS6591']),
        },
        {
          key: 'sociology-electives',
          title: 'Sociology stream electives',
          chooseCredits: 6,
          courses: refs(['SS5204', 'SS5303', 'SS5304', 'SS5305', 'SS5316', 'SS5427']),
        },
        {
          key: 'criminology-programme-core',
          title: 'Criminology stream programme core',
          credits: 6,
          courses: refs(['SS5302', 'SS5426']),
        },
        {
          key: 'criminology-stream-core',
          title: 'Criminology stream core',
          credits: 21,
          courses: refs(['SS5204', 'SS5301', 'SS5303', 'SS5304', 'SS5305', 'SS6308']),
        },
        {
          key: 'criminology-electives',
          title: 'Criminology stream electives',
          chooseCredits: 3,
          courses: refs(['SS5316', 'SS5423', 'SS5424', 'SS5427', 'SS5428']),
        },
        {
          key: 'clinical-mental-health-programme-core',
          title: 'Clinical Mental Health Practice stream programme core',
          credits: 6,
          courses: refs(['SS5803', 'SS5837']),
        },
        {
          key: 'clinical-mental-health-stream-core',
          title: 'Clinical Mental Health Practice stream core',
          credits: 18,
          courses: refs(['SS5110', 'SS5836', 'SS5838', 'SS5839', 'SS5840', 'SS6404']),
        },
        {
          key: 'clinical-mental-health-electives',
          title: 'Clinical Mental Health Practice stream electives',
          chooseCredits: 6,
          courses: refs(['SS5208', 'SS5216', 'SS5801', 'SS5825']),
        },
      ],
      notes: ['Official page says students select one stream and electives are subject to University review.'],
    },
  },
  P25: {
    totalCredits: 30,
    titleOnly: true,
    curriculumUrl: 'https://www.cityu.edu.hk/pg/programme/program-list/2026/college-of-liberal-arts-and-social-sciences/department-of-media-and-communication/p25',
    requirements: {
      summary: '30 credit units: 12 CU programme core, 9 CU stream compulsory courses, and 9 CU stream electives. The official page lists core and stream compulsory course titles.',
      sections: [
        {
          key: 'programme-core',
          title: 'Programme core courses for all streams',
          credits: 12,
          courses: titleRefs('P25', [
            'Communication Fundamentals',
            'Research Methods for Communication and New Media',
            'Internet Communication',
            'Capstone Project',
          ]),
        },
        {
          key: 'media-data-analytics-stream',
          title: 'Media Data Analytics stream compulsory courses',
          credits: 9,
          courses: titleRefs('P25', [
            'Media Data Analytics',
            'Social Network Analysis for Communication',
            'Social Media Data Acquisition and Processing',
          ]),
        },
        {
          key: 'digital-media-stream',
          title: 'Digital Media stream compulsory courses',
          credits: 9,
          courses: titleRefs('P25', [
            'Global Media in the Digital Era',
            'Policy and Regulations of New Media',
            'Psychological Processing of New Media',
          ]),
        },
      ],
      notes: ['Official page confirms a 9 CU stream elective component, but the visible programme page does not list those elective course titles.'],
    },
  },
  P27: {
    totalCredits: 36,
    titleOnly: true,
    curriculumUrl: 'https://www.cityu.edu.hk/pg/programme/program-list/2026/college-of-liberal-arts-and-social-sciences/department-of-public-and-international-affairs/p27',
    requirements: {
      summary: '36 credit units: 18 CU programme core, 12 CU stream core, 3 CU experiential learning elective and 3 CU research elective.',
      sections: [
        {
          key: 'programme-core',
          title: 'Programme core courses',
          credits: 18,
          courses: titleRefs('P27', [
            'Theories of Government and Public Administration',
            'Managing Public Institutions and Organizations',
            'Values and Choice in Public Policy',
            'Policy Processes and Analysis',
            'Research Methods in Public Policy and Management',
            'Statistical Analysis for Public Policy and Management',
          ]),
        },
        {
          key: 'public-policy-stream',
          title: 'Public Policy Stream',
          chooseCredits: 12,
          courses: titleRefs('P27', [
            'Comparative Public Policy',
            'Evidence-based Policy and Practice',
            'Behavioral Insights in Public Policy',
            'Practice in Public Policy',
          ]),
        },
        {
          key: 'public-management-stream',
          title: 'Public Management Stream',
          chooseCredits: 12,
          courses: titleRefs('P27', [
            'Public Budgeting and the Management of Financial Resources',
            'Comparative Public Sector Management',
            'Public Strategic Planning and Management',
            'Public Human Resource Management',
            'Practice in Public Management',
          ]),
          note: 'Official page says the Department decides which four courses are offered each academic year.',
        },
        {
          key: 'smart-cities-stream',
          title: 'Smart Cities Stream',
          chooseCredits: 12,
          courses: titleRefs('P27', [
            'The Asian Metropolis: Issues in Urban Management',
            'The Urban Management Workshop: Exploring the Contemporary City',
            'Understanding and Managing Smart Cities',
            'Data Analytics for Public Policy and Management',
            'Urban Development and Sustainable Cities',
            'Practice in Smart Cities Management',
            'Environmental Energy and Policy',
          ]),
          note: 'Official page says the Department decides which four courses are offered each academic year.',
        },
        {
          key: 'governance-in-china-stream',
          title: 'Governance in China Stream',
          chooseCredits: 12,
          courses: titleRefs('P27', [
            'Key Issues in Chinese Politics',
            'State and Market in China',
            'Environmental Governance in China',
            'Governance in the Greater China Region',
          ]),
        },
        {
          key: 'experiential-learning',
          title: 'Experiential Learning Elective',
          credits: 3,
          courses: titleRefs('P27', ['PIA Postgraduate Internship', 'MAPPM Action Report', 'MAPPM Overseas Study']),
        },
      ],
      notes: ['Official page describes a 3 CU research elective/capstone component, but does not expose a specific course-title list for it.'],
    },
  },
  P34: {
    totalCredits: 30,
    titleOnly: true,
    curriculumUrl: 'https://www.cityu.edu.hk/pg/programme/program-list/2026/college-of-liberal-arts-and-social-sciences/department-of-chinese-and-history/p34',
    requirements: {
      summary: '30 credit units: 3 CU programme core plus 27 CU stream courses, based on the official MA Chinese and History course description.',
      sections: [
        {
          key: 'programme-core',
          title: 'Programme core course',
          credits: 3,
          courses: titleRefs('P34', ['Essential Concepts in Chinese Culture']),
        },
        {
          key: 'chinese-language-literature-core',
          title: 'Chinese Language and Literature stream core',
          credits: 9,
          courses: titleRefs('P34', [
            'Classical Chinese Literature',
            'Modern and Contemporary Chinese Literature',
            'Capstone Project in Chinese Language and Literature',
          ]),
        },
        {
          key: 'history-cultural-heritage-core',
          title: 'Chinese History / Chinese History and Cultural Heritage stream core',
          credits: 9,
          courses: titleRefs('P34', [
            'History and Historical Sources in a Changing World',
            'Cultural Heritage Theories and Practices in China',
            'Capstone Project in Chinese History and Cultural Heritage',
          ]),
        },
        {
          key: 'chinese-language-literature-electives',
          title: 'Chinese Language and Literature stream electives',
          chooseCredits: 18,
          courses: titleRefs('P34', [
            'Selected Readings in Chinese Language and Literature',
            'Chinese Documentology',
            'Chinese Literary Criticism',
            'Classical Chinese Philology',
            'Great Works of Chinese Literature, History and Philosophy',
            'Chinese Creative Writing',
            'Special Topics in Hong Kong Literature and Culture',
            'Gender Perspective on Chinese Literature',
            'Special Topics in Chinese Literature and Religion',
            'Chinese Literature and Fine Arts',
            'Theories for Understanding Contemporary Chinese-language Fiction',
            'Historical Narrative in Chinese Literature and History Writing',
            'Special Topics in Chinese-language Film and Fiction',
            'Master\'s Dissertation',
            'Seminar on Chinese for Professional Purposes',
          ]),
        },
        {
          key: 'history-cultural-heritage-electives',
          title: 'Chinese History / Chinese History and Cultural Heritage stream electives',
          chooseCredits: 18,
          courses: titleRefs('P34', [
            'Selected Readings in Sinology',
            'Chinese Written Characters, Literary Chinese, and East Asian History',
            'Writing for Museum Professional',
            'Chinese Art Criticism and Education',
            'Cantonese Opera: Texts and Performance',
            'Museum Studies in China',
            'Archaeology and Civilization of Early China',
            'Chinese Architecture, Gardens and World Heritage',
            'Hong Kong\'s Urban Landscape and Heritage Preservation',
            'Modern China and Hong Kong',
            'History of Chinese Buddhist Thought',
            'Cultural History of Medicine in China',
            'Chinese Cultural History',
            'From Lingnan to the Greater Bay Area',
            'The Silk Road and the History of China\'s Foreign Relations',
            'Cultural and Creative Industries in Greater China',
            'Master\'s Dissertation',
          ]),
        },
      ],
      notes: ['Official page lists course titles; catalogue course codes and assessment details still need matching.'],
    },
  },
  P37: {
    totalCredits: 30,
    titleOnly: true,
    curriculumUrl: 'https://www.cityu.edu.hk/pg/programme/program-list/2026/college-of-liberal-arts-and-social-sciences/department-of-public-and-international-affairs/p37',
    requirements: {
      summary: '30 credit units: 12 CU programme core, 15 CU stream core and 3 CU programme elective.',
      sections: [
        {
          key: 'programme-core',
          title: 'Programme core courses',
          credits: 12,
          courses: titleRefs('P37', [
            'Theories and Approaches in Development Studies',
            'Sustainability Infrastructures and Measurements',
            'Sustainable Development: Theories and Policy',
            'Capstone Project or Master\'s Thesis',
          ]),
        },
        {
          key: 'development-challenges-stream',
          title: 'Development Challenges Stream core courses',
          chooseCredits: 15,
          courses: titleRefs('P37', [
            'Authoritarian Resilience and Democratic Change in East Asia',
            'Environmental Challenges in Asia and the World',
            'China and the Developing World',
            'Politics and Social Movements in Developing Asia',
            'Comparative Development in Asia',
            'Cutting-edge Cases in Development under Late Capitalism',
          ]),
          note: 'Official page says the Department decides which four stream courses are offered each academic year.',
        },
        {
          key: 'sustainability-strategies-policies-stream',
          title: 'Sustainability Strategies and Policies Stream core courses',
          chooseCredits: 15,
          courses: titleRefs('P37', [
            'Collaborative Governance for Sustainability',
            'Food Governance and Sustainability',
            'Managing Sustainable Development',
            'Labour, Sustainability and Development',
            'Urban Development and Sustainable Cities',
            'Financing Sustainability: Policy and Mechanism',
          ]),
          note: 'Official page says the Department decides which four stream courses are offered each academic year.',
        },
        {
          key: 'programme-electives',
          title: 'Programme electives',
          chooseCredits: 3,
          courses: titleRefs('P37', [
            'Urban Design and Regional Planning History, Theory and Practice',
            'Energy Management for Building Sustainability',
            'Renewable Energy for a Sustainable Building Performance',
            'Sustainable Building Development',
            'Project Planning and Management for Development',
            'Research Design for the Social Sciences',
            'Women and Politics in Asia',
            'Understanding and Managing Smart Cities',
            'Environmental Governance in China',
            'Evidence-based Policy and Practice',
          ]),
        },
      ],
      notes: ['Official page lists course titles; catalogue course codes and assessment details still need matching.'],
    },
  },
  P38: {
    totalCredits: 24,
    titleOnly: true,
    curriculumUrl: 'https://www.cityu.edu.hk/pg/programme/program-list/2026/college-of-liberal-arts-and-social-sciences/department-of-public-and-international-affairs/p38',
    requirements: {
      summary: 'Core courses plus up to three electives from the official MA International Studies elective pool.',
      sections: [
        {
          key: 'core',
          title: 'Core courses',
          courses: titleRefs('P38', [
            'Asian Regional Governance',
            'International Political Economy',
            'Theory in International Studies',
            'International Relations of Northeast Asia',
            'Master\'s Thesis or Capstone Project',
          ]),
        },
        {
          key: 'electives',
          title: 'Electives',
          chooseCredits: 9,
          courses: titleRefs('P38', [
            'Research Design for the Social Sciences',
            'Security Studies',
            'Authoritarian Resilience and Democratic Change in East Asia',
            'Environmental Challenges in Asia and the World',
            'Human Rights in Asia',
            'BRIC Countries and the Emerging Global Order',
            'Special Topics in Asian and International Studies',
            'Religion and Development',
            'International Organisations',
            'Women and Politics in Asia',
            'Development Policy and Advocacy',
            'Gender and Development',
            'Indonesia: Politics and Society',
            'Labour, Sustainability and Development',
            'Infrastructure Development in China',
            'Collaborative Governance for Sustainability',
            'Food Governance and Sustainability',
            'Key Issues in Chinese Politics',
            'Environmental Governance in China',
          ]),
          note: 'Official page says elective availability is subject to offering.',
        },
      ],
      notes: ['Official page lists course titles; catalogue course codes and assessment details still need matching.'],
    },
  },
  P39: {
    totalCredits: 30,
    titleOnly: true,
    curriculumUrl: 'https://www.cityu.edu.hk/pg/programme/program-list/2026/college-of-liberal-arts-and-social-sciences/department-of-media-and-communication/p39',
    requirements: {
      summary: '30 credit units: 21 CU core plus 9 CU electives, based on the official MA Integrated Marketing Communication course description.',
      sections: [
        {
          key: 'core',
          title: 'Core courses',
          credits: 21,
          courses: titleRefs('P39', [
            'Research Methods for Communication and New Media',
            'Integrated Marketing Communication',
            'Advertising Production and Management',
            'Public Relations Strategies',
            'Crisis Communication and Management',
            'Consumer Behavior Insight',
            'Capstone Project',
          ]),
        },
        {
          key: 'electives',
          title: 'Electives',
          chooseCredits: 9,
          courses: titleRefs('P39', [
            'Global Media in the Digital Era',
            'Psychological Processing of New Media',
            'Public Communication Campaign Management',
            'AI and Digital Marketing for Entrepreneurs',
            'Communication Research Seminar',
            'Stakeholders Relationship Management',
            'Entrepreneurship and Business Planning',
            'Financial Communication and Promotion',
            'Global Promotion and Branding',
            'Multimedia Communication',
            'Dynamic Web Communication',
            'Advanced Multimedia Communication',
            'Digital Media for E-marketing',
            'Social Network Analysis for Communication',
            'Social Media Data Acquisition and Processing',
            'Digital Visual Media',
            'Introduction to Artificial Intelligence',
            'Social Media Influencer',
            'Human-AI Communication Workshop',
            'AI Communication Ethics and Governance',
            'Mobile Communication and Apps Design',
            'Directed Studies',
            'Dissertation',
            'Professional Internship',
            'Multimedia Practicum',
          ]),
        },
      ],
      notes: ['Official page lists course titles; catalogue course codes and assessment details still need matching.'],
    },
  },
  P40: {
    totalCredits: 27,
    titleOnly: true,
    curriculumUrl: 'https://www.cityu.edu.hk/pg/programme/program-list/2026/college-of-liberal-arts-and-social-sciences/department-of-english/p40',
    requirements: {
      summary: 'MA English Studies offers General Track, TESL stream and LLC stream. Official page lists core, compulsory stream courses and elective pools by track.',
      sections: [
        {
          key: 'common-core-options',
          title: 'Common core / completion options',
          courses: titleRefs('P40', [
            'Language in Its Social Context',
            'Survey of Literary Genres',
            'Dissertation',
            'Capstone Project',
          ]),
        },
        {
          key: 'tesl-compulsory',
          title: 'TESL compulsory courses',
          courses: titleRefs('P40', ['Approaches to Language Teaching', 'Second Language Acquisition']),
        },
        {
          key: 'llc-compulsory',
          title: 'LLC compulsory courses',
          courses: titleRefs('P40', ['Critical Approaches to Literature', 'World Literatures in English']),
        },
        {
          key: 'electives',
          title: 'Electives across tracks',
          courses: titleRefs('P40', [
            'Analysing Specialised Texts for Applied Purposes',
            'Approaches to Language Teaching',
            'Asian and Asian Diaspora Literature in English',
            'Critical Approaches to Literature',
            'Corpus Linguistics in English Studies',
            'Curriculum Design in Language Studies',
            'Discourse Analysis',
            'Discourse, Ideology and Power',
            'English for Academic Research in English Studies',
            'English Phonetics and Phonology',
            'Fantasy and Literature',
            'English Grammar',
            'Literature and the City',
            'Modern and Contemporary Drama',
            'New Literacies and Language Learning',
            'Research Methods in English Studies',
            'Second Language Acquisition',
            'Special Topics in English Studies',
            'Spoken Language Interactivity',
            'Studies in Literature and Film',
            'Studies in Short Fiction',
            'Teaching and Learning through English as a Medium of Instruction',
            'Teaching English for Academic Purposes',
            'Testing and Evaluation in Language Studies',
            'The Graphic Novel',
            'Travel Writing',
            'World Literatures in English',
          ]),
        },
      ],
      notes: ['Official page lists course titles; catalogue course codes and assessment details still need matching.'],
    },
  },
  P41: {
    titleOnly: true,
    curriculumUrl: 'https://www.cityu.edu.hk/pg/programme/program-list/2026/school-of-law/school-of-law/p41',
    requirements: {
      summary: 'The official LLMArbDR page lists taught courses, approved elective requirements, and dissertation/equivalent research requirement.',
      sections: [
        {
          key: 'taught-courses',
          title: 'Taught courses listed on official page',
          courses: titleRefs('P41', [
            'Legal Concepts',
            'Commercial Contracts',
            'Procedure and Proof',
            'Dispute Resolution in Theory and Practice',
            'Mediation Practice',
            'Arbitration Law',
            'Arbitration Practice and Award Writing',
            'International Arbitration',
          ]),
        },
        {
          key: 'research-component',
          title: 'Research component',
          courses: titleRefs('P41', ['Dissertation or equivalent independent scholarly research']),
        },
      ],
      notes: [
        'Official page states students take electives from an approved list, but the visible page does not list all approved elective titles.',
        'Students with relevant law qualifications may be exempted from Commercial Contracts and Legal Concepts.',
      ],
    },
  },
  P12: {
    totalCredits: 40,
    curriculumUrl: 'https://www.cityu.edu.hk/pg/programme/program-list/2026/college-of-business/college-of-business/p12',
    requirements: {
      summary: 'Minimum 40 credit units: residential courses, online courses, global learning tours and electives, based on the official EMBA programme content.',
      sections: [
        {
          key: 'residential-courses',
          title: 'Residential courses',
          chooseCredits: 16,
          courses: refs(['FB6890', 'FB6891', 'FB6892', 'FB6893', 'FB6894', 'FB6895', 'FB6896', 'FB6897', 'FB6898', 'FB6878']),
          note: 'Official page marks FB6890 as compulsory; each residential course carries 4 CU.',
        },
        {
          key: 'online-courses',
          title: 'Online courses',
          chooseCredits: 8,
          courses: refs(['FB6931', 'FB6932', 'FB6933', 'FB6934', 'FB6935', 'FB6936', 'FB6937']),
          note: 'Each online course carries 2 CU.',
        },
        {
          key: 'global-learning-tours',
          title: 'Global learning tours',
          chooseCredits: 4,
          courses: refs(['FB6801', 'FB6802', 'FB6803', 'FB6804']),
          note: 'Each global learning tour course carries 4 CU.',
        },
        {
          key: 'electives',
          title: 'Elective courses',
          courses: refs([
            'FB6873', 'FB6874', 'FB6875', 'FB6876', 'FB6877', 'FB6938', 'FB6939', 'FB6941',
            'FB6943', 'FB6944', 'FB6945', 'FB6812', 'FB8001D', 'FB8002D', 'FB8004D',
          ]),
          note: 'Official page also allows existing College of Business master\'s courses. DBA pathway participants should take FB6812, FB8001D, FB8002D and FB8004D.',
        },
      ],
      notes: ['Official page provides the course pool and minimum credit units, not a fixed semester-by-semester plan.'],
    },
  },
  P67: {
    totalCredits: 30,
    curriculumUrl: 'https://www.cityu.edu.hk/pg/programme/program-list/2026/college-of-science/department-of-chemistry/p67',
    requirements: {
      summary: '30 credit units: 15 CU core plus 15 CU electives, based on the official MSc Chemistry course description.',
      sections: [
        {
          key: 'core',
          title: 'Core courses',
          credits: 15,
          courses: refs(['CHEM6118', 'CHEM6119', 'CHEM6121', 'CHEM6125', 'CHEM6126']),
        },
        {
          key: 'electives-group-a',
          title: 'Elective courses: Group A',
          chooseCredits: 6,
          courses: refs(['CHEM6127', 'CHEM6129']),
          note: 'Official page says students take at least 6 CU from Group A. CHEM6127 dissertation is 14 CU and requires approval.',
        },
        {
          key: 'electives-group-b',
          title: 'Elective courses: Group B',
          courses: refs(['CHEM6114', 'CHEM6123', 'CHEM6128', 'CHEM6130', 'CHEM6131', 'CHEM6132', 'CHEM6133', 'CHEM6134']),
        },
      ],
      notes: ['Official page states some research-heavy options have approval, CGPA or quota requirements.'],
    },
  },
  P68: {
    totalCredits: 30,
    titleOnly: true,
    curriculumUrl: 'https://www.cityu.edu.hk/pg/programme/program-list/2026/college-of-science/department-of-mathematics/p68',
    requirements: {
      summary: 'Minimum 30 or 31 credit units: 15 CU core plus 15 or 16 CU electives, based on the official MSc Financial Mathematics and Statistics course description.',
      sections: [
        {
          key: 'core',
          title: 'Core courses',
          credits: 15,
          courses: titleRefs('P68', [
            'Financial Mathematics in Derivative Markets',
            'Statistical Data Analysis',
            'Stochastic Analysis in Finance',
            'Advanced Stochastic Analysis in Finance',
            'Statistical Modelling for Data Mining',
          ]),
        },
        {
          key: 'electives',
          title: 'Electives',
          chooseCredits: 15,
          courses: titleRefs('P68', [
            'Applied Partial Differential Equations',
            'Numerical Partial Differential Equations',
            'Project',
            'Dissertation',
            'Statistical Methods and Calibration in Finance and Actuarial Science',
            'Stochastic Interest Rate Models',
            'Programming and Computing in Financial Engineering',
            'Introduction to Statistical Learning',
            'Special Topics',
            'Statistical Analysis of Financial Big Data',
            'Reinforcement Learning and Its Applications in Finance',
            'Times Series Analysis',
            'Corporate Finance',
            'Credit Risk Management',
          ]),
        },
      ],
      notes: ['Official page lists course titles; catalogue course codes and assessment details still need matching. Course offering is subject to host department decision.'],
    },
  },
  P92: {
    totalCredits: 30,
    curriculumUrl: 'https://www.cityu.edu.hk/pg/programme/program-list/2026/college-of-liberal-arts-and-social-sciences/college-of-liberal-arts-and-social-sciences/p92',
    requirements: {
      summary: '30 credit units: 21 CU core, 6 CU electives from different groups, and 3 CU experiential learning.',
      sections: [
        {
          key: 'core',
          title: 'Core courses',
          credits: 21,
          courses: refs(['CLA5001', 'CLA5002', 'CLA5003', 'CLA5004', 'CLA5005', 'CLA5006', 'CLA5007']),
        },
        {
          key: 'elective-group-1',
          title: 'Elective Group 1',
          courses: refs(['CLA5008', 'COM5110', 'COM5402']),
        },
        {
          key: 'elective-group-2',
          title: 'Elective Group 2',
          courses: refs(['CLA5009', 'CAH5741']),
        },
        {
          key: 'elective-group-3',
          title: 'Elective Group 3',
          courses: refs(['CLA5010']),
        },
        {
          key: 'experiential-learning',
          title: 'Experiential Learning',
          chooseCredits: 3,
          courses: refs(['CLA5011', 'CLA5012']),
        },
      ],
      notes: ['Official page says students choose two elective courses from different groups; COM/CAH offerings and quotas depend on the respective departments.'],
    },
  },
  P96: {
    totalCredits: 30,
    curriculumUrl: 'https://www.cityu.edu.hk/pg/programme/program-list/2026/jockey-club-college-of-veterinary-medicine-and-life-sciences/department-of-infectious-diseases-and-public-health/p96',
    requirements: {
      summary: '30 credit units: 18 CU core plus one 12 CU stream: Research Training, Practicum, or Global Stream.',
      sections: [
        {
          key: 'core',
          title: 'Core courses',
          credits: 18,
          courses: refs(['PH5101', 'PH5105', 'PH5106', 'PH6201', 'PH6202', 'PH6204']),
        },
        {
          key: 'research-training-stream',
          title: 'Research Training Stream',
          credits: 12,
          courses: refs(['PH6203']),
          note: 'PH6203 is the 9 CU core course for the stream; students also choose 3 CU from the elective list.',
        },
        {
          key: 'practicum-stream',
          title: 'Practicum Stream',
          credits: 12,
          courses: refs(['PH6206']),
          note: 'PH6206 is the 6 CU core course for the stream; students also choose 6 CU from the elective list.',
        },
        {
          key: 'global-stream',
          title: 'Global Stream',
          credits: 12,
          courses: refs(['PH6207']),
          note: 'PH6207 is the 9 CU core course for the stream; students also choose 3 CU from the elective list.',
        },
        {
          key: 'stream-electives',
          title: 'Stream elective pool',
          courses: refs([
            'BIOS6900', 'BIOS6901', 'CAI5001', 'CAI5002', 'CAI5003', 'CHEM6128', 'MA5617', 'MA6633',
            'PH6205', 'PH6208', 'PH8001', 'PH8003', 'SYE6102', 'SYE6601', 'SYE6602',
          ]),
          note: 'Some CAI/SYE courses are subject to approval according to the official page.',
        },
      ],
      notes: ['Official page gives course pools by stream, not a fixed semester-by-semester plan.'],
    },
  },
  P99: {
    totalCredits: 30,
    curriculumUrl: 'https://www.cityu.edu.hk/pg/programme/program-list/2026/jockey-club-college-of-veterinary-medicine-and-life-sciences/department-of-veterinary-clinical-sciences/p99',
    requirements: {
      summary: '30 credit units: 18 CU core plus 12 CU electives, based on the official Master of Veterinary Medicine course description.',
      sections: [
        {
          key: 'core',
          title: 'Core courses',
          credits: 18,
          courses: refs(['VCS5001', 'VCS5002', 'VCS5005', 'VCS5003', 'VCS5004', 'VSC5006']),
        },
        {
          key: 'semester-a-electives',
          title: 'Semester A elective pool',
          chooseCredits: 6,
          courses: refs(['VCS8001', 'PH5105', 'PH5106']),
        },
        {
          key: 'semester-b-electives',
          title: 'Semester B elective pool',
          chooseCredits: 6,
          courses: refs(['VCS5007', 'VCS5008', 'PH8003']),
        },
      ],
      notes: ['Official page says students complete two elective courses in each semester, totalling four elective courses for the study year.'],
    },
  },
  P43: {
    totalCredits: 72,
    titleOnly: true,
    curriculumUrl: 'https://www.cityu.edu.hk/pg/programme/program-list/2026/school-of-law/school-of-law/p43',
    requirements: {
      summary: '72 credit units comprising required JD courses, electives, and core law courses required for admission to PCLL.',
      sections: [
        {
          key: 'required',
          title: 'Required courses listed on official page',
          courses: titleRefs('P43', ['Legal Methods, Research and Writing and Hong Kong Legal System']),
        },
        {
          key: 'pcll-core',
          title: 'Core courses required for PCLL admission',
          courses: titleRefs('P43', [
            'Commercial Law',
            'Company Law I and II',
            'Constitutional Law',
            'Administrative Law',
            'Criminal Law I and II',
            'Equity & Trusts I and II',
            'Law of Contract I and II',
            'Law of Evidence',
            'Law of Tort I and II',
            'Land Law I and II',
          ]),
        },
        {
          key: 'streams',
          title: 'Optional specialization areas',
          courses: titleRefs('P43', ['International Commercial Law', 'Alternative Dispute Resolution', 'Chinese and Comparative Law']),
        },
      ],
      notes: ['Official page states JD students also take electives offered in JD, LLM and LLMArbDR programmes, but it does not enumerate the full elective pool.'],
    },
  },
  P45: {
    titleOnly: true,
    curriculumUrl: 'https://www.cityu.edu.hk/pg/programme/program-list/2026/school-of-law/school-of-law/p45',
    requirements: {
      summary: 'PCLL programme content: nine core courses plus 6 credits of electives, with offering subject to change.',
      sections: [
        {
          key: 'core',
          title: 'Core courses',
          courses: titleRefs('P45', [
            'Interlocutory Advocacy and Interviewing',
            'Trial Advocacy',
            'Mediation and Negotiation',
            'Conveyancing Practice',
            'Wills and Probate Practice',
            'Corporate and Commercial Practice',
            'Civil Litigation Practice',
            'Criminal Litigation Practice',
            'Professional Conduct and Practice',
          ]),
        },
        {
          key: 'electives',
          title: 'Electives',
          chooseCredits: 6,
          courses: titleRefs('P45', [
            'Commercial Writing and Drafting',
            'Corporate Fundraising for Lawyers',
            'Bar Course',
            'Family Law Practice',
            'Foundations in Mainland Related Legal Transactions',
            'Financial Regulatory Practice',
            'Personal Injuries Practice',
            'Chinese for Legal Practice',
          ]),
        },
      ],
      notes: ['Official page says core/elective offerings and credit units may change and are at the discretion of the School of Law.'],
    },
  },
  P83: {
    titleOnly: true,
    curriculumUrl: 'https://www.cityu.edu.hk/pg/programme/program-list/2026/college-of-business/department-of-accountancy/p83',
    requirements: {
      summary: 'Official page lists core course titles for MSc Accounting and Finance with AI and Fintech Applications; credit allocation should be checked on the official page/catalogue.',
      sections: [
        {
          key: 'core',
          title: 'Core courses listed on official page',
          courses: titleRefs('P83', [
            'Corporate Governance',
            'Corporate Financial Statement Analysis and Strategic Business Valuation',
            'Advanced Financial Accounting',
            'Strategic Management Accounting and Internal Control',
            'Tax Planning and Control',
            'Corporate Social Responsibility and Accounting Ethics',
            'Chinese Law and Financial Regulations',
            'Artificial Intelligence Accounting',
            'CFO and Strategic Business Leaders',
            'Topical Analysis on Contemporary Chinese Economy',
            'Corporate Finance',
            'Corporate Merger and Acquisition with Applications in the Fintech Industry',
            'Portfolio Management and Security Analysis',
            'Financial Instruments and Risk Management',
            'Data Visualization and Image Analysis',
            'Innovation and Technology Entrepreneurship',
            'Blockchain Technology and Artificial Intelligence',
            'Business Data Analytics',
            'Information Systems Security Management',
          ]),
        },
      ],
      notes: ['Official page lists course titles; catalogue course codes and assessment details still need matching.'],
    },
  },
  P93: {
    totalCredits: 12,
    curriculumUrl: 'https://www.cityu.edu.hk/pg/programme/program-list/2026/school-of-law/school-of-law/p93',
    requirements: {
      summary: '12 credit units in Track A or Track B plus elective/bridging requirements as listed on the official Postgraduate Certificate in Patent Law page.',
      sections: [
        {
          key: 'track-a-core',
          title: 'Track A core courses',
          credits: 9,
          courses: refs(['LW6196E', 'LW6199E', 'LW6208E', 'LW6209E']),
          note: 'For students with a law degree from common law jurisdictions.',
        },
        {
          key: 'track-b-core',
          title: 'Track B core courses',
          credits: 6,
          courses: refs(['LW6210E', 'LW6211E', 'LW6208E', 'LW6209E']),
          note: 'For students from non-law backgrounds or non-common-law law degrees.',
        },
        {
          key: 'electives',
          title: 'Elective courses',
          chooseCredits: 3,
          courses: refs(['LW6113E', 'LW6115E', 'LW6152E']),
        },
        {
          key: 'bridging',
          title: 'Track B bridging course',
          credits: 3,
          courses: refs(['LW6102E']),
        },
      ],
      notes: ['Official page states Track B students take the bridging course in addition to the track core/elective structure.'],
    },
  },
  DBA: {
    totalCredits: 57,
    titleOnly: true,
    curriculumUrl: 'https://www.cityu.edu.hk/pg/programme/program-list/2026/college-of-business/college-of-business/dba',
    requirements: {
      summary: 'Professional doctorate with 15 CU core courses, 12 CU electives and 30 CU thesis, based on the official DBA course description.',
      sections: [
        {
          key: 'core',
          title: 'Core courses',
          credits: 15,
          courses: titleRefs('DBA', [
            'Methodology for Applied Business Research I',
            'Methodology for Applied Business Research II',
            'Methodology for Applied Business Research III',
            'Residential Workshop I',
            'Residential Workshop II',
            'Research Development Workshop',
          ]),
        },
        {
          key: 'electives',
          title: 'Electives',
          credits: 12,
          courses: titleRefs('DBA', ['College of Business taught postgraduate electives and/or DBA prescribed electives'], 12),
        },
        {
          key: 'thesis',
          title: 'Thesis',
          credits: 30,
          courses: titleRefs('DBA', ['DBA thesis'], 30),
        },
      ],
      notes: ['Official page gives a component structure and core titles; elective titles are not fully enumerated on the visible page.'],
    },
  },
  ENGDC: {
    totalCredits: 66,
    titleOnly: true,
    curriculumUrl: 'https://www.cityu.edu.hk/pg/programme/program-list/2026/college-of-engineering/department-of-systems-engineering/engdc',
    requirements: {
      summary: 'Professional doctorate with 21 CU taught component and 45 CU thesis component, based on the official EngD Chinese programme page.',
      sections: [
        {
          key: 'core',
          title: 'Core courses',
          credits: 9,
          courses: titleRefs('ENGDC', ['EngD Seminar', 'Integrative Engineering Management', 'Research Methods in Engineering Management']),
        },
        {
          key: 'electives',
          title: 'Electives',
          credits: 12,
          courses: titleRefs('ENGDC', [
            'Data Analysis and Artificial Intelligence for Systems Engineering',
            'Industrial Case Studies',
            'Managing Strategic Quality',
            'Semiconductor Manufacturing',
            'Technological Innovation and Entrepreneurship',
          ]),
        },
        {
          key: 'research-component',
          title: 'Research component',
          credits: 45,
          courses: titleRefs('ENGDC', ['Thesis / professional research component'], 45),
        },
      ],
      notes: ['No official semester-by-semester plan is prefilled; students should DIY with the taught/research components.'],
    },
  },
  P69: {
    totalCredits: 30,
    curriculumUrl: 'https://www.cityu.edu.hk/bme/programme/2025-26_Handbook.pdf',
    requirements: {
      summary: '30 credit units: either 10 elective taught courses, or dissertation plus 7 taught elective courses, based on the official 2025/26 MSBME student handbook.',
      sections: [
        {
          key: 'electives',
          title: 'Elective courses for selection',
          chooseCredits: 30,
          courses: refs([
            'BME5108', 'BME5110', 'BME5111', 'BME6005', 'BME6008', 'BME6022', 'BME6045', 'BME6101',
            'BME6111', 'BME6114', 'BME6115', 'BME6117', 'BME6118', 'BME6121', 'BME6122', 'BME6123',
            'BME6135', 'BME6136', 'BME6137', 'BME6138', 'BME6139', 'BME6140', 'BME6141', 'BME6142', 'BME6145',
          ]),
          note: 'Some courses in the handbook are marked not offered/new/CEF; students should confirm the offering term before placing them into semesters.',
        },
      ],
      notes: ['Official handbook gives a course pool, not a fixed semester-by-semester study plan.'],
    },
  },
  P95: {
    totalCredits: 30,
    curriculumUrl: 'https://www.cityu.edu.hk/pg/programme/program-list/2026/college-of-biomedicine/department-of-biomedical-sciences/p95',
    requirements: {
      summary: '30 credit units: choose 18 CU core courses from 8 listed courses plus 12 CU from either Biomedicine Research Training or Health Sciences Training stream.',
      sections: [
        {
          key: 'core',
          title: 'Core courses',
          chooseCredits: 18,
          courses: refs(['BMS5001', 'BMS5002', 'BMS5007', 'BMS5008', 'BMS5009', 'BMS5010', 'BMS5011', 'BMS5012']),
        },
        {
          key: 'biomedicine-research-stream',
          title: 'Biomedicine Research Training Stream',
          chooseCredits: 12,
          courses: refs(['BMS5100', 'BIOS5801', 'BMS5013', 'BMS8103', 'BMS8105', 'BMS8106', 'BMS8107', 'BMS8110', 'BMS8111', 'BMS8112', 'BMS8113']),
        },
        {
          key: 'health-sciences-stream',
          title: 'Health Sciences Training Stream',
          chooseCredits: 12,
          courses: refs([
            'BIOS5800', 'BIOS5801', 'BIOS6900', 'BMS5013', 'BMS5101', 'BMS8103', 'BMS8105', 'BMS8106',
            'BMS8107', 'BMS8110', 'BMS8111', 'BMS8113', 'MS5216', 'MS5217', 'MS5411', 'SYE5006', 'SYE5010',
            'SYE6009', 'SYE6012', 'SYE6037',
          ]),
        },
      ],
      notes: ['Official page states elective courses are subject to sufficient enrolment and possible timetable conflicts.'],
    },
  },
  P98: {
    totalCredits: 30,
    curriculumUrl: 'https://www.cityu.edu.hk/pg/programme/program-list/2026/college-of-biomedicine/department-of-neuroscience/p98',
    requirements: {
      summary: '30 credit units: 15 CU core plus 15 CU electives, based on the official MSc Neuroscience programme content.',
      sections: [
        {
          key: 'core',
          title: 'Core courses',
          credits: 15,
          courses: refs(['NS5001', 'NS5002', 'NS5003', 'NS5004', 'NS8002']),
        },
        {
          key: 'electives',
          title: 'Electives',
          chooseCredits: 15,
          courses: refs(['NS5005', 'NS5006', 'NS5007', 'NS5008', 'NS6001', 'NS6002', 'BMS8106', 'BMS8110']),
          note: 'NS6001 normally lasts for a maximum of two semesters and depends on lab availability.',
        },
      ],
      notes: ['Official page says the new programme curriculum is subject to University approval.'],
    },
  },
  P97: {
    totalCredits: 30,
    titleOnly: true,
    curriculumUrl: 'https://www.cityu.edu.hk/pg/programme/program-list/2026/college-of-computing/department-of-biostatistics/p97',
    requirements: {
      summary: '30 credit units: 21 CU core plus 9 CU electives, based on the official MSc Biostatistics course description.',
      sections: [
        {
          key: 'core',
          title: 'Core courses',
          credits: 21,
          courses: titleRefs('P97', [
            'Introduction to Biostatistics in One Health',
            'Principles of Epidemiology and One Health',
            'Probability',
            'Statistical Computing',
            'Advanced Methods in Biostatistics',
            'Statistical Inference',
            'Communication and Project Study',
          ]),
        },
        {
          key: 'electives',
          title: 'Elective courses',
          chooseCredits: 9,
          courses: titleRefs('P97', [
            'Time Series Analysis',
            'Spatial Data Analysis',
            'Survival Analysis',
            'Clinical Trials',
            'Selected Topics in Biostatistics',
            'Longitudinal Data Analysis',
            'Statistical Methods for Categorical Data Analysis',
            'Introduction to Statistical Learning',
            'Computational Biology, Experimental Design and Data Science',
            'Infectious Disease Epidemiology',
            'Public Health Surveillance and Risk Analysis',
            'Intermediate Level Statistics for One Health',
          ]),
          note: 'The official page lists titles only and says offering is subject to change without prior notice.',
        },
      ],
      notes: ['Official page lists course titles; catalogue course codes and assessment details still need matching.'],
    },
  },
  P79: {
    totalCredits: 30,
    curriculumUrl: 'https://www.ds.cityu.edu.hk/en/programmes/postgraduate-programmes/msaifs',
    requirements: {
      summary: '30 credit units: 15 CU core electives plus 15 CU from one of four tracks, with optional dissertation/internship courses.',
      sections: [
        {
          key: 'core',
          title: 'Core electives',
          credits: 15,
          courses: refs(['DSC5001', 'DSC6008', 'DSC6020', 'DSC6021', 'DSC6022']),
        },
        {
          key: 'ai-scientific-discovery',
          title: 'Track 1: AI for Scientific Discovery',
          chooseCredits: 15,
          courses: refs([
            'CHEM6134', 'PHY5503', 'PHY5504', 'PHY5505', 'PHY5506', 'PHY6502', 'PHY6603', 'PHY6604',
            'MSE5301', 'MSE5303', 'MSE6181', 'MSE6183', 'MSE6265', 'DSC6025',
          ]),
        },
        {
          key: 'ai-digital-medicine',
          title: 'Track 2: AI for Digital Medicine',
          chooseCredits: 15,
          courses: refs(['BMS5001', 'BMS5002', 'BMS5007', 'BMS5008', 'BMS5009', 'BMS5010', 'BMS5011', 'BMS5012', 'BMS5013', 'BMS8111', 'BMS8112']),
        },
        {
          key: 'ai-sustainability',
          title: 'Track 3: AI for Sustainability',
          chooseCredits: 15,
          courses: refs([
            'SEE5201', 'SEE5202', 'SEE5211', 'SEE5212', 'SEE6101', 'SEE6103', 'SEE6104', 'SEE6115',
            'SEE6118', 'SEE6122', 'SEE6124', 'SEE6125', 'SEE6212', 'SEE6213', 'SEE6214', 'SEE6224', 'SEE6225',
          ]),
        },
        {
          key: 'applied-ai',
          title: 'Track 4: Applied AI',
          chooseCredits: 15,
          courses: refs(['DSC6004', 'DSC6019', 'DSC6026', 'DSC6027', 'DSC6028', 'DSC6029', 'DSC6030']),
        },
        {
          key: 'dissertation-internship',
          title: 'Dissertation and internship courses',
          courses: refs(['DSC6023', 'DSC6024']),
          note: 'Official page says dissertation and internship courses are mutually exclusive.',
        },
      ],
      notes: ['Students submit a track selection statement and choose one focused track.'],
    },
  },
  P54: {
    totalCredits: 30,
    curriculumUrl: 'https://www.ee.cityu.edu.hk/en/prospective_students/graduate_admission/mseee_curriculum',
    requirements: {
      summary: '30 credit units: at least 3 of 5 core courses plus technical/business electives, based on the official EE curriculum page.',
      sections: [
        {
          key: 'core',
          title: 'Core courses',
          chooseCredits: 9,
          courses: refs(['EE5425', 'EE5430', 'EE5436', 'EE6427', 'EE6605']),
        },
        {
          key: 'technical-electives',
          title: 'Technical electives',
          chooseCredits: 21,
          courses: refs([
            'EE5410', 'EE5412', 'EE5415', 'EE5437', 'EE5438', 'EE5606', 'EE5608', 'EE5805', 'EE6428',
            'EE6603', 'EE6611', 'EE6619', 'EE6620', 'EE6621', 'EE6622', 'EE6623', 'EE6625', 'EE6626',
            'EE6627', 'EE6680', 'EE6690', 'EE6691', 'EE8401', 'EE8402', 'EE8404', 'EE8405', 'SYE6009',
            'SYE6012', 'SYE6015', 'SYE6037', 'SYE6204', 'CS5351', 'CS5348',
          ]),
        },
        {
          key: 'business-management-electives',
          title: 'Business management electives',
          courses: refs(['EF5010', 'EF5042', 'EF5052', 'EF5342', 'MGT5204', 'MGT5205', 'MGT5316']),
        },
      ],
      notes: ['Official page says elective offerings are subject to annual review, enrolment and timetabling constraints.'],
    },
  },
  P59: {
    totalCredits: 30,
    curriculumUrl: 'https://www.ee.cityu.edu.hk/en/prospective_students/graduate_admission/mscie_curriculum',
    requirements: {
      summary: '30 credit units: at least 3 of 5 core courses plus technical/business electives, based on the official EE MSCIE curriculum page.',
      sections: [
        {
          key: 'core',
          title: 'Core courses',
          chooseCredits: 9,
          courses: refs(['EE5410', 'EE5607', 'EE5608', 'EE5609', 'EE5808']),
        },
        {
          key: 'technical-electives',
          title: 'Technical electives',
          chooseCredits: 21,
          courses: refs([
            'EE5412', 'EE5415', 'EE5425', 'EE5437', 'EE5438', 'EE5606', 'EE5805', 'EE5811', 'EE5815',
            'EE6428', 'EE6435', 'EE6450', 'EE6451', 'EE6603', 'EE6605', 'EE6611', 'EE6619', 'EE6620',
            'EE6621', 'EE6623', 'EE6625', 'EE6626', 'EE6627', 'EE6680', 'EE6690', 'EE6691', 'EE8403',
            'EE8405', 'SYE6015', 'SYE6037', 'SYE6204', 'CS5282', 'CS5285', 'CS5367', 'CS5481', 'CS5487',
            'CS6290',
          ]),
        },
        {
          key: 'business-management-electives',
          title: 'Business management electives',
          courses: refs(['EF5010', 'EF5042', 'EF5052', 'EF5342', 'IS5414', 'MGT5204', 'MGT5205', 'MGT5316', 'SM5306', 'SM5307', 'SM5332', 'SM6325']),
        },
      ],
      notes: ['Official page says elective offerings are subject to annual review, enrolment and timetabling constraints.'],
    },
  },
  P56: {
    totalCredits: 30,
    curriculumUrl: 'https://www.cityu.edu.hk/sye/msem.htm',
    requirements: {
      summary: '30 credit units: 12 CU required core plus 18 CU programme electives; at least 12 CU from SYE is required.',
      sections: [
        {
          key: 'core',
          title: 'Required core courses',
          credits: 12,
          courses: refs(['SYE5006', 'SYE5010', 'SYE6009', 'SYE6012']),
        },
        {
          key: 'electives',
          title: 'Programme electives',
          chooseCredits: 18,
          courses: refs([
            'EE6610', 'EE6620', 'MGT5313', 'MGT6314', 'MGT6325', 'MGT6326', 'MS5217', 'MS6219',
            'SDSC6004', 'SDSC8009', 'SYE5009', 'SYE6014', 'SYE6015', 'SYE6018', 'SYE6037', 'SYE6043',
            'SYE6045', 'SYE6047', 'SYE6050', 'SYE6053', 'SYE6101', 'SYE6102', 'SYE6103', 'SYE6105',
            'SYE6106', 'SYE6107', 'SYE6108', 'SYE6109', 'SYE6110', 'SYE6111', 'SYE6301', 'SYE6302',
            'SYE6303', 'SYE6308', 'SYE8202', 'SYE8204', 'SYE8205',
          ]),
        },
      ],
      notes: ['Official page allows a taught-courses-only path or taught courses plus dissertation.'],
    },
  },
  P86: {
    totalCredits: 30,
    curriculumUrl: 'https://www.cityu.edu.hk/sye/mssm.htm',
    requirements: {
      summary: '30 credit units: 12 CU required core plus 18 CU electives, or 9 CU dissertation plus three 3-CU electives.',
      sections: [
        {
          key: 'core',
          title: 'Required core courses',
          credits: 12,
          courses: refs(['SYE6043', 'SYE6109', 'SYE6201', 'SYE6202']),
        },
        {
          key: 'electives',
          title: 'Programme electives',
          chooseCredits: 18,
          courses: refs([
            'EE6615', 'MNE6005', 'MNE6046', 'MSE6121', 'SYE6009', 'SYE6012', 'SYE6014', 'SYE6018',
            'SYE6045', 'SYE6047', 'SYE6105', 'SYE6106', 'SYE6110', 'SYE6203', 'SYE6204', 'SYE6205',
            'SYE6206', 'SYE6207', 'SYE6301', 'SYE6303', 'SYE6308', 'SYE6309', 'SYE8204',
          ]),
        },
      ],
      notes: ['Official page says electives may be selected as six 3-CU courses or three 3-CU courses plus a 9-CU dissertation.'],
    },
  },
  P89: {
    totalCredits: 30,
    curriculumUrl: 'https://www.cityu.edu.hk/sye/msaidi.htm',
    requirements: {
      summary: '30 credit units: 12 CU required core plus 18 CU programme electives, based on the official MSAIDI curriculum page.',
      sections: [
        {
          key: 'core',
          title: 'Required core courses',
          credits: 12,
          courses: refs(['SYE6012', 'SYE6302', 'SYE6601', 'SYE6602']),
        },
        {
          key: 'electives',
          title: 'Programme electives',
          chooseCredits: 18,
          courses: refs([
            'SYE5006', 'SYE5009', 'SYE5010', 'SYE6009', 'SYE6015', 'SYE6037', 'SYE6050', 'SYE6053',
            'SYE6102', 'SYE6103', 'SYE6105', 'SYE6106', 'SYE6110', 'SYE6610', 'SYE6612', 'SYE6620',
            'SYE6621', 'CAI6002', 'SM5345', 'SM5354', 'IS5113', 'IS5542', 'IS6423', 'IS6620',
            'SDSC6004', 'SDSC6016', 'SDSC8007', 'SDSC8009', 'EE5434', 'EE5437', 'EE5438', 'EE5606',
            'EE6435', 'EE6621', 'MNE6001', 'MNE6002', 'MNE6007', 'MNE6126', 'MNE6128', 'NS5007',
            'NS5009', 'NS6002', 'BME5110', 'BME6135', 'BME6138', 'BMS5010', 'BMS5011', 'BMS8110',
            'PH5101', 'PH5105', 'PH5106', 'PH6202', 'PH6204',
          ]),
        },
      ],
      notes: ['Official page lists programme electives across engineering, business, data science, creative media and health-related units.'],
    },
  },
  ENGDEM: {
    totalCredits: 57,
    titleOnly: true,
    curriculumUrl: 'https://www.cityu.edu.hk/sye/engd.htm',
    requirements: {
      summary: 'Professional doctorate with 21 CU taught component and 36 CU thesis component, based on the official EngD(EM) page.',
      sections: [
        {
          key: 'core',
          title: 'Core courses',
          credits: 9,
          courses: titleRefs('ENGDEM', ['EngD Seminar', 'Integrative Engineering Management', 'Research Methods in Engineering Management']),
        },
        {
          key: 'electives',
          title: 'Engineering management electives',
          credits: 12,
          courses: [],
          note: 'Official page states that a series of electives in engineering management is available, but does not list course titles on the page.',
        },
        {
          key: 'research-component',
          title: 'Research component',
          credits: 36,
          courses: titleRefs('ENGDEM', ['Thesis / professional research component'], 36),
        },
      ],
      notes: ['No official semester-by-semester plan is prefilled; students should DIY with the taught/research components.'],
    },
  },
  P02: {
    totalCredits: 30,
    titleOnly: true,
    curriculumUrl: 'https://www.cb.cityu.edu.hk/en/masters/our-programmes/department-of-accountancy/ma-international-accounting',
    requirements: {
      summary: '30 credit units: 24 CU core plus 6 CU optional electives, based on the official MA International Accounting course description.',
      sections: [
        {
          key: 'core',
          title: 'Core courses',
          credits: 24,
          courses: titleRefs('P02', [
            'Accounting Information Systems',
            'Advanced International Financial Accounting',
            'Advanced Taxation',
            'Corporate Governance',
            'Financial Management',
            'International Financial Management',
            'International Financial Statement Analysis',
            'Management Accounting issues in Multinational Enterprises',
          ]),
        },
        {
          key: 'optional-electives',
          title: 'Optional electives',
          credits: 6,
          chooseCredits: 6,
          courses: titleRefs('P02', [
            'Auditing',
            'Business Economics and Statistics for Accountants',
            'Business Management for Accountants',
            'Credentials and Essential Soft Skills for Effective Board Management',
            'Companies and Securities Regulations and Practice',
            'Law Relating to Business and Companies',
            'Risk Management',
          ]),
        },
      ],
      notes: ['Official page lists course titles; catalogue course codes and assessment details still need matching.'],
    },
  },
  P04: {
    totalCredits: 30,
    titleOnly: true,
    curriculumUrl: 'https://www.cb.cityu.edu.hk/en/masters/our-programmes/department-of-economics-and-finance/msc-finance',
    requirements: {
      summary: '30 credit units: 24 CU required core plus 6 CU electives, based on the official MSc Finance course description.',
      sections: [
        {
          key: 'core',
          title: 'Core courses',
          credits: 24,
          courses: titleRefs('P04', [
            'Corporate Finance',
            'Derivatives and Risk Management',
            'Financial Econometrics',
            'Investments',
            'Professional Seminars in Finance',
            'Advanced Corporate Finance',
            'Fixed Income Securities',
            'International Financial Management',
          ]),
        },
        {
          key: 'electives',
          title: 'Electives',
          credits: 6,
          chooseCredits: 6,
          courses: titleRefs('P04', [
            'Asset Management and Hedge Fund Strategies',
            'Credit Risk Management',
            'Financial Computing',
            'Financial Systems, Markets and Instruments',
            'Fintech and AI in Finance',
            'Option Pricing',
            'Stochastic Calculus for Finance',
            'Sustainable Finance',
          ]),
          note: 'The official page also allows an approved elective from College of Business disciplines.',
        },
      ],
      notes: ['Official page lists course titles; catalogue course codes and assessment details still need matching.'],
    },
  },
  P05A: {
    totalCredits: 30,
    curriculumUrl: 'https://www.cb.cityu.edu.hk/en/is/postgraduate-degrees/taught-postgraduate/msc-business-information-systems/mis-stream',
    requirements: {
      summary: '30 credit units: 15 CU core within the group plus 15 CU electives, based on the official MSBIS MIS Stream course description.',
      sections: [
        {
          key: 'core',
          title: 'Core courses',
          credits: 15,
          chooseCredits: 15,
          courses: refs(['IS5311', 'IS5312', 'IS5313', 'IS5411', 'IS5413', 'IS5540']),
        },
        {
          key: 'electives',
          title: 'Electives',
          credits: 15,
          chooseCredits: 15,
          courses: [
            ...refs([
              'IS5238', 'IS5314', 'IS5542', 'IS5740', 'IS5743', 'IS5940', 'IS6200', 'IS6335',
              'IS6400', 'IS6421', 'IS6423', 'IS6523', 'IS6640', 'IS6620', 'IS6912', 'IS6930', 'IS6940C',
            ]),
            ref('AC5511'),
            ref('EF5042'),
          ],
          note: 'The official page also permits approved electives from Information Systems and College of Business departments.',
        },
      ],
      notes: ['Official page provides course codes for the listed MSBIS MIS Stream courses.'],
    },
  },
  P05B: {
    totalCredits: 30,
    titleOnly: true,
    curriculumUrl: 'https://www.cb.cityu.edu.hk/en/masters/our-programmes/department-of-information-systems/msc-business-information-systems-financial-and-intelligent-technology-stream',
    requirements: {
      summary: '30 credit units: 15 CU core within the group plus 15 CU electives, based on the official MSBIS FIT Stream course description.',
      sections: [
        {
          key: 'core',
          title: 'Core courses',
          credits: 15,
          chooseCredits: 15,
          courses: [
            ref('IS6400'),
            ref('EF5042'),
            ref('AC5511'),
            ref('IS5740'),
            ref('IS5540'),
            ref('IS5542'),
          ],
        },
        {
          key: 'electives',
          title: 'Electives',
          credits: 15,
          chooseCredits: 15,
          courses: [
            ...refs([
              'IS5312', 'IS6941', 'IS6200', 'IS5238', 'IS6421', 'IS5940', 'IS6940C', 'IS5413',
              'IS5314', 'IS5313', 'IS6640', 'IS6912', 'IS5743', 'IS5311', 'IS5411', 'IS6423',
              'IS6620', 'IS6523',
            ]),
            titleRef('P05B', 'Investments'),
            titleRef('P05B', 'Introduction to Financial Technologies'),
          ],
          note: 'The official page also permits two approved electives, with one possibly from another College of Business department.',
        },
      ],
      notes: ['Some FIT Stream course titles are matched to catalogue-style codes; unmatched finance titles remain source-only.'],
    },
  },
  P07: {
    totalCredits: 30,
    titleOnly: true,
    curriculumUrl: 'https://www.cb.cityu.edu.hk/en/masters/our-programmes/department-of-management/ma-global-business-management',
    requirements: {
      summary: '30 credit units: 24 CU core, 3 CU core elective and 3 CU elective, based on the official MA Global Business Management course description.',
      sections: [
        {
          key: 'core',
          title: 'Core courses',
          credits: 24,
          courses: titleRefs('P07', [
            'International Organizational Behaviour',
            'Entrepreneurship',
            'Cross-Cultural Negotiation',
            'Managing International Business',
            'Financial Statement Analysis in Global Context',
            'Global Human Resources Management',
            'Business Ethics & Social Responsibility',
            'Finance for the Global Manager',
          ]),
        },
        {
          key: 'core-electives',
          title: 'Core electives',
          credits: 3,
          chooseCredits: 3,
          courses: titleRefs('P07', ['Generative Artificial Intelligence for Business', 'Business Intelligence in Asia']),
        },
        {
          key: 'electives',
          title: 'Electives',
          credits: 3,
          chooseCredits: 3,
          courses: titleRefs('P07', [
            'Global Business Leadership',
            'Innovation Collaboration',
            'People Analytics',
            'Employee Engagement and Performance',
            'Organizational Innovation and Change',
            'Blockchain Technology and Business Applications',
            'International Business Discovery',
          ]),
        },
      ],
      notes: ['Official page lists course titles; catalogue course codes and assessment details still need matching.'],
    },
  },
  P09: {
    totalCredits: 30,
    titleOnly: true,
    curriculumUrl: 'https://www.cb.cityu.edu.hk/en/masters/our-programmes/department-of-decision-analytics-and-operations/msc-operations-and-supply-chain-management',
    requirements: {
      summary: '30 credit units: core courses plus six electives, based on the official MSc Operations and Supply Chain Management course description.',
      sections: [
        {
          key: 'core',
          title: 'Core courses',
          courses: titleRefs('P09', [
            'Managerial Decision Modeling',
            'Predictive Analytics with Excel and R',
            'Operations Management',
            'Supply Chain Management (#)',
          ]),
        },
        {
          key: 'electives',
          title: 'Electives',
          chooseCredits: 18,
          courses: titleRefs('P09', [
            'Advanced Case Analysis for Supply Chain Management',
            'AI-Enhanced Business Analytics with Excel and Python',
            'Business Process Modeling & Simulation',
            'E-Logistics & Enterprise Resource Planning',
            'Healthcare Management',
            'Internship Project',
            'Project Management',
            'Service Quality Management',
            'Statistical Modelling in Risk Management',
            'Strategic Sourcing & Procurement',
            'Transportation Logistics',
          ]),
          note: 'The official page also allows no more than two electives from the College of Business.',
        },
      ],
      notes: ['Official page lists course titles; catalogue course codes and assessment details still need matching.'],
    },
  },
  P10: {
    totalCredits: 30,
    titleOnly: true,
    curriculumUrl: 'https://www.cb.cityu.edu.hk/en/masters/our-programmes/department-of-accountancy/msc-professional-accounting-and-corporate-governance',
    requirements: {
      summary: '30 credit units: 12 CU programme core plus one 18 CU stream, based on the official MSc Professional Accounting and Corporate Governance course description.',
      sections: [
        {
          key: 'programme-core',
          title: 'Programme core',
          credits: 12,
          courses: titleRefs('P10', [
            'Accounting Information Systems',
            'Advanced Taxation',
            'Corporate Governance',
            'Law Relating to Business and Companies',
          ]),
        },
        {
          key: 'professional-accounting-stream',
          title: 'Professional Accounting Stream core',
          credits: 18,
          courses: titleRefs('P10', [
            'Auditing',
            'Corporate Accounting',
            'Cost and Management Accounting',
            'Financial and Management Accounting',
            'Financial Management',
            'Financial Reporting',
          ]),
        },
        {
          key: 'corporate-governance-stream',
          title: 'Corporate Governance Stream core',
          credits: 18,
          courses: titleRefs('P10', [
            'Credentials and Essential Soft Skills for Effective Board Management',
            'Companies and Securities Regulations and Practice',
            'Corporate Finance and Policies',
            'Corporate Financial Reporting',
            'Risk Management',
            'Employee Engagement and Performance',
          ]),
        },
        {
          key: 'stream-electives',
          title: 'Stream electives',
          courses: titleRefs('P10', [
            'Credentials and Essential Soft Skills for Effective Board Management',
            'Business Economics and Statistics for Accountants',
            'Business Management for Accountants',
            'Companies and Securities Regulations and Practice',
            'Professional Internship',
            'Risk Management',
            'Employee Engagement and Performance',
            'Auditing',
            'Cost and Management Accounting',
          ]),
        },
      ],
      notes: ['Official page lists course titles; catalogue course codes and assessment details still need matching.'],
    },
  },
  P13: {
    totalCredits: 30,
    titleOnly: true,
    curriculumUrl: 'https://www.cb.cityu.edu.hk/en/masters/our-programmes/department-of-economics-and-finance/msc-applied-economics',
    requirements: {
      summary: '30 credit units: 15 CU core plus 9 CU programme electives and up to 6 CU free electives, based on the official MSc Applied Economics course description.',
      sections: [
        {
          key: 'core',
          title: 'Core courses',
          credits: 15,
          courses: titleRefs('P13', [
            'Advanced Econometrics',
            'Advanced Microeconomics',
            'Advanced Macroeconomics',
            'Professional Seminars in Applied Economics',
            'Quantitative Methods in Economics',
          ]),
        },
        {
          key: 'electives',
          title: 'Electives',
          credits: 9,
          chooseCredits: 9,
          courses: titleRefs('P13', [
            'Advanced International Trade',
            'Economic Growth and Development',
            'Experimental Economics',
            'International Finance',
            'Urban and Real Estate Economics',
          ]),
          note: 'The official page also allows up to two approved 3-CU free electives.',
        },
      ],
      notes: ['Official page lists course titles; catalogue course codes and assessment details still need matching.'],
    },
  },
  P15: {
    totalCredits: 30,
    titleOnly: true,
    curriculumUrl: 'https://www.cb.cityu.edu.hk/en/masters/our-programmes/department-of-economics-and-finance/msc-financial-engineering',
    requirements: {
      summary: '30 credit units: 24 CU required core plus 6 CU electives, based on the official MSc Financial Engineering course description.',
      sections: [
        {
          key: 'core',
          title: 'Core courses',
          credits: 24,
          courses: titleRefs('P15', [
            'Corporate Finance',
            'Derivatives and Risk Management',
            'Investments',
            'Stochastic Calculus for Finance',
            'Professional Seminars in Finance',
            'Financial Computing',
            'Fixed Income Securities',
            'Option Pricing',
          ]),
        },
        {
          key: 'electives',
          title: 'Electives',
          credits: 6,
          chooseCredits: 6,
          courses: titleRefs('P15', [
            'Advanced Corporate Finance',
            'Asset Management and Hedge Fund Strategies',
            'Credit Risk Management',
            'Financial Econometrics',
            'Financial Systems, Markets and Instruments',
            'Fintech and AI in Finance',
            'International Financial Management',
            'Sustainable Finance',
          ]),
          note: 'The official page also allows an approved elective from College of Business disciplines.',
        },
      ],
      notes: ['Official page lists course titles; catalogue course codes and assessment details still need matching.'],
    },
  },
  P16: {
    totalCredits: 30,
    curriculumUrl: 'https://www.cb.cityu.edu.hk/is/postgraduate-degrees/taught-postgraduate/msc-digital-transformation-and-technological-innovation/course-description',
    requirements: {
      summary: '30 credit units: 18 CU core plus 12 CU selected electives, based on the official MSc Digital Transformation and Technological Innovation course description.',
      sections: [
        {
          key: 'core',
          title: 'Core courses',
          credits: 18,
          courses: refs(['IS5313', 'IS5940', 'IS6000', 'IS6602', 'IS6608', 'IS6640']),
        },
        {
          key: 'selected-electives',
          title: 'Selected electives',
          credits: 12,
          chooseCredits: 12,
          courses: refs([
            'IS5238', 'IS5312', 'IS5540', 'IS5542', 'IS5740', 'IS6200', 'IS6335', 'IS6400',
            'IS6423', 'IS6523', 'IS6620', 'IS6912', 'IS6940C', 'IS6941', 'EE5437',
          ]),
          note: 'The official page also allows up to 6 credits from other College of Business departments.',
        },
      ],
      notes: ['Official page provides course codes for the listed IS/EE courses.'],
    },
  },
  P18: {
    totalCredits: 30,
    titleOnly: true,
    curriculumUrl: 'https://www.cb.cityu.edu.hk/en/masters/our-programmes/department-of-marketing/msc-marketing',
    requirements: {
      summary: '30 credit units: 18 CU core plus at least 12 CU electives, based on the official MSc Marketing course description.',
      sections: [
        {
          key: 'core',
          title: 'Core courses',
          credits: 18,
          courses: titleRefs('P18', [
            'Marketing Strategy and Planning*',
            'Consumer/Buyer Behaviour*',
            'Applied Marketing Research*',
            'Marketing Innovation and Practicum',
            'Advanced Marketing Analytics*',
            'Marketing Engineering*',
          ]),
        },
        {
          key: 'electives',
          title: 'Electives',
          chooseCredits: 12,
          courses: titleRefs('P18', [
            'Forum on Marketing Practice and Career Development',
            'Chinese Business Culture and Marketing',
            'Financial Services Marketing',
            'Global Marketing',
            'Digital Marketing',
            'Social Media Marketing',
            'Customer Relationship Management',
            'Advertising and Integrated Marketing Communications',
            'Strategic Marketing',
            'Brand Marketing*',
            'Advanced Marketing Practices',
            'Managing Services and Experiences',
            'Artificial Intelligence for Marketing',
          ]),
          note: 'The official page also allows at most 3 CU from other College of Business master courses, subject to approval.',
        },
      ],
      notes: ['Official page lists course titles; catalogue course codes and assessment details still need matching.'],
    },
  },
  P19: {
    totalCredits: 30,
    titleOnly: true,
    curriculumUrl: 'https://www.cb.cityu.edu.hk/en/masters/our-programmes/department-of-management/msc-management-and-innovation',
    requirements: {
      summary: '30 credit units: 12 CU core, 9-15 CU core electives and 3-9 CU electives, based on the official MSc Management and Innovation course description.',
      sections: [
        {
          key: 'core',
          title: 'Core courses',
          credits: 12,
          courses: titleRefs('P19', [
            'Management and Organizations',
            'Strategic Management',
            'Global Business Leadership',
            'People Analytics',
          ]),
        },
        {
          key: 'core-electives',
          title: 'Core elective courses',
          chooseCredits: 9,
          courses: titleRefs('P19', [
            'Managerial Decision Modeling',
            'Management and Innovation Consulting Skills',
            'Business Ethics & Social Responsibility',
            'Innovation Collaboration',
            'Entrepreneurship',
            'Organizational Innovation and Change',
            'Generative Artificial Intelligence for Business',
            'Transforming Organizations in the Age of AI',
            'Leading Innovation and Venture Strategy in the Global Economy',
          ]),
        },
        {
          key: 'electives',
          title: 'Elective courses',
          chooseCredits: 3,
          courses: titleRefs('P19', [
            'Innovation and Technology Entrepreneurship',
            'Employee Engagement and Performance',
            'Innovation Project',
            'International Business Discovery',
            'Global Human Resources Management',
            'Business Intelligence in Asia',
            'Large Language Model with Prompt Engineering for Business',
          ]),
        },
      ],
      notes: ['Official page lists course titles; catalogue course codes and assessment details still need matching.'],
    },
  },
  P84: {
    totalCredits: 30,
    titleOnly: true,
    curriculumUrl: 'https://www.cityu.edu.hk/pg/programme/program-list/2026/college-of-business/college-of-business/p84',
    requirements: {
      summary: '30 credit units across IAM or QAB streams, based on the official MSc Business and Data Analytics course descriptions.',
      sections: [
        {
          key: 'common-core',
          title: 'Common core courses',
          courses: refs(['IS5413', 'IS6335', 'MS5217', 'MS6711']),
        },
        {
          key: 'iam-core',
          title: 'Information Analytics Management Stream core',
          courses: refs(['IS6941']),
        },
        {
          key: 'iam-electives',
          title: 'Information Analytics Management Stream electives',
          chooseCredits: 9,
          courses: refs([
            'IS5113', 'IS5238', 'IS5312', 'IS5313', 'IS5540', 'IS5542', 'IS5740', 'IS5940',
            'IS6200', 'IS6400', 'IS6423', 'IS6620', 'IS6912', 'IS6914',
          ]),
          note: 'Official IAM rule: complete 15 credits with at least 9 credits from the stream elective list; remaining credits may be CB postgraduate electives.',
        },
        {
          key: 'qab-core',
          title: 'Quantitative Analysis for Business Stream core',
          courses: titleRefs('P84', ['Applied Linear Statistical Models']),
        },
        {
          key: 'qab-electives',
          title: 'Quantitative Analysis for Business Stream electives',
          courses: [
            ref('MS5215'),
            ...titleRefs('P84', [
              'Contemporary Topics in Quantitative Analysis for Business',
              'Decision Analytics',
              'Predictive Analytics with Excel and R',
              'Predictive Modeling and Forecasting for Business',
              'Predictive Modeling in Marketing',
              'Project Management',
              'Statistical Modelling in Economics and Finance',
              'Statistical Modelling in Risk Management',
            ]),
          ],
          note: 'Official QAB rule: complete 5 electives with at least 4 from the listed QAB electives.',
        },
      ],
      notes: ['IAM courses include confirmed codes from the official IS pages; QAB titles are listed from the official programme page where codes are not fully exposed.'],
    },
  },
  P85: {
    totalCredits: 30,
    curriculumUrl: 'https://www.cb.cityu.edu.hk/is/postgraduate-degrees/taught-postgraduate/msc-artificial-intelligence-in-business/course-description',
    requirements: {
      summary: '30 credit units: 9 CU AI core, 9 CU business core within the group and 12 CU selected electives, based on the official MSc Artificial Intelligence in Business course description.',
      sections: [
        {
          key: 'ai-core',
          title: 'AI core courses',
          credits: 9,
          courses: refs(['IS5113', 'IS5542', 'IS6423']),
        },
        {
          key: 'business-core',
          title: 'Business core courses',
          credits: 9,
          chooseCredits: 9,
          courses: refs(['EF5560', 'AC6761', 'MKT6614', 'MGT6310', 'MS5215', 'MS6219']),
        },
        {
          key: 'selected-electives',
          title: 'Selected electives',
          credits: 12,
          chooseCredits: 12,
          courses: refs([
            'IS5238', 'IS5312', 'IS5411', 'IS5413', 'IS5540', 'IS5740', 'IS5940', 'IS6335',
            'IS6400', 'IS6620', 'IS6640', 'IS6912', 'IS6941',
          ]),
          note: 'The official page also allows two approved electives, one possibly from another College of Business department.',
        },
      ],
      notes: ['Official page provides course codes for the listed AIB courses.'],
    },
  },
  P70: {
    totalCredits: 30,
    curriculumUrl: 'https://www.ds.cityu.edu.hk/en/programmes/postgraduate-programmes/msds',
    requirements: {
      summary: '30 credit units: 15 CU core electives plus 15 CU electives, based on the official MSc Data Science course list.',
      sections: [
        {
          key: 'core-electives',
          title: 'Core electives',
          credits: 15,
          chooseCredits: 15,
          courses: ['SDSC5001', 'SDSC5002', 'SDSC5003', 'SDSC6001', 'SDSC6002'].map((code) => ref(code)),
        },
        {
          key: 'electives',
          title: 'Electives',
          credits: 15,
          chooseCredits: 15,
          courses: ['CS5285', 'CS5487', 'CS6290', 'CS6493', 'SDSC6003', 'SDSC6004', 'SDSC6006'].map((code) => ref(code)),
        },
      ],
      notes: [
        'Official page provides a course list, not a fixed semester-by-semester study plan.',
        'Students should DIY semester placement after checking offering terms and prerequisites.',
      ],
    },
  },
  P75: {
    totalCredits: 31,
    curriculumUrl: 'https://www.cs.cityu.edu.hk/en/academic-programmes/msc-artificial-intelligence/curriculum',
    requirements: {
      summary: 'At least 31 credit units: all 10 CU core courses plus at least 21 CU electives, based on the official MSc Artificial Intelligence curriculum.',
      sections: [
        {
          key: 'core',
          title: 'Core courses',
          credits: 10,
          courses: ['CS5491', 'CS5486', 'CS5489', 'CS5611'].map((code) => ref(code)),
        },
        {
          key: 'group-i',
          title: 'Group I electives',
          chooseCredits: 21,
          courses: [
            'CS5493', 'SDSC6007', 'CS6522', 'CS6523', 'CS6493', 'CS5494', 'CS6524', 'CS6525',
            'CS5495', 'CS5297', 'CS6526', 'CS6527', 'CS6528', 'CS6529',
          ].map((code) => ref(code)),
          note: 'Project and internship options are subject to official stream and eligibility notes.',
        },
        {
          key: 'group-ii',
          title: 'Group II electives',
          courses: ['CS5187', 'CS5487', 'CS6187', 'CS6487', 'CS6535', 'CS6491'].map((code) => ref(code)),
          note: 'Official curriculum limits Group II electives toward the elective requirement.',
        },
      ],
      notes: [
        'Official curriculum page lists course groups and notes; no fixed semester placement is stored here.',
      ],
    },
  },
  P91: {
    totalCredits: 31,
    curriculumUrl: 'https://www.cs.cityu.edu.hk/en/academic-programmes/msc-cybersecurity/curriculum',
    requirements: {
      summary: 'At least 31 credit units: all 10 CU core courses plus at least 21 CU electives, including at least 12 CU from Group I and at most 9 CU from Group II.',
      sections: [
        {
          key: 'core',
          title: 'Core courses',
          credits: 10,
          courses: [
            ref('CS5285', { title: 'Introduction to Cybersecurity' }),
            ref('CS5293', { title: 'Topics in Information Security and Privacy' }),
            ref('CS5294'),
            ref('CS5612'),
          ],
        },
        {
          key: 'group-i',
          title: 'Group I electives',
          chooseCredits: 12,
          courses: [
            'CS5288', 'CS5291', 'CS5292', 'CS6283', 'CS5295', 'CS6290', 'CS6284', 'CS5297',
            'CS5298', 'CS6537', 'CS6531', 'CS6532',
          ].map((code) => ref(code)),
        },
        {
          key: 'group-ii',
          title: 'Group II electives',
          courses: ['CS5296', 'CS5222', 'CS5483', 'CS5351', 'CS5489'].map((code) => ref(code)),
          note: 'At most 9 CU from Group II may count toward the elective requirement.',
        },
      ],
      notes: [
        'Official curriculum page lists course groups and credit rules; no fixed semester placement is stored here.',
      ],
    },
  },
  P17: {
    totalCredits: 33,
    curriculumUrl: 'https://www.cs.cityu.edu.hk/en/academic-programmes/msc-electronic-commerce/curriculum/structures',
    requirements: {
      summary: '33 credit units with a 15 CU required core and at least 18 CU electives, based on the official MSc Electronic Commerce structure page.',
      sections: [
        {
          key: 'overview',
          title: 'Programme core / overview',
          credits: 15,
          courses: [ref('EC5001')],
          note: 'The official structure page identifies a 15 CU required core; only structured course entries confirmed from the page are listed here.',
        },
        {
          key: 'technology-oriented',
          title: 'Technology-oriented course set',
          courses: [
            'CS5281',
            'CS5285',
            'CS5488',
            'CS5489',
          ].map((code) => ref(code, code === 'CS5285' ? { title: 'Information Security for eCommerce' } : {})),
        },
        {
          key: 'business-oriented',
          title: 'Business-oriented course set',
          courses: ['IS5314', 'IS5414', 'IS6321', 'IS6400', 'IS6640'].map((code) => ref(code)),
        },
      ],
      notes: [
        'Official structure page confirms the course sets; students should confirm the full current core list and offering terms before DIY planning.',
      ],
    },
  },
  P63: {
    totalCredits: 30,
    curriculumUrl: 'https://www.cityu.edu.hk/see/programmes/master-science-energy-and-environment/curriculum',
    requirements: {
      summary: '30 credit units from programme core, stream core options and electives, based on the official MSc Energy and Environment curriculum page.',
      sections: [
        {
          key: 'programme-core',
          title: 'Programme core',
          courses: ['SEE5114', 'SEE6201'].map((code) => ref(code)),
        },
        {
          key: 'stream-core',
          title: 'Stream core options',
          courses: ['SEE5211', 'SEE5212', 'SEE6103', 'SEE6104'].map((code) => ref(code)),
          note: 'Official curriculum assigns stream core requirements by Energy / Environment study focus.',
        },
        {
          key: 'electives',
          title: 'Electives and project options',
          courses: [
            'SEE6118', 'SEE6123', 'SEE6124', 'SEE6125', 'SEE5201', 'SEE6203', 'SEE6212', 'SEE6213',
            'SEE6214', 'SEE6224', 'SEE5202', 'SEE6101', 'SEE6115', 'SEE6122', 'SEE6225', 'SEE6999', 'LW6959',
          ].map((code) => ref(code)),
        },
      ],
      notes: [
        'Official curriculum page lists programme and stream requirements; no fixed semester placement is stored here.',
      ],
    },
  },
}

function courseCodesFromRequirements(requirements) {
  return Array.from(new Set(
    requirements.sections.flatMap((section) => (section.courses ?? []).map((course) => course.code))
  ))
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
    courseListStatus: COURSE_LIST_STATUS.official('https://www.cs.cityu.edu.hk/en/academic-programmes/msc-computer-science/curriculum/overview'),
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
  const confirmed = CONFIRMED_CURRICULA[info.code]
  const plan = emptyStudyPlan(info.years ?? 2)
  const requirements = confirmed?.requirements ?? genericRequirements(info.totalCredits)
  return {
    code: info.code,
    title: info.title,
    award: info.award ?? inferAward(info.title),
    type: 'taught-master',
    college: info.college,
    department: info.department,
    mode: info.mode ?? 'Full-time / Part-time where offered',
    totalCredits: confirmed?.totalCredits ?? info.totalCredits ?? null,
    url: info.url ?? programmeUrl(info.college, info.department, info.code),
    curriculumUrl: confirmed?.curriculumUrl,
    sourceStatus: clone(SOURCE.requirementsDiy),
    courseListStatus: confirmed
      ? confirmed.titleOnly
        ? COURSE_LIST_STATUS.officialTitles(confirmed.curriculumUrl)
        : COURSE_LIST_STATUS.official(confirmed.curriculumUrl)
      : clone(COURSE_LIST_STATUS.unconfirmed),
    requirements,
    allCourses: confirmed ? courseCodesFromRequirements(requirements) : info.allCourses ?? [],
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
    notes: confirmed
      ? [
        'Official curriculum/course list is structured here, but no official semester-by-semester sample schedule is stored.',
        'Use the course pool and official requirements to DIY semester placement after checking offering terms.',
      ]
      : [
        'No confirmed official sample schedule is stored for this programme.',
        'The official course list has not yet been structured into this site. Use the official programme page to confirm current courses, streams, and credit requirements before planning.',
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
  const sourceUrl = researchSourceUrl(seed)
  const courseCodes = researchCandidateCodes(seed)
  const commonCourses = courseCodes.filter((code) => RESEARCH_COMMON_CODES.includes(code))
  const departmentCourses = courseCodes.filter((code) => !RESEARCH_COMMON_CODES.includes(code))
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
    courseListStatus: COURSE_LIST_STATUS.research(sourceUrl),
    requirements: {
      summary: 'Research postgraduate degrees include coursework plus thesis/research milestones. Use the official SGS/department approved course pool below to DIY the semester grid with supervisor or department approval.',
      sections: [
        {
          key: 'sgs-coursework',
          title: 'SGS / common research courses',
          credits: 0,
          courses: researchRefs(
            commonCourses,
            RESEARCH_COURSE_SOURCES.SGS,
            'Common SGS research course; SG8002 may be conditional and these credits may not count toward programme coursework where SGS says so.'
          ),
          note: 'Common SGS research courses are shown for planning. Confirm whether SG8002 applies and whether the credits count toward the programme requirement.',
        },
        {
          key: 'approved-research-coursework',
          title: 'Approved / candidate research coursework',
          courses: researchRefs(
            departmentCourses,
            sourceUrl,
            'Approved or candidate postgraduate coursework for this research area; exact selection requires supervisor/department approval.'
          ),
          note: 'CityUHK research degrees require coursework, but departments differ on core/elective combinations. The table is intentionally not prefilled into semesters.',
        },
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
        'This is not an official semester-by-semester study plan.',
        'MPhil/PhD students should DIY the semester grid using the listed coursework pool, supervisor advice, qualifying/progress review timing, thesis and oral examination requirements.',
      ],
    },
    allCourses: courseCodes,
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
      'Course pools are drawn from SGS approved research-course pages and CityUHK PG catalogue entries for the same academic unit where a full fixed schedule is not published.',
      'Students should confirm final coursework selection with the department and supervisor before registration.',
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
  const confirmed = CONFIRMED_CURRICULA[seed.code]
  const plan = emptyStudyPlan(seed.years ?? 4)
  const requirements = confirmed?.requirements ?? {
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
  }
  return {
    code: seed.code,
    title: seed.title,
    award: seed.award,
    type: 'professional-doctorate',
    college: seed.college,
    department: seed.department,
    mode: seed.mode ?? 'Part-time / Professional mode where offered',
    totalCredits: confirmed?.totalCredits ?? seed.totalCredits ?? null,
    url: seed.url,
    curriculumUrl: confirmed?.curriculumUrl,
    sourceStatus: clone(SOURCE.requirementsDiy),
    courseListStatus: confirmed
      ? confirmed.titleOnly
        ? COURSE_LIST_STATUS.officialTitles(confirmed.curriculumUrl)
        : COURSE_LIST_STATUS.official(confirmed.curriculumUrl)
      : clone(COURSE_LIST_STATUS.unconfirmed),
    requirements,
    allCourses: confirmed ? courseCodesFromRequirements(requirements) : [],
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
    notes: confirmed
      ? [
        'Professional doctorate coursework/research requirements are structured here, but no official semester-by-semester sample schedule is stored.',
        'Use the course pool and official requirements to DIY semester placement after checking offering terms.',
      ]
      : [
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

function applyPgCourseDetails() {
  for (const [code, detail] of Object.entries(pgCourseDetails)) {
    const course = pgCourses[code]
    if (!course) continue

    if (detail.assessment) {
      course.assessment = {
        ...course.assessment,
        ...detail.assessment,
      }
    }
    if (detail.detailStatus) course.detailStatus = detail.detailStatus
    if (detail.pdfUrl) course.pdfUrl = detail.pdfUrl
    if (detail.sourceUrl) course.sourceUrl = detail.sourceUrl
    if (detail.sourceYear) course.sourceYear = detail.sourceYear
    if (detail.semester) course.semester = detail.semester
    if (detail.prerequisitesRaw) course.prerequisitesRaw = detail.prerequisitesRaw
    if (detail.sourceCheckedYears) course.sourceCheckedYears = detail.sourceCheckedYears
  }
}

applyPgCourseDetails()

mkdirSync(DATA_DIR, { recursive: true })
writeFileSync(`${DATA_DIR}/postgraduate-programmes.json`, `${JSON.stringify(programmes, null, 2)}\n`)
writeFileSync(`${DATA_DIR}/pg-courses.json`, `${JSON.stringify(pgCourses, null, 2)}\n`)

console.log(`Wrote ${programmes.length} postgraduate programmes and ${Object.keys(pgCourses).length} PG courses.`)
