import fs from 'fs';

// Let's read pdf buffer and extract stream blocks
const pdfBuf = fs.readFileSync('사회(교과서) 6-2-1.pdf');
const pdfStr = pdfBuf.toString('binary');

// Find page objects and text streams
console.log('PDF Length:', pdfBuf.length);

// Let's search for keywords in pdf string to locate image names
const keywords = [
  '몽블랑산', '사하라', '몽골', '콜로라도강', '칸쿤', '페리토모레노', 
  '아비시니아', '마우나로아', '마추픽추', '열대', '건조', '온대', '냉대', '한대', '고산'
];

keywords.forEach(kw => {
  const idx = pdfStr.indexOf(kw);
  console.log(`Keyword '${kw}': ${idx !== -1 ? `found at pos ${idx}` : 'not found'}`);
});
