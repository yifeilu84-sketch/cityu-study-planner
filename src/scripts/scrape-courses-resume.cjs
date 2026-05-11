/**
 * Resume scraping courses with checkpoint support
 */
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://www.cityu.edu.hk/catalogue/ug/current';
const DELAY_MS = 300;
const CHECKPOINT_EVERY = 50;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      if (!text.match(/[A-Z]{2,4}\d{4}/)) throw new Error('Landing page');
      return text;
    } catch (e) {
      if (i === retries - 1) throw e;
      await sleep(2000 * (i + 1));
    }
  }
}

async function scrapeCoursePage(code) {
  const url = `${BASE_URL}/course/${code}.htm`;
  await sleep(DELAY_MS);

  try {
    const html = await fetchWithRetry(url);
    const $ = cheerio.load(html);
    const title = $('title').text().replace(/ - CityU.*$/, '').trim();
    const bodyText = $('body').text();

    const creditsMatch = bodyText.match(/Credit Units\s*(\d+)/);
    const credits = creditsMatch ? parseInt(creditsMatch[1]) : 0;

    let prerequisites = [];
    let prerequisitesRaw = '';
    const prereqMatch = bodyText.match(/Pre-requisite\(s\)[:\s]*([^\n]+)/i);
    if (prereqMatch) {
      prerequisitesRaw = prereqMatch[1].trim();
      const codes = prerequisitesRaw.match(/[A-Z]{2,4}\d{4}[A-Z]?/g);
      if (codes) prerequisites = [...new Set(codes)];
    }

    let semester = '';
    const semMatch = bodyText.match(/Course Offering Term\*?[:\s]*([^\n]+)/i);
    if (semMatch) semester = semMatch[1].trim();

    const assessment = {};
    const caMatch = bodyText.match(/Continuous Assessment[:\s]*(\d+%?)/i);
    const examMatch = bodyText.match(/Examination[:\s]*(\d+%?)/i);
    const durMatch = bodyText.match(/Examination Duration[:\s]*([^\n]+)/i);
    if (caMatch) assessment.continuous = caMatch[1];
    if (examMatch) assessment.exam = examMatch[1];
    if (durMatch) assessment.examDuration = durMatch[1].trim();

    let description = '';
    const aimsIdx = bodyText.indexOf('Course Aims');
    if (aimsIdx > -1) {
      description = bodyText.substring(aimsIdx, aimsIdx + 500).replace(/\s+/g, ' ').trim();
    }

    let pdfUrl = '';
    $(`a[href$="${code}.pdf"]`).each((_, a) => {
      const href = $(a).attr('href');
      if (href) pdfUrl = href.startsWith('http') ? href : `${BASE_URL}/${href.replace(/^\.\.\//, '')}`;
    });
    if (!pdfUrl) pdfUrl = `${BASE_URL}/course/${code}.pdf`;

    return {
      code, title, credits, prerequisites, prerequisitesRaw, semester,
      assessment, pdfUrl, courseUrl: url, description
    };
  } catch (e) {
    return { code, title: code, credits: 0, prerequisites: [], semester: '',
      assessment: {}, pdfUrl: `${BASE_URL}/course/${code}.pdf`, courseUrl: url };
  }
}

async function main() {
  const dataDir = path.join(process.cwd(), 'src', 'data');
  const allMajors = JSON.parse(fs.readFileSync(path.join(dataDir, 'all-majors.json'), 'utf8'));

  const allCodes = new Set();
  for (const major of allMajors) {
    for (const c of major.allCourses) allCodes.add(c);
  }
  const courseCodes = [...allCodes].sort();
  console.log(`Total courses to scrape: ${courseCodes.length}`);

  // Load existing progress
  const coursesFile = path.join(dataDir, 'courses.json');
  let courseCatalog = {};
  let lastCheckpoint = 0;

  if (fs.existsSync(coursesFile)) {
    try {
      const raw = fs.readFileSync(coursesFile, 'utf8');
      // Remove BOM if present
      const cleaned = raw.replace(/^\uFEFF/, '');
      if (cleaned.trim() && cleaned.trim() !== '{}') {
        courseCatalog = JSON.parse(cleaned);
        lastCheckpoint = Object.keys(courseCatalog).length;
        console.log(`Resuming from ${lastCheckpoint} courses`);
      }
    } catch (e) {
      console.log('Starting fresh');
    }
  }

  for (let i = lastCheckpoint; i < courseCodes.length; i++) {
    const code = courseCodes[i];
    if (i % 10 === 0) {
      console.log(`Progress: ${i}/${courseCodes.length} (${code})`);
    }

    const course = await scrapeCoursePage(code);
    courseCatalog[code] = course;

    // Save checkpoint periodically
    if ((i + 1) % CHECKPOINT_EVERY === 0 || i === courseCodes.length - 1) {
      fs.writeFileSync(coursesFile, JSON.stringify(courseCatalog, null, 2));
      console.log(`  Checkpoint saved: ${i + 1} courses`);
    }
  }

  fs.writeFileSync(coursesFile, JSON.stringify(courseCatalog, null, 2));
  console.log(`\nDone! Total courses: ${Object.keys(courseCatalog).length}`);
}

main().catch(console.error);
