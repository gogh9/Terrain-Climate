import os
from PIL import Image

dir_path = './교과서 이미지'

mapping = {
    'landform_machupicchu': '초등_사회 6-2_1_교과서_13p_6.jpg', # 마추픽추 고대 도시 전경
    'climate_tropical': '초등_사회 6-2_1_교과서_27p_1.jpg', # 열대 우림 밀림
    'climate_dry': '초등_사회 6-2_1_교과서_27p_2.jpg',      # 건조 기후 사막
    'climate_temperate': '초등_사회 6-2_1_교과서_32p_2.jpg',  # 온대 기후 서유럽 농경지 & 가축
    'climate_boreal': '초등_사회 6-2_1_교과서_33p_1.jpg',     # 냉대 기후 타이가 침엽수림
    'climate_polar': '초등_사회 6-2_1_교과서_35p_3.jpg',      # 한대 기후 그린란드 고상 가옥
    'climate_highland': '초등_사회 6-2_1_교과서_36p_4.jpg'    # 고산 기후 볼리비아 라파스 고산 도시
}

print("Verifying target 7 images:")
for spot, fname in mapping.items():
    fpath = os.path.join(dir_path, fname)
    if os.path.exists(fpath):
        with Image.open(fpath) as img:
            print(f"  [OK] {spot} -> {fname} ({img.size[0]}x{img.size[1]} px)")
    else:
        print(f"  [MISSING] {spot} -> {fname} NOT FOUND!")
