import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

const DATA_DIR = 'src/data'
const OUTPUT_FILE = `${DATA_DIR}/pg-course-details.json`
const TEMP_DIR = '.temp'
const TEMP_RUNNER_FILE = `${TEMP_DIR}/pg-course-detail-runner.mjs`
const YEARS = ['202627', '202526', '202425', '202324', '202223', '202122', '202021', '201920', '201819', '201718']
const CHUNK_SIZE = 120
const START_URL = 'https://www.cityu.edu.hk/catalogue/pg/202627/course/CS5222.htm'
const PDF_ONLY_DETAILS = {
  VCS5001: {
    detailStatus: 'parsed',
    sourceUrl: 'https://www.cityu.edu.hk/pg/202627/course/VCS5001.pdf',
    sourceYear: '202627',
    pdfUrl: 'https://www.cityu.edu.hk/pg/202627/course/VCS5001.pdf',
    assessment: {
      details: 'Official CityUHK PG Catalogue 2026/27 syllabus PDF parsed. Continuous Assessment: 0%. Examination: 100%. Examination Duration: 1.5 hours.',
      continuous: '0%',
      exam: '100%',
      examDuration: '1.5 hours',
    },
    semester: 'Semester A 2026/27',
    prerequisitesRaw: '',
  },
}

function cliInvocation() {
  if (process.platform !== 'win32') {
    return { command: 'npx', prefix: [] }
  }
  return {
    command: process.execPath,
    prefix: [join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npx-cli.js')],
  }
}

function runPlaywrightCli(args, options = {}) {
  const cli = cliInvocation()
  return execFileSync(
    cli.command,
    [...cli.prefix, '--yes', '--package', '@playwright/cli', 'playwright-cli', ...args],
    {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 32 * 1024 * 1024,
      ...options,
    },
  )
}

function chunks(items, size) {
  const result = []
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size))
  }
  return result
}

function browserParser(codes) {
  const codesBase64 = Buffer.from(JSON.stringify(codes), 'utf8').toString('base64')
  const years = JSON.stringify(YEARS)

  return `async () => {
    const codes = JSON.parse(atob('${codesBase64}'));
    const years = ${years};
    const clean = (value) => String(value || '').replace(/\\s+/g, ' ').trim();
    const pct = (text, label) => {
      const re = new RegExp(label + '\\\\s*:?\\\\s*(?:\\\\([^)]*\\\\)\\\\s*)?([0-9]+(?:\\\\.[0-9]+)?\\\\s*%?)', 'i');
      const match = text.match(re);
      if (!match) return '';
      const value = match[1].trim();
      return value.includes('%') ? value : value + '%';
    };
    const duration = (text) => {
      const match = text.match(new RegExp('Examination Duration\\\\s*(?:\\\\([^)]+\\\\))?\\\\s*:?\\\\s*(N\\\\/?A|[0-9]+(?:\\\\.[0-9]+)?\\\\s*(?:hours?|hrs?)?)', 'i'));
      if (!match) return '';
      const value = match[1].trim();
      if (new RegExp('^N\\\\/?A$', 'i').test(value)) return '';
      return /hour|hr/i.test(value) ? value.replace(/hrs?$/i, 'hours') : value + ' hours';
    };
    const strip = (html) => {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      return clean(doc.body ? doc.body.innerText : html.replace(/<[^>]+>/g, ' '));
    };
    const pdfUrl = (html, year, code) => {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const links = Array.from(doc.querySelectorAll('a'));
      const link = links.find((item) => clean(item.textContent).toLowerCase().endsWith('.pdf') || (item.getAttribute('href') || '').toLowerCase().includes('.pdf'));
      if (!link) return 'https://www.cityu.edu.hk/pg/' + year + '/course/' + code + '.pdf';
      return new URL(link.getAttribute('href'), location.origin).href;
    };
    const offeringTerm = (text) => {
      const match = text.match(new RegExp('Course Offering Term\\\\*?:?\\\\s*([^*]+?)(?:\\\\* The offering term|Course Aims|Assessment|$)', 'i'));
      return match ? clean(match[1]) : '';
    };
    const prerequisites = (text) => {
      const match = text.match(new RegExp('Pre-requisite\\\\(s\\\\)\\\\s*([^]+?)(?:Precursors|Equivalent Courses|Exclusive Courses|Course Offering Term|Course Aims|Assessment|$)', 'i'));
      if (!match) return '';
      const value = clean(match[1]);
      return /^Nil$/i.test(value) ? '' : value;
    };
    const detailsText = ({ ca, exam, examDuration, minCA, minExam, year }) => [
      'Official CityUHK PG Catalogue ' + year.slice(0, 4) + '/' + year.slice(4) + ' assessment summary parsed.',
      ca ? 'Continuous Assessment: ' + ca + '.' : '',
      exam ? 'Examination: ' + exam + '.' : '',
      examDuration ? 'Examination Duration: ' + examDuration + '.' : '',
      minCA ? 'Minimum Continuous Assessment Passing Requirement: ' + minCA + '.' : '',
      minExam ? 'Minimum Examination Passing Requirement: ' + minExam + '.' : '',
    ].filter(Boolean).join(' ');
    const out = {};

    for (const code of codes) {
      let best = null;
      const variants = Array.from(new Set([code, code.toLowerCase(), code.toUpperCase()]));
      for (const year of years) {
        for (const variant of variants) {
          const urlPath = '/catalogue/pg/' + year + '/course/' + variant + '.htm';
          const response = await fetch(urlPath);
          const html = await response.text();
          if (html.includes('COURSES') && html.toLowerCase().includes(code.toLowerCase())) {
            best = { year, variant, html, sourceUrl: new URL(urlPath, location.origin).href };
            break;
          }
        }
        if (best) break;
      }

      if (!best) {
        out[code] = {
          detailStatus: 'official-page-missing',
          assessment: {
            details: 'CityUHK PG Course Catalogue current link is retained, but the automated official-page check did not find a 2026/27-2017/18 annual course page with assessment summary.',
          },
          sourceCheckedYears: years,
        };
        continue;
      }

      const text = strip(best.html);
      const ca = pct(text, 'Continuous Assessment');
      const exam = pct(text, 'Examination');
      const examDuration = duration(text);
      const minCA = pct(text, 'Minimum Continuous Assessment Passing Requirement');
      const minExam = pct(text, 'Minimum Examination Passing Requirement');
      const assessment = {
        details: detailsText({ ca, exam, examDuration, minCA, minExam, year: best.year }),
      };
      if (ca) assessment.continuous = ca;
      if (exam) assessment.exam = exam;
      if (examDuration) assessment.examDuration = examDuration;
      if (minCA) assessment.minCAPass = minCA;
      if (minExam) assessment.minExamPass = minExam;

      out[code] = {
        detailStatus: 'parsed',
        sourceUrl: best.sourceUrl,
        sourceYear: best.year,
        pdfUrl: pdfUrl(best.html, best.year, code),
        assessment,
        semester: offeringTerm(text),
        prerequisitesRaw: prerequisites(text),
      };
    }
    return out;
  }`
}

