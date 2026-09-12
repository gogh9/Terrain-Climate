import os
from PIL import Image

img_dir = "./교과서 이미지"
files = os.listdir(img_dir)

html = """<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <title>교과서 이미지 141개 전체 시각적 검증 갤러리</title>
  <style>
    body { font-family: 'Noto Sans KR', sans-serif; background: #0f172a; color: #f8fafc; padding: 20px; }
    h1 { color: #38bdf8; text-align: center; margin-bottom: 20px; }
    .page-group { background: #1e293b; border-radius: 16px; padding: 20px; margin-bottom: 30px; border: 1px solid rgba(255,255,255,0.1); }
    .group-title { font-size: 20px; color: #f59e0b; border-bottom: 2px solid #3b82f6; padding-bottom: 8px; margin-bottom: 16px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
    .card { background: #090d16; border-radius: 12px; padding: 12px; border: 1px solid rgba(255,255,255,0.15); display: flex; flex-direction: column; gap: 8px; }
    .card img { width: 100%; height: 200px; object-fit: contain; background: #000; border-radius: 8px; }
    .fname { font-size: 13px; font-weight: bold; color: #38bdf8; word-break: break-all; }
    .meta { font-size: 11px; color: #94a3b8; }
  </style>
</head>
<body>
  <h1>📸 교과서 이미지 141개 전체 시각적 검증 갤러리</h1>
"""

by_page = {}
for f in files:
    m = f.match if hasattr(f, 'match') else None
    parts = f.split('교과서_')
    if len(parts) > 1:
        p_part = parts[1].split('p_')[0]
        try:
            p_num = int(p_part)
            if p_num not in by_page:
                by_page[p_num] = []
            by_page[p_num].append(f)
        except ValueError:
            pass

for p_num in sorted(by_page.keys()):
    html += f'<div class="page-group"><div class="group-title">📄 파일명 기준 {p_num}p 그룹 ({len(by_page[p_num])}개)</div><div class="grid">'
    for f in by_page[p_num]:
        fpath = os.path.join(img_dir, f)
        try:
            with Image.open(fpath) as img:
                w, h = img.size
                html += f'''
                <div class="card">
                  <div class="fname">{f}</div>
                  <div class="meta">해상도: {w}x{h} px | 크기: {round(os.path.getsize(fpath)/1024)} KB</div>
                  <img src="./교과서 이미지/{f}" alt="{f}" />
                </div>
                '''
        except Exception as e:
            pass
    html += '</div></div>'

html += '</body></html>'

with open("view_all_textbook_images.html", "w", encoding="utf-8") as f:
    f.write(html)

print("view_all_textbook_images.html successfully generated!")
