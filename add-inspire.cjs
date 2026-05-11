const fs = require('fs');

const allMajors = require('./src/data/all-majors.json');
const majorsIndex = require('./src/data/majors-index.json');

// ===== Build INSPIRE data =====
// Year 1 is common; after Year 1 students choose ESE or EVE

const inspireCommonYear1 = {
  year1: {
    semA: {
      courses: [
        { code: 'MA1200', title: 'Calculus and Basic Linear Algebra I / MA1300 Enhanced Calculus and Linear Algebra I', credits: 3 },
        { code: 'CHEM1200', title: 'Discovery in Biology', credits: 3 },
        { code: 'CHEM1300', title: 'Principles of General Chemistry', credits: 3 },
        { code: 'SEE1003', title: 'Introduction to Sustainable Energy and Environmental Engineering', credits: 3 },
        { code: 'GE1401', title: 'University English', credits: 3 },
        { code: 'GE-DR', title: 'GE Course (Distributional Requirements)', credits: 3 }
      ],
      credits: 18
    },
    semB: {
      courses: [
        { code: 'MA1201', title: 'Calculus and Basic Linear Algebra II / MA1301 Enhanced Calculus and Linear Algebra II', credits: 3 },
        { code: 'PHY1201', title: 'General Physics I', credits: 3 },
        { code: 'SEE1000', title: 'Professional Development: Career Planning Workshop', credits: 0 },
        { code: 'SEE1002', title: 'Introduction to Computing for Energy and Environment', credits: 3 },
        { code: 'GE2410', title: 'English for Engineering', credits: 3 },
        { code: 'GE-DR', title: 'GE Courses (Distributional Requirements)', credits: 6 }
      ],
      credits: 18
    }
  }
};

// ESE track study plan (from existing ESE default plan, with research emphasis)
const esePlan = JSON.parse(JSON.stringify(allMajors.find(m => m.code === 'BENG1_ESE-1').streams.find(s => s.code === 'eSTAR').studyPlan));

// EVE track study plan (from existing EVE default plan, with research emphasis)
const evePlan = JSON.parse(JSON.stringify(allMajors.find(m => m.code === 'BENG1_EVE-1').streams.find(s => s.code === 'eSTAR').studyPlan));

