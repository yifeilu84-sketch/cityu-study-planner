import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const courses = JSON.parse(fs.readFileSync('src/data/courses.json', 'utf8'));
const tmpDir = path.join(__dirname, 'tmp-pdfs');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

// Find courses without real title
const missing = Object.entries(courses).filter(([k, v]) => v.title === k || !v.title);
console.log('Courses missing title:', missing.length);

function downloadPDF(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, { timeout: 30000 }, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        https.get(res.headers.location, { timeout: 30000 }, (res2) => {
          res2.pipe(file);
          file.on('finish', () => { file.close(); resolve(); });
        }).on('error', reject);
      } else if (res.statusCode === 200) {
        res.pipe(file);
        file.on('finish', () => { file.close(); resolve(); });
      } else {
        file.close();
        reject(new Error('HTTP ' + res.statusCode));
      }
    }).on('error', reject);
  });
}

async function extractTitle(pdfPath) {
  try {
    const data = new Uint8Array(fs.readFileSync(pdfPath));
    const doc = await pdfjsLib.getDocument({ data }).promise;
    const page = await doc.getPage(1);
    const content = await page.getTextContent();
    const text = content.items.map(item => item.str).join(' ');

    // Try multiple patterns to find title
    // Pattern 1: "Title: XXX" or "Course Title: XXX"
    let match = text.match(/(?:Course\s*)?Title[:\s]+([^\n]+?)(?=\s+Course\s*Code|$)/i);
    if (match) return match[1].trim();

    // Pattern 2: Look for text after course code
    const codeMatch = text.match(/Course\s*Code[:\s]+([A-Z]{2,4}\d{4})/i);
    if (codeMatch) {
      const code = codeMatch[1];
      // Title often appears after course code
      const afterCode = text.substring(text.indexOf(codeMatch[0]) + codeMatch[0].length);
      const lines = afterCode.split(/\s{2,}/).filter(s => s.trim().length > 5);
      if (lines.length > 0) return lines[0].trim();
    }

    // Pattern 3: Look for longest text fragment on first page (likely the title)
    const fragments = text.split(/\s{2,}/).map(s => s.trim()).filter(s => s.length > 10 && s.length < 200 && !s.includes('Course Code') && !s.includes('City University'));
    if (fragments.length > 0) {
      // Return the fragment that looks most like a title (not all caps, reasonable length)
      const candidates = fragments.filter(f => !/^\d+$/.test(f) && f.split(' ').length >= 2);
      if (candidates.length > 0) return candidates[0];
    }

    return null;
  } catch (e) {
    return null;
  }
}

async function main() {
  let success = 0;
  let fail = 0;
  let skipped = 0;

  for (let i = 0; i < missing.length; i++) {
    const [code, course] = missing[i];
    const pdfUrl = course.pdfUrl || `https://www.cityu.edu.hk/ug/202526/course/${code}.pdf`;
    const pdfPath = path.join(tmpDir, code + '.pdf');

    try {
      if (!fs.existsSync(pdfPath)) {
        await downloadPDF(pdfUrl, pdfPath);
      }
      const title = await extractTitle(pdfPath);
      if (title && title.length > 3 && title !== code) {
        courses[code].title = title;
        success++;
      } else {
        fail++;
      }
    } catch (e) {
      if (e.message.includes('404') || e.message.includes('HTTP 404')) {
        skipped++;
      } else {
        fail++;
      }
    }

    if ((i + 1) % 50 === 0) {
      fs.writeFileSync('src/data/courses.json', JSON.stringify(courses, null, 2));
      console.log(`Progress: ${i + 1}/${missing.length} (success: ${success}, fail: ${fail}, skipped: ${skipped})`);
    }
  }

  fs.writeFileSync('src/data/courses.json', JSON.stringify(courses, null, 2));
  console.log(`Done! Success: ${success}, Fail: ${fail}, Skipped (404): ${skipped}`);
}

main().catch(console.error);
