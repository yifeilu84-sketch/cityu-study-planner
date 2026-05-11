const cheerio = require('cheerio');
const fs = require('fs');

const courses = JSON.parse(fs.readFileSync('src/data/courses.json', 'utf8'));
let added = 0;

for (const areaFile of ['area1', 'area2', 'area3']) {
  const html = fs.readFileSync('tmp-ge-' + areaFile + '.html', 'utf8');
  const $ = cheerio.load(html);
  $('table tr').each((i, el) => {
    const tds = $(el).find('td');
    if (tds.length < 6) return;
    const codeText = $(tds[0]).text().trim();
    const match = codeText.match(/(GE\d{4})/);
    if (!match) return;
    const code = match[1];
    if (courses[code]) return; // already exists
    
    const title = codeText.replace(code, '').replace(/^\s*-\s*/, '').trim();
    const area = $(tds[1]).text().trim();
    const unit = $(tds[2]).text().trim();
    const term = $(tds[4]).text().trim();
    
    // Parse semester from term
    let semester = '';
    if (term.includes('Sem A') && term.includes('Sem B')) semester = 'Semester A or B';
    else if (term.includes('Sem A')) semester = 'Semester A';
    else if (term.includes('Sem B')) semester = 'Semester B';
    else if (term.includes('Summer')) semester = 'Summer';
    
    courses[code] = {
      code,
      title,
      credits: 3,
      department: unit || 'GE',
      prerequisites: [],
      semester,
      assessment: {},
      pdfUrl: '',
      courseUrl: ''
    };
    added++;
  });
}

fs.writeFileSync('src/data/courses.json', JSON.stringify(courses, null, 2));
console.log('Added ' + added + ' new GE courses');
console.log('Total courses now:', Object.keys(courses).length);
