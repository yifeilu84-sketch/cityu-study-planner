const cheerio = require('cheerio');
const fs = require('fs');
const courses = JSON.parse(fs.readFileSync('src/data/courses.json', 'utf8'));

const newCourses = [];

for (const area of ['area1', 'area2', 'area3']) {
  const html = fs.readFileSync('tmp-ge-' + area + '.html', 'utf8');
  const $ = cheerio.load(html);
  $('table tr').each((i, el) => {
    const tds = $(el).find('td');
    if (tds.length >= 2) {
      const codeText = $(tds[0]).text().trim();
      const match = codeText.match(/(GE\d{4})/);
      if (match) {
        const code = match[1];
        const title = codeText.replace(code, '').replace(/^\s*-\s*/, '').trim();
        if (!courses[code] && !newCourses.find(c => c.code === code)) {
          newCourses.push({ code, title, area: area.replace('area', 'Area ') });
        }
      }
    }
  });
}

console.log('New GE courses found:', newCourses.length);
newCourses.forEach(c => console.log(c.code + ' - ' + c.title + ' (' + c.area + ')'));
