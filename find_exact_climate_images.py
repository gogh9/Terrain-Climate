import os
import pdfplumber
from PIL import Image

pdf_path = "사회(교과서) 6-2-1.pdf"
img_dir = "./교과서 이미지"
all_img_files = os.listdir(img_dir)

print(f"Total image files in folder: {len(all_img_files)}")

# Let's inspect pages 22 to 38 in pdfplumber (which correspond to climate & Machu Picchu)
# PDF Page 4 = Textbook Page 13 (Machu Picchu)
# PDF Page 18 = Textbook Page 27 (Tropical & Dry Climate)
# PDF Page 19 = Textbook Page 28 (Tropical Life / Shifting cultivation)
# PDF Page 20 = Textbook Page 29 (Dry Climate)
# PDF Page 21 = Textbook Page 30 (Dry Mud Brick House)
# PDF Page 22 = Textbook Page 31 (Temperate Climate)
# PDF Page 23 = Textbook Page 32 (Temperate Agriculture)
# PDF Page 24 = Textbook Page 33 (Boreal Climate / Taiga)
# PDF Page 25 = Textbook Page 34 (Boreal Life / Log house)
# PDF Page 26 = Textbook Page 35 (Polar Climate / Tundra / Stilt house)
# PDF Page 27 = Textbook Page 36 (Highland Climate / La Paz / Cuzco)
# PDF Page 28 = Textbook Page 37 (Highland Life / Poncho)

target_pdf_pages = {
    4: "Textbook 13p (Machu Picchu)",
    18: "Textbook 27p (Tropical & Dry Climate)",
    19: "Textbook 28p (Tropical Life)",
    20: "Textbook 29p (Dry Climate)",
    21: "Textbook 30p (Dry House)",
    22: "Textbook 31p (Temperate Climate)",
    23: "Textbook 32p (Temperate Life)",
    24: "Textbook 33p (Boreal Climate)",
    25: "Textbook 34p (Boreal Life)",
    26: "Textbook 35p (Polar Climate)",
    27: "Textbook 36p (Highland Climate)",
    28: "Textbook 37p (Highland Life)"
}

with pdfplumber.open(pdf_path) as pdf:
    for pdf_p_num, label in target_pdf_pages.items():
        page = pdf.pages[pdf_p_num - 1]
        textbook_p_num = pdf_p_num + 9
        matching_files = [f for f in all_img_files if f.startswith(f"초등_사회 6-2_1_교과서_{textbook_p_num}p_")]
        print(f"\n==================== {label} -> Files ({len(matching_files)}): {matching_files} ====================")
        
        words = page.extract_words()
        for w in words:
            if any(k in w['text'] for k in ['마추픽추', '열대', '건조', '온대', '냉대', '한대', '고산', '우림', '사막', '벼농사', '밀농사', '타이가', '통나무집', '고상', '툰드라', '라파스', '쿠스코', '흙벽돌', '판초']):
                print(f"   Word '{w['text']}' @ top={w['top']:.1f}, x0={w['x0']:.1f}")

