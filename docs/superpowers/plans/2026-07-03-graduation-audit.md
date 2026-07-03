# Graduation Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a conservative graduation requirement self-check panel for official, structure-derived, derived, and DIY CityUHK undergraduate study plans.

**Architecture:** Put all graduation logic in `src/utils/graduationAudit.ts` and cover it with Node tests. Add a small presentational `GraduationAuditPanel` component, then wire it into `MajorPage` and `StudyPlanEditor` so normal and editable plans use the same audit engine.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Node built-in test runner, existing JSON major/course data.

## Global Constraints

- Use existing `Major`, `Course`, `SemesterPlan`, and `EditableSemester` shapes.
- Do not block user edits; audit warnings are informational.
- Do not invent exact missing courses when the official data only has numeric credits or generic elective slots.
- Preserve existing source confidence labels from `src/utils/sourceStatus.ts`.
- Use TDD: write each test first and watch it fail before implementation.

---

### Task 1: Graduation Audit Utility

**Files:**
- Create: `src/utils/graduationAudit.ts`
- Modify: `tests/study-plan-data.test.mjs`

**Interfaces:**
- Consumes: `Major`, `Course`, `SemesterPlan`, `EditableSemester`, `getStudyPlanSourceStatus`, `getGEArea`, `isRequiredGE`, `DSE_CODES`, `getCourseLookupCode`, `isGenericCourseSlot`.
- Produces: `auditGraduationPlan(major, courses, plan, streamIndex?)`.

- [ ] **Step 1: Write failing tests**

Add tests that call `auditGraduationPlan` and assert:

```js
test('graduation audit catches removed required course and GE area gaps', async () => {
  const { auditGraduationPlan } = await import('../src/utils/graduationAudit.ts')
  const bme = major('BENG1_BME-1')
  const plan = generateStudyPlan(bme, courses).map((semester) => ({
    ...semester,
    courses: semester.courses.filter((course) => course.code !== 'GE1401' && course.code !== 'GE1138' && course.code !== 'GE2262' && course.code !== 'GE3206'),
  })).map((semester) => ({
    ...semester,
    totalCredits: semester.courses.reduce((sum, course) => sum + course.credits, 0),
  }))

  const audit = auditGraduationPlan(bme, courses, plan)

  assert.equal(audit.status, 'danger')
  assert.ok(audit.ge.missingRequiredCodes.includes('GE1401'))
  assert.ok(audit.ge.missingAreas.includes('Area 1'))
  assert.ok(audit.ge.missingAreas.includes('Area 2'))
  assert.ok(audit.ge.missingAreas.includes('Area 3'))
})
```

```js
test('graduation audit marks derived and diy plans as advisory', async () => {
  const { auditGraduationPlan } = await import('../src/utils/graduationAudit.ts')
  const derived = auditGraduationPlan(major('BBA1_BE2-1'), courses, generateStudyPlan(major('BBA1_BE2-1'), courses))
  const diy = auditGraduationPlan(major('CBIO_BIO3-1'), courses, generateStudyPlan(major('CBIO_BIO3-1'), courses), 0)

  assert.equal(derived.source.kind, 'derived')
  assert.equal(derived.source.advisory, true)
  assert.equal(diy.source.kind, 'diy')
  assert.equal(diy.source.advisory, true)
  assert.ok(diy.warnings.some((warning) => warning.message.includes('DIY')))
})
```

```js
test('graduation audit detects duplicate courses and prerequisite ordering', async () => {
  const { auditGraduationPlan } = await import('../src/utils/graduationAudit.ts')
  const bme = major('BENG1_BME-1')
  const plan = generateStudyPlan(bme, courses)
  plan[0].courses.push({ ...plan[0].courses[0] })
  plan[0].totalCredits += plan[0].courses[0].credits
  plan[0].courses.push({ code: 'BME3102', title: 'BME3102', credits: 3, category: 'majorCore', semester: '' })
  plan[0].totalCredits += 3

  const audit = auditGraduationPlan(bme, courses, plan)

  assert.equal(audit.duplicates.some((item) => item.code === plan[0].courses[0].code), true)
  assert.equal(audit.warnings.some((warning) => warning.message.includes('前置课程')), true)
})
```

- [ ] **Step 2: Run tests to verify RED**

