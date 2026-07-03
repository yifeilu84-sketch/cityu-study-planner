import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const sourcePath = 'src/data/all-majors.json'
const outputDir = 'src/data'

const majors = JSON.parse(readFileSync(sourcePath, 'utf8'))
mkdirSync(outputDir, { recursive: true })

for (const major of majors) {
  writeFileSync(
    join(outputDir, `major-${major.code}.json`),
    `${JSON.stringify(major, null, 2)}\n`
  )
}

console.log(`Wrote ${majors.length} major data files.`)
