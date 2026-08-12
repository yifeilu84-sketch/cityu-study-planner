# Bilingual Interface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent Chinese/English switch that localizes every shared navigation surface, undergraduate and postgraduate workflow, course modal, planner editor, source label, audit result, and campus spotlight without changing official course titles.

**Architecture:** A small React language provider owns the `zh`/`en` preference, persists it to `localStorage`, and updates the document language. Components use one `pick(zh, en)` interface; pure utility functions accept an optional language argument so dynamically generated source and audit messages are localized at their origin. Campus spotlight records carry explicit English variants because they are editorial content rather than interface chrome.

**Tech Stack:** React 19, TypeScript 6, React Router, Tailwind CSS, Node test runner, Playwright browser verification, GitHub Pages.

## Global Constraints

- Default to Chinese for first-time visitors and remember an explicit language choice across refreshes and new tabs.
- Expose a compact `中 / EN` segmented control in both desktop and mobile navigation.
- Set `<html lang="zh-Hans">` or `<html lang="en">` whenever the preference changes.
- Keep official English course and programme titles unchanged; translate surrounding labels and explanations.
- English mode must not leave Chinese-only navigation, controls, validation messages, audit explanations, or empty states.
- Do not add a runtime translation service or a new dependency.
- Preserve the existing welcome-modal session behavior, routing, planner persistence, and data-generation pipeline.

---

### Task 1: Language State And Contract

**Files:**
- Create: `src/i18n/language.ts`
- Create: `src/i18n/LanguageContext.tsx`
- Create: `src/components/LanguageToggle.tsx`
- Modify: `src/main.tsx`
- Modify: `src/components/Layout.tsx`
- Test: `tests/i18n.test.mjs`

**Interfaces:**
- Produces: `Language = 'zh' | 'en'`, `LANGUAGE_STORAGE_KEY`, `normalizeLanguage(value)`, `readStoredLanguage(storage)`, `writeStoredLanguage(language, storage)`, and `useLanguage()` returning `{ language, setLanguage, pick }`.
- Consumes: the browser `localStorage` and `document.documentElement.lang`; both are guarded for test and non-browser execution.

- [ ] **Step 1: Write failing tests for normalization, storage, provider wiring, and toggle presence.**
- [ ] **Step 2: Run `node --test tests/i18n.test.mjs` and confirm failure because the language module does not exist.**
- [ ] **Step 3: Implement the pure helpers, provider, hook, and accessible segmented toggle.**
- [ ] **Step 4: Wrap the router with `LanguageProvider`, localize the shared shell, and run the focused test until green.**

### Task 2: Shared Components And Dynamic Messages

**Files:**
- Modify: `src/components/WelcomeModal.tsx`
- Modify: `src/components/CourseBadge.tsx`
- Modify: `src/components/CourseDetailModal.tsx`
- Modify: `src/components/StudyPlanEditor.tsx`
- Modify: `src/components/PostgraduatePlanEditor.tsx`
- Modify: `src/components/GraduationAuditPanel.tsx`
- Modify: `src/components/PlanRiskPanel.tsx`
- Modify: `src/utils/sourceStatus.ts`
- Modify: `src/utils/studyPlan.ts`
- Modify: `src/utils/editPlan.ts`
- Modify: `src/utils/graduationAudit.ts`
- Test: `tests/i18n.test.mjs`

**Interfaces:**
- Consumes: `useLanguage()` and optional `language: Language = 'zh'` utility parameters.
- Produces: localized source statuses, credit warnings, prerequisite rejection reasons, graduation warnings, planner controls, and course-detail labels.

- [ ] **Step 1: Extend tests with representative Chinese and English outputs for source status, category labels, credit limits, and prerequisite checks.**
- [ ] **Step 2: Run the focused test and confirm the new English assertions fail.**
- [ ] **Step 3: Add optional language parameters without breaking existing Chinese-default call sites.**
- [ ] **Step 4: Pass the active language from shared components and localize their static copy.**
- [ ] **Step 5: Run focused tests and TypeScript build checks.**

### Task 3: Page-Level Localization

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/pages/Home.tsx`
- Modify: `src/pages/CollegePage.tsx`
- Modify: `src/pages/MajorPage.tsx`
- Modify: `src/pages/GEPage.tsx`
- Modify: `src/pages/ComparePage.tsx`
- Modify: `src/pages/CoveragePage.tsx`
- Modify: `src/pages/PostgraduatePage.tsx`
- Modify: `src/pages/PostgraduateDetailPage.tsx`
- Modify: `src/pages/SpotlightDetailPage.tsx`
- Modify: `src/components/CampusSpotlightCarousel.tsx`
- Modify: `src/data/campusSpotlights.ts`
- Test: `tests/i18n.test.mjs`

**Interfaces:**
- Consumes: `useLanguage().pick` and bilingual spotlight fields.
- Produces: language-complete page headings, filters, empty states, actions, metrics, tabs, and editorial spotlight content.

- [ ] **Step 1: Add a source scan test requiring each user-facing page and shared component to consume the language context.**
- [ ] **Step 2: Confirm the scan fails on untranslated pages.**
- [ ] **Step 3: Localize each page and add explicit English spotlight copy, image alt text, account descriptions, and notes.**
- [ ] **Step 4: Run the focused i18n tests, full `npm test`, and `npm run build`.**

### Task 4: Responsive And Deployment Verification

**Files:**
- Modify: `src/App.css`
- Modify: `README.md`

**Interfaces:**
- Consumes: the `LanguageToggle` class names and production build.
- Produces: a stable desktop/mobile toggle and documented bilingual behavior.

- [x] **Step 1: Style the segmented control for the sidebar and compact mobile header without shifting navigation.**
- [x] **Step 2: Start the local production preview and verify Chinese-to-English switching, persistence after reload, document `lang`, modal copy, undergraduate plan, GE, postgraduate detail, and mobile layout in Playwright.**
- [x] **Step 3: Run final `npm test` and `npm run build`, inspect `git diff`, then commit and push `main`.**
- [ ] **Step 4: Poll the GitHub Pages workflow and verify the deployed site serves the English toggle and English navigation.**
