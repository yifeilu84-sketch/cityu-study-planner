import type { AcademicProfile, AcademicPublication, AcademicStudent } from '../types'
import type { Language } from './language.ts'

const CJK_PATTERN = /[\u3400-\u9fff\uf900-\ufaff]/u

export function containsCjk(value: string | undefined): boolean {
  return Boolean(value && CJK_PATTERN.test(value))
}

export function filterLocalizedText(values: string[], language: Language): string[] {
  if (language === 'zh') return values.filter(Boolean)
  return values.filter((value) => Boolean(value) && !containsCjk(value))
}

function englishText(value: string | undefined): string | undefined {
  return value && !containsCjk(value) ? value : undefined
}

function englishStudents(students: AcademicStudent[]): AcademicStudent[] {
  return students
    .filter((student) => !containsCjk(student.name))
    .map((student) => {
      const localized = { ...student }
      if (!englishText(localized.topic)) delete localized.topic
      return localized
    })
}

function englishPublications(publications: AcademicPublication[]): AcademicPublication[] {
  return publications
    .filter((publication) => !containsCjk(publication.title))
    .map((publication) => {
      const localized = { ...publication }
      if (!englishText(localized.journal)) delete localized.journal
      return localized
    })
}

export function localizeAcademicProfile<T extends Pick<
  AcademicProfile,
  'name' | 'nameCN' | 'title' | 'background' | 'interests' | 'students' | 'topPublications'
>>(profile: T, language: Language): T {
  if (language === 'zh') return profile

  return {
    ...profile,
    nameCN: undefined,
    title: englishText(profile.title),
    background: englishText(profile.background),
    interests: filterLocalizedText(profile.interests, language),
    students: englishStudents(profile.students),
    topPublications: englishPublications(profile.topPublications),
  }
}
