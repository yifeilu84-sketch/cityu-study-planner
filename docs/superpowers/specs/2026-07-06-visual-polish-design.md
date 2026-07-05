# CityU Study Planner Visual Polish Design

## Goal

Upgrade CityU Study Planner from a functional data site into a polished academic intelligence dashboard while preserving dense course, programme, and research information.

## Visual Direction

- Use an Academic Intelligence Dashboard style: quiet, structured, data-forward, and trustworthy.
- Keep the site light-mode first with a refined navy/slate foundation, CityU red accents, amber highlights, and restrained blue/emerald status colors.
- Avoid decorative orbs, oversized marketing hero sections, heavy gradients, or playful visual motifs.
- Keep cards at 8px radius where possible and use fine borders, subtle shadows, and consistent spacing.

## Scope

- Global design tokens and reusable CSS utilities in `src/App.css`.
- Header, navigation, main container, and footer in `src/components/Layout.tsx`.
- Home dashboard hero, search surface, feature entry cards, and college cards in `src/pages/Home.tsx`.
- Academic directory and profile pages in `src/pages/AcademicPage.tsx` and `src/pages/AcademicProfilePage.tsx`.
- Shared research recommendation cards in `src/components/ResearchReferencePanel.tsx`.
- Major and postgraduate detail headers plus research panels through class-level styling hooks.

## UX Rules

- The first screen remains the actual planner/search/dashboard experience, not a landing page.
- Search and filter controls should feel like a professional database tool.
- Text must stay readable at mobile and desktop widths.
- Interactive cards and nav links need visible hover and focus states.
- Existing course, study-plan, audit, GE, postgraduate, and academic data behavior must not change.

## Testing

- Add a static regression test that confirms the visual refresh tokens/classes exist.
- Add route/component wiring checks for the refreshed pages.
- Run `npm test`, `npm run build`, and Playwright snapshots for `/`, `/academic`, one major page, and one postgraduate page.
