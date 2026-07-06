export type CollegeTheme = {
  accentRgb: string
  secondaryRgb: string
  ink: string
}

const DEFAULT_THEME: CollegeTheme = {
  accentRgb: '87 83 78',
  secondaryRgb: '185 28 28',
  ink: '#1f2937',
}

const COLLEGE_THEMES: Record<string, CollegeTheme> = {
  'college-of-biomedicine': {
    accentRgb: '190 24 93',
    secondaryRgb: '15 118 110',
    ink: '#831843',
  },
  'college-of-business': {
    accentRgb: '180 83 9',
    secondaryRgb: '30 64 175',
    ink: '#7c2d12',
  },
  'college-of-computing': {
    accentRgb: '29 78 216',
    secondaryRgb: '14 116 144',
    ink: '#1e3a8a',
  },
  'college-of-engineering': {
    accentRgb: '4 120 87',
    secondaryRgb: '185 28 28',
    ink: '#064e3b',
  },
  'college-of-liberal-arts-and-social-sciences': {
    accentRgb: '109 40 217',
    secondaryRgb: '180 83 9',
    ink: '#4c1d95',
  },
  'college-of-science': {
    accentRgb: '8 145 178',
    secondaryRgb: '67 56 202',
    ink: '#155e75',
  },
  'jockey-club-college-of-veterinary-medicine-and-life-sciences': {
    accentRgb: '13 148 136',
    secondaryRgb: '22 101 52',
    ink: '#134e4a',
  },
  'school-of-creative-media': {
    accentRgb: '162 28 175',
    secondaryRgb: '217 119 6',
    ink: '#701a75',
  },
  'school-of-energy-and-environment': {
    accentRgb: '77 124 15',
    secondaryRgb: '15 118 110',
    ink: '#365314',
  },
  'school-of-law': {
    accentRgb: '67 56 202',
    secondaryRgb: '185 28 28',
    ink: '#312e81',
  },
}

export function getCollegeTheme(id: string): CollegeTheme {
  return COLLEGE_THEMES[id] ?? DEFAULT_THEME
}

export function getCollegeThemeStyle(id: string) {
  const theme = getCollegeTheme(id)
  return {
    '--college-accent-rgb': theme.accentRgb,
    '--college-secondary-rgb': theme.secondaryRgb,
    '--college-ink': theme.ink,
  }
}
