import fs from 'fs';
import { PDFParse } from 'pdf-parse';

// Let's inspect pages 1..4, 18..27, 35..38 in extracted_text.txt
const content = JSON.parse(fs.readFileSync('extracted_text.txt', 'utf-8'));

content.pages.forEach(p => {
  if ([1, 2, 3, 4, 15, 18, 19, 20, 22, 23, 24, 26, 27, 35, 36, 37, 38].includes(p.num)) {
    console.log(`=== PDF Page ${p.num} ===`);
    const lines = p.text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    lines.forEach(l => console.log('  ', l));
  }
});
