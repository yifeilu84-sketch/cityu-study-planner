const fs = require('fs');
const PDFParser = require('pdf2json');

function tryDecode(s) {
  try { return decodeURIComponent(s); } catch { return s; }
}

const pdfParser = new PDFParser();
pdfParser.on('pdfParser_dataReady', pdfData => {
  let text = '';
  for (const page of pdfData.Pages) {
    for (const textBlock of page.Texts) {
      for (const r of textBlock.R) {
        text += tryDecode(r.T) + ' ';
      }
    }
    text += '\n---PAGE BREAK---\n';
  }
  fs.writeFileSync(process.argv[3] || 'tmp-output.txt', text);
  console.log('Extracted to', process.argv[3] || 'tmp-output.txt');
});

pdfParser.on('pdfParser_dataError', err => {
  console.error('PDF parse error:', err);
  process.exit(1);
});

pdfParser.loadPDF(process.argv[2]);
