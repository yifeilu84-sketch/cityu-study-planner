# CFFT Stream Study Plans Design

## Goal

Expose the two official BSc Computational Finance and Financial Technology streams as distinct study plans:

- CF: Computational Finance Stream
- FT: Financial Technology Stream

The CFFT page must never present the generic placeholder plan as if it were a valid stream plan.

## Official Sources

- [Computational Finance Stream 2025 structure](https://prog.cb.cityu.edu.hk/-/media/project/cityuhk/academic/cb-prog/academics/cfft/about-cfft/bsccfft-structure-for-2025-intake---comfin-stream---23-june-2025_addge1601.pdf)
- [Financial Technology Stream 2025 structure](https://prog.cb.cityu.edu.hk/-/media/project/cityuhk/academic/cb-prog/academics/cfft/about-cfft/bsccfft-structure-for-2025-intake---fintech-stream---23-june-2025_addge1601.pdf)
- CityUHK undergraduate catalogue: `https://www.cityu.edu.hk/catalogue/ug/current/Major/BSC1_CFFT-0.htm`

The two local PDFs are official CityUHK programme structure documents effective from Semester A 2025/26. The current catalogue confirms that CFFT has the Computational Finance and Financial Technology streams and that the major requirement consists of 30 CU major core, 36 CU stream core, and 6 CU stream electives.

## Data Design

Keep one major record, `BSC1_CFFT-1`, and use its existing `streams` array. Normalize the stream codes to `CF` and `FT`. Each stream owns:

- its complete stream-specific `requirements`;
- an official structure-derived `studyPlan` with all eight semesters;
- `studyPlanStatus: "structure"` and the corresponding official PDF title/source;
- a stream-specific `allCourses` pool containing common required courses, that stream's core courses, and only that stream's elective list;
- notes for conditional English/Chinese courses, GE choices, electives, and cross-semester project rules.

Map the official credit structure into the site's existing requirement sections as follows:

- 22 CU Gateway Education: 6 CU English, 3 CU Chinese Civilisation, 1 CU GE1601, and 12 CU GE Area courses;
- 9 CU stream-specific college-specified courses, displayed separately as College-specified Requirements;
- 9 CU College Core;
- 66 CU Major Core, combining 30 CU common major core and 36 CU selected stream core;
- 6 CU stream electives;
- 12 CU free electives or minor.

These sections total the official 124 CU. The official documents group the 9 CU college-specified component into the broader 31 CU GE requirement; the separate display is only a clearer UI breakdown and does not alter the total.

The major-level generic study plan remains only as source data compatibility if another consumer needs it. The CFFT page must select CF by default and must not expose the "default / no stream" option.

## UI Behavior

On the CFFT major page:

- select CF on initial load;
- show a segmented CF / FT stream selector under the programme header;
- switching streams immediately replaces the study plan, requirements, course pool, source label, graduation audit, risk audit, and research matching context;
- leaving edit mode or switching streams resets the editor to prevent one stream's unsaved arrangement from appearing in the other;
- label both plans as official Structure / Flowchart parsing rather than a generic recommended plan.

Other majors retain the current optional-stream behavior.

## Course Placement

CF and FT semester placement follows the two 23 June 2025 official structures exactly. Freely chosen items remain generic slots:

- GE Area course slots;
- two stream elective slots;
- free elective / minor slots;
- English EAP alternatives and CHIN1001 are described in stream notes rather than prefilled as universal graduation credits, because they apply only to students who meet the official language conditions.

CB4001 is placed in CF Year 4 Semester A and annotated as available in Semester A or B. IS4920 is a 6 CU FT capstone in Year 4 Semester A. These are not treated as duplicate courses.

## Testing

Add data regression tests before implementation. They must fail against the current data and then verify that:

- CFFT has exactly the `CF` and `FT` streams;
- both streams have independent study plans and `structure` source status;
- representative CF-only courses appear in CF semesters and not FT semesters;
- representative FT-only courses appear in FT semesters and not CF semesters;
- both elective pools contain the official stream-specific course codes;
- each plan totals 124 CU when generic requirement slots are included;
- the CFFT route defaults to CF and does not render a no-stream option;
- the full test suite, production build, and desktop/mobile page checks pass.

## Deployment

Commit the implementation separately, push `main`, wait for the GitHub Pages workflow, and verify the deployed CFFT page and stream switching online.
