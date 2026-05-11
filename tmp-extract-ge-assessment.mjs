import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const courses = JSON.parse(fs.readFileSync('src/data/courses.json', 'utf8'));
const tmpDir = path.join(__dirname, 'tmp-ge-pdfs');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

// Find GE courses without assessment details
const geCodes = Object.keys(courses).filter(code =>
  code.startsWith('GE') && /^GE\d{4}$/.test(code) && !courses[code].assessment?.details
);

console.log('GE courses to process:', geCodes.length);

function downloadPDF(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, { timeout: 30000 }, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        https.get(res.headers.location, { timeout: 30000 }, (res2) => {
          res2.pipe(file);
          file.on('finish', () => { file.close(); resolve(); });
        }).on('error', reject);
      } else {
        res.pipe(file);
        file.on('finish', () => { file.close(); resolve(); });
      }
    }).on('error', reject);
  });
}

async function extractAssessmentFromPDF(pdfPath) {
  try {
    const data = new Uint8Array(fs.readFileSync(pdfPath));
    const doc = await pdfjsLib.getDocument({ data }).promise;
    let fullText = '';
    for (let i = 1; i <= Math.min(doc.numPages, 3); i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      fullText += content.items.map(item => item.str).join(' ') + '\n';
    }

    const result = { details: '', minCAPass: '', minExamPass: '' };

    // Find Assessment Tasks section
    const assessMatch = fullText.match(/Assessment Tasks[\/\s]*Activities[\s\S]*?(?=Reading List|Recommended Reading|References|$)/i);
    if (assessMatch) {
      let text = assessMatch[0];
      text = text.replace(/Assessment Tasks[\/\s]*Activities\s*\(ATs\)/i, '');
      text = text.replace(/Course Aims[\s\S]*?(?=Assessment)/i, '');
      text = text.replace(/Assessment\s*$/i, '');
      text = text.replace(/\s+/g, ' ').trim();
      if (text.length > 20) {
        result.details = text.substring(0, 800);
      }
    }

    const caPassMatch = fullText.match(/minimum\s*(?:of\s*)?(\d{1,3})\s*%\s*(?:is\s*)?required\s*(?:to\s*)?pass\s*(?:the\s*)?(?:continuous|CA|coursework)/i);
    if (caPassMatch) result.minCAPass = caPassMatch[1] + '%';

    const examPassMatch = fullText.match(/minimum\s*(?:of\s*)?(\d{1,3})\s*%\s*(?:is\s*)?required\s*(?:to\s*)?pass\s*(?:the\s*)?(?:examination|exam)/i);
    if (examPassMatch) result.minExamPass = examPassMatch[1] + '%';

    return result;
  } catch (e) {
    return null;
  }
}

async function main() {
  let success = 0;
  let fail = 0;

  for (let i = 0; i < geCodes.length; i++) {
    const code = geCodes[i];
    const pdfUrl = courses[code].pdfUrl;
    const pdfPath = path.join(tmpDir, code + '.pdf');

    try {
      if (!fs.existsSync(pdfPath)) {
        await downloadPDF(pdfUrl, pdfPath);
      }
      const result = await extractAssessmentFromPDF(pdfPath);
      if (result && result.details) {
        courses[code].assessment = courses[code].assessment || {};
        courses[code].assessment.details = result.details;
        if (result.minCAPass) courses[code].assessment.minCAPass = result.minCAPass;
        if (result.minExamPass) courses[code].assessment.minExamPass = result.minExamPass;
        success++;
      } else {
        fail++;
      }
    } catch (e) {
      fail++;
      console.log('  Failed:', code, e.message);
    }

    if ((i + 1) % 20 === 0) {
      fs.writeFileSync('src/data/courses.json', JSON.stringify(courses, null, 2));
      console.log(`Progress: ${i + 1}/${geCodes.length} (success: ${success}, fail: ${fail})`);
    }
  }

  fs.writeFileSync('src/data/courses.json', JSON.stringify(courses, null, 2));
  console.log(`Done! Success: ${success}, Fail: ${fail}`);
}

main().catch(console.error);
