# CFFT Stream Study Plans Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give CFFT separate official CF and FT stream schedules, course pools, requirements, and a data-driven default stream selector.

**Architecture:** Extend the existing undergraduate `Major.streams` model with source metadata and two major-level stream-selection flags. Keep all curriculum content in `all-majors.json`, regenerate the split CFFT file, and use a small pure stream-selection utility from `MajorPage` so the UI behavior can be tested without rendering the page.

**Tech Stack:** React 19, TypeScript, JSON curriculum data, Node test runner, Vite, Playwright.

## Global Constraints

- CF and FT schedules follow the official CityUHK 23 June 2025 programme structure PDFs.
- CFFT defaults to CF and does not expose a no-stream plan.
- Other majors keep their current stream-selection behavior.
- Conditional EAP and CHIN1001 requirements are notes and course-pool options, not universal prefilled credits.
- The implementation must pass all undergraduate data audits and offering-term checks.

---

### Task 1: Lock the CFFT stream contract with failing tests

**Files:**
- Modify: `tests/study-plan-data.test.mjs`

**Interfaces:**
- Consumes: `generateStudyPlan(major, courses, streamIndex)` and `getAllMajorCourses(major, streamIndex)`.
- Produces: Regression coverage for stream codes, source metadata, exact representative placement, separate elective pools, and 124 CU totals.

- [ ] **Step 1: Write the failing data test**

Add helpers that read a stream and its semester codes, then assert:

```js
const cfft = major('BSC1_CFFT-1')
assert.deepEqual(cfft.streams.map((stream) => stream.code), ['CF', 'FT'])
assert.equal(cfft.defaultStreamCode, 'CF')
assert.equal(cfft.requireStreamSelection, true)
assert.deepEqual(streamSemesterCodes(cfft, 'CF', 3, 'semB'), ['EF4822', 'EF4820', 'MS3111', 'GE-A2', 'GE-A3'])
assert.deepEqual(streamSemesterCodes(cfft, 'FT', 4, 'semA'), ['IS4920', 'IS4861', 'IS4837', 'FREE1', 'FREE2'])
assert.equal(streamPlanCredits(cfft, 'CF'), 124)
assert.equal(streamPlanCredits(cfft, 'FT'), 124)
```

Assert CF contains `EF4821` but not `IS4861`, FT contains `IS4861` but not `EF4821`, and each stream's `majorElectives.courses` equals its official elective pool.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test --test-name-pattern="CFFT exposes separate official CF and FT stream plans" tests/study-plan-data.test.mjs`

Expected: FAIL because current stream codes are `ComFin` / `FinTech` and neither stream owns a study plan.

### Task 2: Add data-driven mandatory stream selection

**Files:**
- Create: `src/utils/majorStreams.ts`
- Modify: `src/types/index.ts`
- Modify: `src/pages/MajorPage.tsx`
- Modify: `tests/study-plan-data.test.mjs`

**Interfaces:**
- Produces: `getInitialStreamIndex(major: Major): number` and `canUseMajorLevelPlan(major: Major): boolean`.
- Consumes: `Major.defaultStreamCode?: string` and `Major.requireStreamSelection?: boolean`.

- [ ] **Step 1: Write the failing selection test**

```js
const { getInitialStreamIndex, canUseMajorLevelPlan } = await import('../src/utils/majorStreams.ts')
const cfft = major('BSC1_CFFT-1')
assert.equal(getInitialStreamIndex(cfft), 0)
assert.equal(canUseMajorLevelPlan(cfft), false)
assert.equal(canUseMajorLevelPlan(major('BBA1_MGMT-1')), true)
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test --test-name-pattern="mandatory stream selection" tests/study-plan-data.test.mjs`

Expected: FAIL with module-not-found for `majorStreams.ts`.

- [ ] **Step 3: Implement the pure utility and types**

```ts
export function getInitialStreamIndex(major: Major): number {
  const streams = major.streams ?? []
  const preferred = major.defaultStreamCode
    ? streams.findIndex(stream => stream.code === major.defaultStreamCode)
    : -1
  if (preferred >= 0) return preferred
  return major.requireStreamSelection && streams.length > 0 ? 0 : -1
}

export function canUseMajorLevelPlan(major: Major): boolean {
  return !major.requireStreamSelection
}
```

Add the two optional fields to `Major` and official source metadata fields to `Stream`. Use the utility after dynamic major loading and hide the default button when `canUseMajorLevelPlan(major)` is false.

- [ ] **Step 4: Run the selection test and verify GREEN**

Run: `node --test --test-name-pattern="mandatory stream selection" tests/study-plan-data.test.mjs`

Expected: PASS.

### Task 3: Populate both official stream plans and pools

