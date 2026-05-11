const cheerio = require('cheerio');
const fs = require('fs');

for (const area of ['area1', 'area2', 'area3']) {
  const html = fs.readFileSync('tmp-ge-' + area + '.html', 'utf8');
  const $ = cheerio.load(html);
  const firstRow = $('table tr').eq(1);
  console.log('=== ' + area + ' ===');
  console.log('Columns:', firstRow.find('td').length);
  firstRow.find('td').each((i, el) => {
    const text = $(el).text().trim().substring(0, 100);
    console.log(i + ':', text);
  });
  console.log('');
}
