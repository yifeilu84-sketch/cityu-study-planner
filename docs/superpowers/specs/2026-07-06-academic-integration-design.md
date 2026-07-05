# CityU Academic Integration Design

## Goal

Bring the separate `cityuhk-academic` repository into CityU Study Planner as a first-class research reference for undergraduate and postgraduate students.

## Data Flow

- Read `C:\Users\lenovo\cityuhk-academic\index.html`.
- Extract the embedded `D` data object without modifying the source repository.
- Normalize it into `src/data/academic-profiles.json`.
- Keep the academic data separate from undergraduate major data and postgraduate programme data.

## Normalized Shape

- `summary`: counts for colleges, departments, professors, students, publications, and source repository.
- `colleges`: college and department directory records.
- `profiles`: flattened professor records with stable ids, college/department metadata, research interests, student counts, representative publications, and official links.

## UI

- Add `/academic` as a research reference directory with search and filters by college, department, and undergraduate-welcome status.
- Add `/academic/:profileId` as a professor detail page with research interests, students, publications, and source links.
- Add "Research Reference" panels on undergraduate major detail pages and postgraduate programme pages using conservative college/department matching.
- Add academic profile and research keyword groups to global search.

## Source Policy

- The Study Planner displays this as a research reference, not as official programme/course requirements.
- Each profile keeps links back to available official profile, CityU Scholars, and Google Scholar pages.
- Missing optional fields are shown as unavailable rather than inferred.

## Verification

- Unit tests cover data import, search index integration, route wiring, and related profile matching.
- Build regenerates `academic-profiles.json` and `search-index.json`.
- Browser checks cover `/academic`, one professor detail page, and a major/postgraduate page showing related research references.
