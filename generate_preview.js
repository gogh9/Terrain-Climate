import fs from 'fs';
import path from 'path';

const dir = './교과서 이미지';
const files = fs.readdirSync(dir);

let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Image Inspector</title>
  <style>
    body { font-family: sans-serif; background: #0f172a; color: white; padding: 20px; }
    .page-sec { margin-bottom: 30px; padding: 20px; background: #1e293b; border-radius: 12px; }
    .img-grid { display: flex; flex-wrap: wrap; gap: 15px; }
    .card { background: #334155; padding: 10px; border-radius: 8px; max-width: 320px; }
    img { width: 100%; max-height: 220px; object-fit: contain; background: #000; border-radius: 4px; }
    .title { font-size: 14px; font-weight: bold; margin-bottom: 8px; word-break: break-all; }
  </style>
</head>
<body>
  <h1>교과서 이미지 전체 목록 (141개)</h1>
`;

const pages = {};
files.forEach(f => {
  const m = f.match(/교과서_(\d+)p_(\d+)/);
  if (m) {
    const p = parseInt(m[1]);
    if (!pages[p]) pages[p] = [];
    pages[p].push(f);
  }
});

Object.keys(pages).map(Number).sort((a,b)=>a-b).forEach(p => {
  html += `<div class="page-sec"><h2>Textbook Page ${p} (${pages[p].length}개)</h2><div class="img-grid">`;
  pages[p].forEach(f => {
    html += `<div class="card"><div class="title">${f}</div><img src="./교과서 이미지/${f}" /></div>`;
  });
  html += `</div></div>`;
});

html += `</body></html>`;
fs.writeFileSync('image_preview.html', html);
console.log('image_preview.html successfully generated!');
