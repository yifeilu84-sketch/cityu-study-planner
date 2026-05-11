const pdf = require('pdf-parse');
const fs = require('fs');
const dataBuffer = fs.readFileSync('C:\\Users\\lenovo\\Downloads\\ESE-Recommended Study Plan 2025 4YrDeg.pdf');
pdf(dataBuffer).then(function(data) {
  console.log(data.text);
}).catch(e => console.error(e));
