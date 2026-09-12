import os
from PIL import Image

dir_path = './교과서 이미지'

pages = [13, 22, 23, 24, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37]

for p in pages:
    p_files = [f for f in os.listdir(dir_path) if f.startswith(f'초등_사회 6-2_1_교과서_{p}p_')]
    if not p_files:
        continue
    print(f"\n==================== Page {p}p ({len(p_files)} files) ====================")
    for f in p_files:
        fpath = os.path.join(dir_path, f)
        with Image.open(fpath) as img:
            w, h = img.size
            print(f"  File: {f} -> Size: {w}x{h}, Ratio: {w/h:.2f}")