function parseCliJsonOutput(output) {
  const parsed = JSON.parse(output)
  if (parsed.isError) {
    throw new Error(parsed.error)
  }
  return JSON.parse(parsed.result)
}

const pgCourses = JSON.parse(readFileSync(`${DATA_DIR}/pg-courses.json`, 'utf8'))
const courseCodes = Object.keys(pgCourses)
const detailEntries = {}

console.log(`Opening CityUHK PG catalogue context: ${START_URL}`)
runPlaywrightCli(['open', START_URL])
mkdirSync(TEMP_DIR, { recursive: true })

for (const [index, chunk] of chunks(courseCodes, CHUNK_SIZE).entries()) {
  writeFileSync(TEMP_RUNNER_FILE, `async (page) => page.evaluate(${browserParser(chunk)})\n`)
  const output = runPlaywrightCli(['run-code', '--filename', TEMP_RUNNER_FILE, '--json'])
  const details = parseCliJsonOutput(output)
  Object.assign(detailEntries, details)
  const parsedCount = Object.values(details).filter((item) => item.detailStatus === 'parsed').length
  const missingCount = Object.values(details).filter((item) => item.detailStatus !== 'parsed').length
  console.log(`Chunk ${index + 1}: ${parsedCount} parsed, ${missingCount} pending`)
}

Object.assign(detailEntries, PDF_ONLY_DETAILS)

const parsedCount = Object.values(detailEntries).filter((item) => item.detailStatus === 'parsed').length
const missingCount = Object.values(detailEntries).filter((item) => item.detailStatus !== 'parsed').length

mkdirSync(DATA_DIR, { recursive: true })
writeFileSync(OUTPUT_FILE, `${JSON.stringify({
  _meta: {
    source: 'CityUHK PG Course Catalogue annual course pages',
    sourceUrl: START_URL,
    checkedYears: YEARS,
    generatedAt: new Date().toISOString(),
    total: courseCodes.length,
    parsed: parsedCount,
    pending: missingCount,
  },
  ...detailEntries,
}, null, 2)}\n`)

console.log(`Wrote ${OUTPUT_FILE}: ${parsedCount} parsed, ${missingCount} pending.`)
