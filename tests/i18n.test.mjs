import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

import {
  LANGUAGE_STORAGE_KEY,
  getDocumentLanguage,
  getDocumentTitle,
  normalizeLanguage,
  readStoredLanguage,
  writeStoredLanguage,
} from '../src/i18n/language.ts'

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial))
  return {
    getItem(key) {
      return values.get(key) ?? null
    },
    setItem(key, value) {
      values.set(key, value)
    },
    values,
  }
}

test('language preference defaults to Chinese and accepts only supported values', () => {
  assert.equal(normalizeLanguage(null), 'zh')
  assert.equal(normalizeLanguage('zh'), 'zh')
  assert.equal(normalizeLanguage('en'), 'en')
  assert.equal(normalizeLanguage('fr'), 'zh')
  assert.equal(getDocumentLanguage('zh'), 'zh-Hans')
  assert.equal(getDocumentLanguage('en'), 'en')
  assert.match(getDocumentTitle('zh'), /香港城市大学/)
  assert.equal(getDocumentTitle('en'), 'CityU Study Planner - Course and Programme Planning')
})

test('language preference is read from and written to persistent storage', () => {
  const blank = createStorage()
  assert.equal(readStoredLanguage(blank), 'zh')

  const stored = createStorage({ [LANGUAGE_STORAGE_KEY]: 'en' })
  assert.equal(readStoredLanguage(stored), 'en')

  writeStoredLanguage('zh', stored)
  assert.equal(stored.values.get(LANGUAGE_STORAGE_KEY), 'zh')
})

test('application shell wires one provider and responsive language controls', () => {
  const main = readFileSync(new URL('../src/main.tsx', import.meta.url), 'utf8')
  const layout = readFileSync(new URL('../src/components/Layout.tsx', import.meta.url), 'utf8')
  const toggle = readFileSync(new URL('../src/components/LanguageToggle.tsx', import.meta.url), 'utf8')

  assert.ok(main.includes('<LanguageProvider>'))
  assert.ok(layout.includes('<LanguageToggle'))
  assert.ok(layout.includes('useLanguage'))
  assert.ok(toggle.includes("aria-label={pick('切换网站语言', 'Switch site language')}"))
  assert.ok(toggle.includes("setLanguage('en')"))
  assert.ok(toggle.includes("setLanguage('zh')"))
})

test('dynamic planner and audit helpers generate the selected language', async () => {
  const { getStudyPlanSourceStatus } = await import('../src/utils/sourceStatus.ts')
  const { getCategoryLabel, getCreditStatus } = await import('../src/utils/studyPlan.ts')
  const { canAddCourse } = await import('../src/utils/editPlan.ts')
  const { auditPlanRisks } = await import('../src/utils/planRiskAudit.ts')

  assert.equal(getStudyPlanSourceStatus({ studyPlanStatus: 'official' }, 'en').label, 'Official recommended study plan')
  assert.equal(getStudyPlanSourceStatus({ studyPlanStatus: 'diy' }, 'en').label, 'No official semester-by-semester plan')
  assert.equal(getCategoryLabel('majorCore', 'en'), 'Major Core')
  assert.match(getCreditStatus(22, 'en').message, /maximum credit limit/i)

  const duplicate = canAddCourse(
    'CS1102',
    { year: 1, sem: 'B' },
    [{ year: 1, sem: 'A', totalCredits: 3, courses: [{ code: 'CS1102', title: 'Introduction to Computing', credits: 3, category: 'majorCore' }] }],
    { CS1102: { code: 'CS1102', title: 'Introduction to Computing', credits: 3, prerequisites: [] } },
    'en',
  )
  assert.equal(duplicate.reason, 'This course is already in the study plan')

  const riskInput = {
    plan: [{ year: 1, sem: 'A', courses: [{ code: 'CAH2612', title: 'Introduction to Sinology', credits: 3 }] }],
    courses: {
      CAH2612: {
        code: 'CAH2612',
        title: 'Introduction to Sinology',
        credits: 3,
        semester: 'Semester B 2026/27',
        prerequisites: [],
      },
    },
  }
  assert.match(auditPlanRisks(riskInput, 'zh').issues[0].title, /学期/)
  assert.match(auditPlanRisks(riskInput, 'en').issues[0].title, /wrong semester/i)
})

