import os
from PIL import Image

dir_path = './교과서 이미지'

gallery_html = """<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <title>기후 & 마추픽추 교과서 도판 시각적 정밀 확인</title>
  <style>
    body { font-family: sans-serif; background: #0f172a; color: white; padding: 20px; }
    .sec { background: #1e293b; border-radius: 16px; padding: 20px; margin-bottom: 25px; }
    .title { font-size: 20px; font-weight: bold; color: #38bdf8; margin-bottom: 15px; border-bottom: 2px solid #0284c7; padding-bottom: 6px; }
    .grid { display: flex; flex-wrap: wrap; gap: 15px; }
    .card { background: #090d16; padding: 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.15); max-width: 320px; }
    .card img { width: 100%; height: 220px; object-fit: contain; background: #000; border-radius: 6px; }
    .fn { font-size: 13px; font-weight: bold; color: #f59e0b; margin-bottom: 6px; word-break: break-all; }
  </style>
</head>
<body>
  <h1>🔎 7개 문제 지점 후보 도판 전체 목록</h1>
"""

targets = {
  "1. 마추픽추 (Textbook Page 13p)": ["초등_사회 6-2_1_교과서_13p_1.jpg", "초등_사회 6-2_1_교과서_13p_2.jpg", "초등_사회 6-2_1_교과서_13p_3.jpg", "초등_사회 6-2_1_교과서_13p_4.jpg", "초등_사회 6-2_1_교과서_13p_5.jpg", "초등_사회 6-2_1_교과서_13p_6.jpg"],
  "2. 열대 기후 (Textbook Page 27p, 28p)": ["초등_사회 6-2_1_교과서_27p_1.jpg", "초등_사회 6-2_1_교과서_27p_2.jpg", "초등_사회 6-2_1_교과서_27p_3.jpg", "초등_사회 6-2_1_교과서_27p_4.jpg", "초등_사회 6-2_1_교과서_28p_1.jpg", "초등_사회 6-2_1_교과서_28p_2.jpg"],
  "3. 건조 기후 (Textbook Page 27p, 29p, 30p)": ["초등_사회 6-2_1_교과서_27p_2.jpg", "초등_사회 6-2_1_교과서_30p_1.jpg"],
  "4. 온대 기후 (Textbook Page 31p, 32p)": ["초등_사회 6-2_1_교과서_31p_1.jpg", "초등_사회 6-2_1_교과서_32p_1.jpg", "초등_사회 6-2_1_교과서_32p_2.jpg", "초등_사회 6-2_1_교과서_32p_3.jpg"],
  "5. 냉대 기후 (Textbook Page 33p, 34p, 42p)": ["초등_사회 6-2_1_교과서_33p_1.jpg", "초등_사회 6-2_1_교과서_42p_5.jpg"],
  "6. 한대 기후 (Textbook Page 35p)": ["초등_사회 6-2_1_교과서_35p_1.jpg", "초등_사회 6-2_1_교과서_35p_2.jpg", "초등_사회 6-2_1_교과서_35p_3.jpg", "초등_사회 6-2_1_교과서_35p_4.jpg", "초등_사회 6-2_1_교과서_35p_5.jpg", "초등_사회 6-2_1_교과서_35p_6.jpg"],
  "7. 고산 기후 (Textbook Page 36p, 37p)": ["초등_사회 6-2_1_교과서_36p_1.jpg", "초등_사회 6-2_1_교과서_36p_2.jpg", "초등_사회 6-2_1_교과서_36p_3.jpg", "초등_사회 6-2_1_교과서_36p_4.jpg", "초등_사회 6-2_1_교과서_36p_5.jpg", "초등_사회 6-2_1_교과서_37p_1.jpg", "초등_사회 6-2_1_교과서_37p_4.jpg", "초등_사회 6-2_1_교과서_37p_5.jpg"]
}

for section, fnames in targets.items():
    gallery_html += f'<div class="sec"><div class="title">{section}</div><div class="grid">'
    for fn in fnames:
        fpath = os.path.join(dir_path, fn)
        if os.path.exists(fpath):
            with Image.open(fpath) as img:
                w, h = img.size
                gallery_html += f'''
                <div class="card">
                  <div class="fn">{fn} ({w}x{h})</div>
                  <img src="./교과서 이미지/{fn}" />
                </div>
                '''
    gallery_html += '</div></div>'

gallery_html += '</body></html>'

with open('climate_gallery.html', 'w', encoding='utf-8') as f:
    f.write(gallery_html)

print("climate_gallery.html generated successfully!")
