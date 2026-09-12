import os

img_dir = "./교과서 이미지"

climate_files = [
    '열대기후.jpg',
    '건조기후.jpg',
    '온대기후.jpg',
    '냉대기후.jpg',
    '한대기후.jpg',
    '고산기후.jpg'
]

print("Checking user renamed climate files:")
for cf in climate_files:
    fpath = os.path.join(img_dir, cf)
    if os.path.exists(fpath):
        print(f"[OK] {cf} ({os.path.getsize(fpath)} bytes)")
    else:
        print(f"[FAIL] {cf} NOT FOUND")
