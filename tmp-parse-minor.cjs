const cheerio = require('cheerio');
const fs = require('fs');
const html = fs.readFileSync('tmp-minor-index.html', 'utf8');
const $ = cheerio.load(html);
const links = [];
$('a').each((i, el) => {
  const href = $(el).attr('href');
  const text = $(el).text().trim();
  if (href && href.includes('minor') && text && text.length > 2) {
    links.push({ href, text });
  }
});
console.log('Found', links.length, 'minor links');
links.slice(0, 20).forEach(l => console.log(l.href + ' -> ' + l.text));
