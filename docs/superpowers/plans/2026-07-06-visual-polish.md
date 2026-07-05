# Visual Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the planner UI into a polished academic intelligence dashboard without changing study-plan or course-data behavior.

**Architecture:** Add reusable CSS design tokens and utility classes, then apply them to shared shell components and the highest-traffic pages. Static tests protect class/token wiring; Playwright verifies real visual rendering.

**Tech Stack:** React 19, Vite 8, Tailwind CSS v4, lucide-react, Node test runner, Playwright CLI.

## Global Constraints

- Keep the first screen useful as a planner/search/dashboard experience.
- Do not add decorative orbs, bokeh blobs, or a marketing landing page.
- Cards should use 8px radius or less unless existing local behavior requires otherwise.
- Preserve all current data behavior and generated JSON contracts.
- Do not stage unrelated untracked files such as `.playwright-cli/`, `pdf-texts/`, or `ge-fix-progress.json`.

---

### Task 1: Visual Regression Guard

**Files:**
- Modify: `tests/study-plan-data.test.mjs`

**Interfaces:**
- Consumes: current static file reading test pattern.
- Produces: a test named `visual polish design system is wired into core pages`.

- [ ] **Step 1: Write the failing test**

Add this test near the other route/static wiring tests:

```js
test('visual polish design system is wired into core pages', () => {
  const appCss = readFileSync(new URL('../src/App.css', import.meta.url), 'utf8')
  const layout = readFileSync(new URL('../src/components/Layout.tsx', import.meta.url), 'utf8')
  const home = readFileSync(new URL('../src/pages/Home.tsx', import.meta.url), 'utf8')
  const academicPage = readFileSync(new URL('../src/pages/AcademicPage.tsx', import.meta.url), 'utf8')
  const researchPanel = readFileSync(new URL('../src/components/ResearchReferencePanel.tsx', import.meta.url), 'utf8')

  for (const token of ['--color-cityu-ink', '--surface-panel', '.dashboard-hero', '.toolbar-link', '.metric-card', '.interactive-card']) {
    assert.ok(appCss.includes(token), `App.css should define ${token}`)
  }
  assert.ok(layout.includes('app-shell'))
  assert.ok(layout.includes('toolbar-link'))
  assert.ok(home.includes('dashboard-hero'))
  assert.ok(home.includes('metric-card'))
  assert.ok(academicPage.includes('control-surface'))
  assert.ok(researchPanel.includes('interactive-card'))
})
```

- [ ] **Step 2: Verify red**

Run: `npm test`

Expected: FAIL on `visual polish design system is wired into core pages` because the tokens/classes do not exist yet.

---

### Task 2: Global Design System

**Files:**
- Modify: `src/App.css`

**Interfaces:**
- Consumes: Tailwind v4 `@theme` tokens and existing className usage.
- Produces: reusable classes `app-shell`, `app-header`, `app-main`, `toolbar-link`, `surface-panel`, `control-surface`, `dashboard-hero`, `metric-card`, and `interactive-card`.

- [ ] **Step 1: Implement CSS tokens and utilities**

Add a refined academic palette and reusable classes with 8px radii, subtle borders, focus states, and non-orb background treatment.

- [ ] **Step 2: Verify green for static tokens**

Run: `npm test`

Expected: the visual polish test still fails until page files use the classes; existing tests must not regress.

---

### Task 3: Shell and Navigation Polish

**Files:**
- Modify: `src/components/Layout.tsx`

**Interfaces:**
- Consumes: `app-shell`, `app-header`, `app-main`, and `toolbar-link`.
- Produces: refined header/nav/footer shell used by every route.

- [ ] **Step 1: Apply shell classes**

Use `app-shell` on the root, `app-header` on the header, `toolbar-link` on nav links, and `app-main` on the main content.

- [ ] **Step 2: Verify shell wiring**

Run: `npm test`

Expected: the visual polish test should still fail until Home/Academic/Research panel classes are applied.

---

### Task 4: Core Page Polish

**Files:**
- Modify: `src/pages/Home.tsx`
- Modify: `src/pages/AcademicPage.tsx`
- Modify: `src/pages/AcademicProfilePage.tsx`
- Modify: `src/components/ResearchReferencePanel.tsx`
- Modify: `src/pages/MajorPage.tsx`
- Modify: `src/pages/PostgraduateDetailPage.tsx`

**Interfaces:**
- Consumes: shared CSS classes from Task 2.
- Produces: dashboard hero, refined search/filter surfaces, polished academic/research cards, and upgraded detail headers.

- [ ] **Step 1: Apply page-level classes**

Add `dashboard-hero`, `metric-card`, `control-surface`, `surface-panel`, and `interactive-card` to the relevant page sections. Do not change data loading, routing, or course click behavior.

- [ ] **Step 2: Verify green**

Run: `npm test`

Expected: PASS, including `visual polish design system is wired into core pages`.

---

### Task 5: Build and Browser Verification

**Files:**
- No source edits unless verification exposes a visual defect.

**Interfaces:**
- Consumes: built Vite app.
- Produces: verified local UI snapshots for core routes.

- [ ] **Step 1: Build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 2: Browser smoke checks**

Run local preview and Playwright snapshots for:

```text
/
/#/academic
/#/academic/dept-comp-ds-dept-comp-ds-xiangyu-zhao
/#/major/BSC1_CSC1-1
/#/postgraduate/P53
```

Expected: pages render, no blank screens, refreshed shell/classes visible, no obvious text overlap.

- [ ] **Step 3: Commit and push**

Stage only visual-polish files and commit:

```bash
git commit -m "style: polish academic dashboard ui"
git push origin main
```

Expected: GitHub Pages deployment succeeds and online bundle contains the visual polish classes.
