# CityU Study Planner Phase 1 Upgrade Design

## Goal

Improve the site from a course-data viewer into a trustworthy planning tool. Phase 1 focuses on four user-visible upgrades:

- Source confidence labels for every study plan.
- Real global search across majors and courses.
- A Gateway Education course helper with practical filters.
- A lightweight correction feedback path.

Performance code splitting is valuable, but it should follow after these features because it changes data loading boundaries across the app.

## Chosen Approach

Use the existing static JSON architecture and React pages. Add small, typed helper modules for indexing, source labels, and GE filtering rather than introducing a backend or build-time database.

Alternatives considered:

- Full data pipeline rewrite: cleaner long term, but too risky while course verification is still active.
- Backend search/API: powerful, but unnecessary for a GitHub Pages deployment.
- Static helper modules: best fit for current hosting, easy to test, and keeps the site deployable with Vite.

## Feature Scope

### Source Confidence Labels

Each major page should show one clear source status near the study-plan banner:

- Official study plan: semester-by-semester plan from official PDF or official page.
- Official structure or flowchart: schedule parsed from official programme structure or flowchart.
- Derived from requirements: semester allocation arranged from official graduation/catalogue requirements.
- DIY pathway: no official semester plan; students receive course pools and empty semester grids.

The status should include a short explanation and, where available, a source name or URL. Existing `studyPlanStatus` remains the primary flag. New optional fields can be added gradually:

- `studyPlanSourceType`
- `studyPlanSourceTitle`
- `studyPlanSourceUrl`
- `lastVerified`

If optional fields are missing, the UI should fall back to the current banner text.

### Global Search

The home page search should search:

- College and school names.
- Department names.
- Major codes and titles.
- Course codes and titles from `courses.json`.

Search results should be grouped as `Majors` and `Courses`. Major results link to the major page. Course results open a course detail modal when possible and show related majors when the course appears in a plan or requirement list.

This should use an in-memory index built from `majors-index.json`, `all-majors.json`, and `courses.json`.

### GE Helper

Add a `/ge` page reachable from the main navigation or home page. It should list GE/free-combination courses and allow filtering by:

- GE area.
- Keyword or course code.
- Credit units.
- Assessment profile, including final exam percentage, coursework percentage, and pass requirement where present.

The first version should be read-only. It should reuse `CourseDetailModal` for detail views.

### Feedback Path

Add a small "Report issue" action on major and course detail views. It should generate a prefilled GitHub issue URL when possible, including:

- Major code or course code.
- Page URL.
- Source status.
- A short prompt asking the user to attach official evidence.

If GitHub Issues are not available, fall back to copying a structured report template to clipboard.

## Data Flow

1. App loads static JSON as it does today.
2. Search helper derives a compact index in memory.
3. Major pages read source status from major or selected stream.
4. GE helper filters the course dictionary using course code/title/category/assessment fields.
5. Feedback links are generated client-side from current route and selected entity.

## UI Principles

- Keep the site operational-tool style: compact, scannable, no marketing hero.
- Put source confidence above or next to the study plan, not buried in notes.
- Use clear color semantics:
  - Blue for official plans.
  - Indigo or cyan for official structure/flowchart.
  - Amber for derived plans.
  - Slate/gray for DIY pathways.
- Keep mobile layouts single-column and avoid dense tables that require horizontal scrolling.

## Error Handling

- Missing course details should not crash search or GE pages; show the code and a "details not available" state.
- Missing source fields should fall back to existing status labels.
- Feedback URL generation should degrade to a copyable template if URL construction fails.
- Course search should ignore generic placeholders such as `GE-DR`, `MAJOR-ELECTIVE`, and `FREE-ELECTIVE`.

## Testing

Add node tests for:

- Source status label coverage for official, structure, derived, and DIY examples.
- Global search returns expected majors and courses.
- Generic placeholders are excluded from course search.
- GE helper can identify/filter verified GE courses with assessment data.
- Existing derived-plan test remains unchanged and continues to pass.

Run:

- `npm test`
- `npm run build`

Lint can remain a separate cleanup task if existing unrelated lint errors are still present.

## Out Of Scope For Phase 1

- Full lazy-loading/code splitting of every major JSON file.
- User accounts or server-side saved plans.
- Automatic live scraping of CityU websites.
- Replacing the current JSON data model.

## Acceptance Criteria

- Users can tell whether a plan is official, parsed from structure, derived, or DIY from the major page.
- The home page search can find both majors and real course codes.
- Users can browse and filter GE courses by area and assessment profile.
- Users can report data issues with enough context for verification.
- Tests and production build pass.
