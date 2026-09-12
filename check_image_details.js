import fs from 'fs';

// Helper to parse JPEG header width and height
function getJpegSize(filePath) {
  const buffer = fs.readFileSync(filePath);
  let i = 0;
  if (buffer[i] !== 0xFF || buffer[i+1] !== 0xD8) return null; // Not JPEG
  i += 2;
  while (i < buffer.length) {
    const marker = buffer[i+1];
    if (marker === 0xC0 || marker === 0xC2) { // SOF0 or SOF2
      const height = buffer.readUInt16BE(i + 5);
      const width = buffer.readUInt16BE(i + 7);
      return { width, height };
    }
    i += 2 + buffer.readUInt16BE(i + 2);
  }
  return null;
}

const dir = './교과서 이미지';
const files = fs.readdirSync(dir);

const keyPages = [10, 11, 12, 13, 24, 27, 28, 29, 31, 32, 33, 35, 36, 37];
keyPages.forEach(p => {
  const pFiles = files.filter(f => f.startsWith(`초등_사회 6-2_1_교과서_${p}p_`));
  console.log(`=== Page ${p}p ===`);
  pFiles.forEach(f => {
    const size = getJpegSize(`${dir}/${f}`);
    const stats = fs.statSync(`${dir}/${f}`);
    console.log(`  ${f} -> ${size ? `${size.width}x${size.height}` : 'unknown'}, ${Math.round(stats.size/1024)} KB`);
  });
});