Run: `npm test -- tests/study-plan-data.test.mjs`

Expected: FAIL because `src/utils/graduationAudit.ts` does not exist.

- [ ] **Step 3: Implement minimal utility**

Create `graduationAudit.ts` with:

```ts
export function auditGraduationPlan(
  major: Major,
  courses: Record<string, Course>,
  plan: AuditSemester[],
  streamIndex?: number
): GraduationAudit
```

Implementation requirements:
- Flatten planned courses.
- Count planned credits.
- Resolve active stream requirements.
- Compare exact required course codes only when a requirement section has concrete non-generic courses.
- Compare credit totals for every requirement section that has credits.
- Treat `GE1401`, `GE1501`, `GE1601`, and any listed DSE requirement codes as missing-required checks when present in requirements or implied by `gatewayEducation`.
- Require at least one planned non-required GE course in each of Area 1, Area 2, and Area 3 when GE elective credits are required.
- Detect duplicate real course codes.
- Detect prerequisite courses that appear after or not before the course using `Course.prerequisites`.
- Detect semester loads over 18 and over 21 CU.
- Detect offering-term mismatches for clearly Sem A/Sem B-only courses.
- Return `danger` for missing exact required courses, duplicates, prerequisite failures, or planned total below required; otherwise `warning` for advisory/missing credit/GE area/semester load warnings.

- [ ] **Step 4: Run tests to verify GREEN**

Run: `npm test -- tests/study-plan-data.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit utility**

Run:

```bash
git add docs/superpowers/specs/2026-07-03-graduation-audit-design.md docs/superpowers/plans/2026-07-03-graduation-audit.md tests/study-plan-data.test.mjs src/utils/graduationAudit.ts
git commit -m "feat: add graduation audit engine"
```

### Task 2: Graduation Audit Panel UI

**Files:**
- Create: `src/components/GraduationAuditPanel.tsx`
- Modify: `src/pages/MajorPage.tsx`
- Modify: `src/components/StudyPlanEditor.tsx`

**Interfaces:**
- Consumes: `GraduationAudit` from Task 1.
- Produces: `<GraduationAuditPanel audit={audit} compact={boolean} />`.

- [ ] **Step 1: Write failing compile-oriented UI import test**

Add a test that imports the new component:

```js
test('graduation audit panel module is importable', async () => {
  const module = await import('../src/components/GraduationAuditPanel.tsx')
  assert.equal(typeof module.default, 'function')
})
```

- [ ] **Step 2: Run tests to verify RED**

Run: `npm test -- tests/study-plan-data.test.mjs`

Expected: FAIL because `GraduationAuditPanel.tsx` does not exist.

- [ ] **Step 3: Implement the component**

Create a presentational component that renders:
- title `毕业要求自检`
- overall credit count
- source confidence note
- section progress rows
- GE missing area/required course rows
- top warnings limited to six in normal mode and four in compact mode

- [ ] **Step 4: Wire normal and edit views**

In `MajorPage.tsx`:
- Import `GraduationAuditPanel`.
- Import `auditGraduationPlan`.
- Compute `planAudit` with `useMemo` for normal view.
- Render the panel after the source banner.

In `StudyPlanEditor.tsx`:
- Import both audit symbols.
- Compute audit from current editable `plan`.
- Render the compact panel above the semester grid.

- [ ] **Step 5: Run tests and build**

Run:

```bash
npm test
npm run build
```

Expected: both PASS.

- [ ] **Step 6: Commit UI**

Run:

```bash
git add src/components/GraduationAuditPanel.tsx src/pages/MajorPage.tsx src/components/StudyPlanEditor.tsx tests/study-plan-data.test.mjs
git commit -m "feat: show graduation audit panel"
```

### Task 3: Publish and Verify

**Files:**
- Modify only if verification reveals a defect.

- [ ] **Step 1: Push main**

Run: `git push origin main`

Expected: push succeeds and GitHub Actions Pages workflow starts.

- [ ] **Step 2: Verify deployment trigger**

Run: `git log -2 --oneline` and check the latest commit is on `origin/main`.

Expected: latest local commit matches remote main.

- [ ] **Step 3: Final report**

Report the commits, tests, build result, and that GitHub Pages deploy is triggered by the pushed `main` branch.
