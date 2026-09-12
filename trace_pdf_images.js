import fs from 'fs';

// Let's inspect the binary text of PDF page objects for pages 10, 11, 12, 13, 27, 31, 33, 35, 36
// to see which Image XObject maps to which figure text!
const pdfBuffer = fs.readFileSync('사회(교과서) 6-2-1.pdf');

console.log('PDF Read complete, size:', pdfBuffer.length);