test('language-aware academic content does not leak Chinese-only fields into English mode', async () => {
  const { containsCjk, filterLocalizedText, localizeAcademicProfile } = await import('../src/i18n/content.ts')

  assert.equal(containsCjk('Research interests'), false)
  assert.equal(containsCjk('研究方向'), true)
  assert.deepEqual(filterLocalizedText(['Machine learning', '机器学习'], 'en'), ['Machine learning'])

  const localized = localizeAcademicProfile({
    name: 'Xi CHEN',
    nameCN: '陈曦',
    title: '助理教授',
    background: 'Research Assistant Professor。基因组调控专家。',
    interests: ['Bioinformatics', '基因组调控'],
    students: [
      { name: 'LI Yu', topic: 'Computational biology' },
      { name: '王小明', topic: '生物信息学' },
    ],
    topPublications: [
      { title: 'A verified English paper' },
      { title: '中文论文' },
    ],
  }, 'en')

  assert.equal(localized.nameCN, undefined)
  assert.equal(localized.title, undefined)
  assert.equal(localized.background, undefined)
  assert.deepEqual(localized.interests, ['Bioinformatics'])
  assert.deepEqual(localized.students, [{ name: 'LI Yu', topic: 'Computational biology' }])
  assert.deepEqual(localized.topPublications, [{ title: 'A verified English paper' }])
})

test('all imported academic profiles have a Chinese-free English presentation', async () => {
  const { containsCjk, localizeAcademicProfile } = await import('../src/i18n/content.ts')
  const academicData = JSON.parse(readFileSync(new URL('../src/data/academic-profiles.json', import.meta.url), 'utf8'))

  for (const profile of academicData.profiles) {
    const localized = localizeAcademicProfile(profile, 'en')
    const visibleText = [
      localized.name,
      localized.nameCN,
      localized.title,
      localized.background,
      ...localized.interests,
      ...localized.students.flatMap((student) => [student.name, student.topic]),
      ...localized.topPublications.flatMap((publication) => [publication.title, publication.journal]),
    ].filter(Boolean)

    assert.ok(visibleText.every((value) => !containsCjk(value)), `${profile.id} leaks Chinese-only academic content`)
  }
})

test('all core user-facing surfaces consume the shared language context', () => {
  const files = [
    '../src/App.tsx',
    '../src/components/CampusSpotlightCarousel.tsx',
    '../src/components/CourseBadge.tsx',
    '../src/components/CourseDetailModal.tsx',
    '../src/components/GraduationAuditPanel.tsx',
    '../src/components/PlanRiskPanel.tsx',
    '../src/components/PostgraduatePlanEditor.tsx',
    '../src/components/ResearchReferencePanel.tsx',
    '../src/components/StudyPlanEditor.tsx',
    '../src/components/WelcomeModal.tsx',
    '../src/pages/CollegePage.tsx',
    '../src/pages/ComparePage.tsx',
    '../src/pages/CoveragePage.tsx',
    '../src/pages/GEPage.tsx',
    '../src/pages/Home.tsx',
    '../src/pages/MajorPage.tsx',
    '../src/pages/PostgraduateDetailPage.tsx',
    '../src/pages/PostgraduatePage.tsx',
    '../src/pages/AcademicPage.tsx',
    '../src/pages/AcademicProfilePage.tsx',
    '../src/pages/SpotlightDetailPage.tsx',
  ]

  for (const file of files) {
    const source = readFileSync(new URL(file, import.meta.url), 'utf8')
    assert.ok(source.includes('useLanguage'), `${file} should consume useLanguage`)
  }
})
