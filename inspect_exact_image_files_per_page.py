import os
from PIL import Image

dir_path = './교과서 이미지'

pdf_page_map = {
    "1. 몽블랑 / 사하라 / 몽골 (PDF Page 1)": [1],
    "2. 콜로라도강 / 칸쿤 / 빙하 (PDF Page 2)": [2],
    "3. 아비시니아 / 마우나로아 (PDF Page 3)": [3],
    "4. 마추픽추 (PDF Page 4)": [4],
    "5. 열대 기후 (PDF Page 27, 28)": [27, 28],
    "6. 건조 기후 (PDF Page 29, 30)": [29, 30],
    "7. 온대 기후 (PDF Page 31, 32)": [31, 32],
    "8. 냉대 기후 (PDF Page 33, 34)": [33, 34],
    "9. 한대 기후 (PDF Page 35)": [35],
    "10. 고산 기후 (PDF Page 36, 37)": [36, 37]
}

all_files = os.listdir(dir_path)

for label, p_list in pdf_page_map.items():
    print(f"\n==================== {label} ====================")
    matched = []
    for p in p_list:
        matched.extend([f for f in all_files if f.startswith(f'초등_사회 6-2_1_교과서_{p}p_')])
    print(f"Files ({len(matched)}): {matched}")
    for f in matched:
        with Image.open(os.path.join(dir_path, f)) as img:
            w, h = img.size
            print(f"  - {f}: {w}x{h} px ({w/h:.2f} aspect ratio)")
