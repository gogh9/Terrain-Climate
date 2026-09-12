import os

img_dir = "./교과서 이미지"

final_mapping = {
  'landform_montblanc': '초등_사회 6-2_1_교과서_10p_2.jpg',
  'landform_sahara': '초등_사회 6-2_1_교과서_10p_3.jpg',
  'landform_mongolia': '초등_사회 6-2_1_교과서_10p_4.jpg',
  'landform_colorado': '초등_사회 6-2_1_교과서_11p_1.jpg',
  'landform_cancun': '초등_사회 6-2_1_교과서_11p_2.jpg',
  'landform_perito': '초등_사회 6-2_1_교과서_11p_3.jpg',
  'landform_abyssinia': '초등_사회 6-2_1_교과서_12p_2.jpg',
  'landform_maunaloa': '초등_사회 6-2_1_교과서_12p_4.jpg',
  'landform_machupicchu': '초등_사회 6-2_1_교과서_13p_2.jpg',
  'climate_tropical': '초등_사회 6-2_1_교과서_28p_2.jpg', # 열대 기후 고상 가옥
  'climate_dry': '초등_사회 6-2_1_교과서_30p_1.jpg', # 건조 기후 흙벽돌집
  'climate_temperate': '초등_사회 6-2_1_교과서_32p_3.jpg', # 온대 기후 지중해식 가옥/농업
  'climate_boreal': '초등_사회 6-2_1_교과서_42p_5.jpg', # 냉대 기후 침엽수 통나무집
  'climate_polar': '초등_사회 6-2_1_교과서_35p_3.jpg', # 한대 기후 그린란드 고상가옥
  'climate_highland': '초등_사회 6-2_1_교과서_36p_5.jpg' # 고산 기후 페루 쿠스코 원주민/라파스
}

all_ok = True
for key, fname in final_mapping.items():
    fpath = os.path.join(img_dir, fname)
    exists = os.path.exists(fpath)
    if not exists:
        all_ok = False
        print(f"[FAIL] [{key}] {fname} NOT FOUND!")
    else:
        print(f"[OK] [{key}] {fname} EXISTS!")

if all_ok:
    print("\nALL 15 IMAGE FILES EXIST AND ARE READY!")
