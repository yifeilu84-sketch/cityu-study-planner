import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { buildSearchIndex } from '../src/utils/searchIndex.ts'

const majors = JSON.parse(readFileSync('src/data/all-majors.json', 'utf8'))
const courses = JSON.parse(readFileSync('src/data/courses.json', 'utf8'))
const postgraduateProgrammes = existsSync('src/data/postgraduate-programmes.json')
  ? JSON.parse(readFileSync('src/data/postgraduate-programmes.json', 'utf8'))
  : []
const pgCourses = existsSync('src/data/pg-courses.json')
  ? JSON.parse(readFileSync('src/data/pg-courses.json', 'utf8'))
  : {}
const academicProfiles = existsSync('src/data/academic-profiles.json')
  ? JSON.parse(readFileSync('src/data/academic-profiles.json', 'utf8'))
  : { profiles: [] }
const index = buildSearchIndex(majors, courses, postgraduateProgrammes, pgCourses, academicProfiles)

writeFileSync('src/data/search-index.json', `${JSON.stringify(index, null, 2)}\n`)
console.log(
  `Indexed ${index.majors.length} majors, ${index.courses.length} courses, ` +
  `${index.postgraduateProgrammes.length} postgraduate programmes, ${index.pgCourses.length} PG courses ` +
  `and ${index.academicProfiles.length} academic profiles.`
)
