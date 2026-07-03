import { readFileSync, writeFileSync } from 'node:fs'
import { buildSearchIndex } from '../src/utils/searchIndex.ts'

const majors = JSON.parse(readFileSync('src/data/all-majors.json', 'utf8'))
const courses = JSON.parse(readFileSync('src/data/courses.json', 'utf8'))
const index = buildSearchIndex(majors, courses)

writeFileSync('src/data/search-index.json', `${JSON.stringify(index, null, 2)}\n`)
console.log(`Indexed ${index.majors.length} majors and ${index.courses.length} courses.`)