**Files:**
- Modify: `src/data/all-majors.json`
- Generate: `src/data/major-BSC1_CFFT-1.json`

**Interfaces:**
- Consumes: existing `Major`, `Stream`, `StudyPlan`, and requirement readers.
- Produces: complete CFFT `CF` and `FT` stream entities.

- [ ] **Step 1: Replace the CFFT stream data**

For each stream set:

```json
{
  "studyPlanStatus": "structure",
  "totalCredits": 124,
  "requirements": {
    "gatewayEducation": { "credits": 22 },
    "college": { "credits": 9 },
    "collegeRequirement": { "credits": 9 },
    "majorCore": { "credits": 66 },
    "majorElectives": { "credits": 6, "chooseCredits": 6 },
    "freeElectives": { "credits": 12 }
  }
}
```

Fill the CF semesters with these exact code lists:

```text
Y1A CB2400 CS1102 MA1200 CB2240 GE1401 GE1601
Y1B CB2100 CB3410 MA1201 CS2311 CB2402 GE2402
Y2A EF3320 CS3402 MA2001 CS3334 GE1501
Y2B EF4313 MA2510 MA3511 MS3601 GE-A1
Y3A EF4321 MS3252 EF3520 MS2602 MA3525
Y3B EF4822 EF4820 MS3111 GE-A2 GE-A3
Y4A EF4821 CB4001 STREAM-ELECT1 FREE1 FREE2
Y4B EF4328 STREAM-ELECT2 GE-A4 FREE3 FREE4
```

Fill the FT semesters with these exact code lists:

```text
Y1A CB2400 CS1102 MA1200 CB2240 GE1401 GE1601
Y1B CB2100 CB3410 MA1201 CS2311 CB2500 GE2402
Y2A EF3320 CS3402 IS3501 MA2185 CS2312
Y2B EF4313 MA2510 EF4314 CS3334 GE1501
Y3A EF4321 MS3252 IS3240 STREAM-ELECT1 GE-A1
Y3B IS4335 IS3101 IS4940 GE-A2 GE-A3
Y4A IS4920 IS4861 IS4837 FREE1 FREE2
Y4B STREAM-ELECT2 GE-A4 FREE3 FREE4
```

Use semester credits `[16, 18, 15, 15, 15, 15, 15, 15]` for CF and `[16, 18, 15, 15, 15, 15, 18, 12]` for FT. Include `MA1200`, `MA1300`, `MA1201`, `MA1301`, `CHIN1001`, `LC0200A`, and `LC0200B` in each `allCourses` pool, but do not prefill the conditional language courses.

Use the official CF elective pool:

```text
CB2300 CB3043 CS3391 CS4335 EF4312 EF4314 EF4323 EF4327
EF4331 EF4334 MA3514 MA4542 MS3106 MS4212 MS4224 MS4252
```

Use the official FT elective pool:

```text
CB2101 CB2201 CB2300 CB2402 CB2601 CB3043 EF4312 EF4323
IS2502 IS3230 IS3430 IS4032 IS4537 IS4543 MKT3603 MGT2324
```

- [ ] **Step 2: Regenerate split major data**

Run: `npm run split:majors`

Expected: `Wrote 63 major data files.` and only the CFFT split data changes semantically.

- [ ] **Step 3: Run the CFFT data test and verify GREEN**

Run: `node --test --test-name-pattern="CFFT exposes separate official CF and FT stream plans" tests/study-plan-data.test.mjs`

Expected: PASS.

### Task 4: Verify behavior, build, deploy, and inspect online

**Files:**
- Modify only if verification exposes a CFFT-specific defect.

- [ ] **Step 1: Run all automated checks**

Run: `npm test`

Expected: all tests pass with zero failures.

Run: `npm run build`

Expected: TypeScript and Vite build exit 0; data preparation writes 63 major files.

- [ ] **Step 2: Run local visual checks**

Start a Vite preview on a free port. Check desktop and mobile CFFT pages. Confirm CF is selected on first load, no default button appears, switching FT changes the visible semester courses and course pool, and there is no horizontal overflow.

- [ ] **Step 3: Commit and push**

```powershell
git add docs/superpowers/plans/2026-07-27-cfft-stream-study-plans.md tests/study-plan-data.test.mjs src/types/index.ts src/utils/majorStreams.ts src/pages/MajorPage.tsx src/data/all-majors.json src/data/major-BSC1_CFFT-1.json
git commit -m "add CFFT CF and FT stream study plans"
git push origin main
```

- [ ] **Step 4: Verify GitHub Pages**

Poll the Pages workflow for the pushed commit. Open `https://yifeilu84-sketch.github.io/cityu-study-planner/#/major/BSC1_CFFT-1`, confirm the deployed bundle contains the new stream fields, and repeat the CF/FT browser check online.