const inspire = {
  code: 'BSEE_INSPIRE-1',
  title: 'International Sustainability Programme for Innovation, Research and Entrepreneurship (INSPIRE)',
  url: 'https://www.cityu.edu.hk/en/see/programmes/undergraduate-programmes/flagship-programme---international-sustainability-programme-for-innovation',
  degree: 'Bachelor of Engineering',
  totalCredits: 132,
  department: 'School of Energy and Environment',
  college: 'School of Energy and Environment',
  requirements: {
    gatewayEducation: {
      credits: 31,
      courses: [
        { code: 'GE1401', title: 'University English', credits: 3 },
        { code: 'GE2410', title: 'English for Engineering', credits: 3 },
        { code: 'GE1501', title: 'Chinese Civilisation - History and Philosophy', credits: 3 },
        { code: 'GE1601', title: 'Whole-Person Development', credits: 1 },
        { code: 'GE-DR', title: 'GE Distributional Requirements', credits: 12 },
        { code: 'CA1167', title: 'Engineering Communication', credits: 3 },
        { code: 'SEE1003', title: 'Introduction to Sustainable Energy and Environmental Engineering', credits: 3 },
        { code: 'SEE3002', title: 'Energy and Environmental Economics', credits: 3 }
      ]
    },
    college: {
      credits: 18,
      courses: [
        { code: 'CHEM1200', title: 'Discovery in Biology', credits: 3 },
        { code: 'CHEM1300', title: 'Principles of General Chemistry', credits: 3 },
        { code: 'MA1200', title: 'Calculus and Basic Linear Algebra I / MA1300 Enhanced Calculus and Linear Algebra I', credits: 3 },
        { code: 'MA1201', title: 'Calculus and Basic Linear Algebra II / MA1301 Enhanced Calculus and Linear Algebra II', credits: 3 },
        { code: 'PHY1201', title: 'General Physics I', credits: 3 },
        { code: 'SEE1002', title: 'Introduction to Computing for Energy and Environment', credits: 3 },
        { code: 'SEE1000', title: 'Professional Development: Career Planning Workshop', credits: 0 },
        { code: 'SEE2000', title: 'Professional Development I', credits: 0 },
        { code: 'SEE4000', title: 'Professional Development II', credits: 0 }
      ]
    },
    majorCore: { credits: 83, courses: [], note: 'Depends on ESE or EVE major selected after Year 1' },
    majorElectives: { credits: 12, note: 'Depends on ESE or EVE major' },
    freeElectives: { credits: 0, note: 'Integrated into major electives' }
  },
  allCourses: [
    'MA1200','MA1300','CHEM1200','CHEM1300','SEE1003','GE1401',
    'MA1201','MA1301','PHY1201','SEE1000','SEE1002','GE2410',
    'GE1501','GE1601','GE-DR','CA1167','SEE3002',
    'SEE2000','SEE4000','SEE2001','SEE2002','SEE2003','SEE2101','SEE2201',
    'MA2181','SEE3101','SEE3102','SEE3103','SEE3104','SEE3001','SEE3003',
    'SEE4112','SEE4217','SEE4216','SEE4004','SEE4003','SEE4997','SEE4996',
    'SEE4993','SEE4994','SEE4995','SEE4998','SEE4999'
  ],
  studyPlan: inspireCommonYear1,
  streams: [
    {
      code: 'ESE',
      name: 'Energy Science and Engineering Track',
      description: 'Focus on energy engineering, power systems, and sustainable energy technologies. Accredited by HKIE. Total 132 CU.',
      studyPlan: esePlan
    },
    {
      code: 'EVE',
      name: 'Environmental Science and Engineering Track',
      description: 'Focus on environmental engineering, pollution control, and sustainability. Accredited by HKIE. Total 130 CU.',
      studyPlan: evePlan
    }
  ],
  notes: [
    'Admission Code: JS1050 / 1050. First cohort admitted in 2025/26.',
    'Students are first admitted to SEE with an undeclared major and follow a common first-year curriculum.',
    'At the end of Year 1, students freely choose between Energy Science and Engineering (ESE) and Environmental Science and Engineering (EVE) without selection criteria.',
    'Highlighted Features: overseas placement / research opportunities, overseas exchange, mentorship programme, entrepreneurship training workshops.',
    'Both ESE and EVE tracks are accredited by The Hong Kong Institution of Engineers (HKIE).',
    'Students will benefit from specialized curriculum in energy, environment and sustainability, along with extensive training in global perspectives, innovative mindset and research.',
    'Total credit units: 132 CU (ESE track) or 130 CU (EVE track).',
    'Students must complete SEE2000 Professional Development I and SEE4000 Professional Development II before graduation.',
    'Professional Development includes Career Training Workshops arranged by SEE plus 160-hour Professional Development experience recognized by SEE.'
  ]
};

// Add to all-majors.json
allMajors.push(inspire);

// Add to majors-index.json under School of Energy and Environment
const see = majorsIndex.colleges.find(c => c.id === 'school-of-energy-and-environment');
if (see) {
  see.majors.push({
    code: 'BSEE_INSPIRE-1',
    title: 'International Sustainability Programme for Innovation, Research and Entrepreneurship (INSPIRE)'
  });
}

fs.writeFileSync('./src/data/all-majors.json', JSON.stringify(allMajors, null, 2));
fs.writeFileSync('./src/data/majors-index.json', JSON.stringify(majorsIndex, null, 2));

console.log('Added INSPIRE (BSEE_INSPIRE-1) to all-majors.json and majors-index.json');
