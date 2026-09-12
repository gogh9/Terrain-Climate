import os
import json

with open('extracted_text.txt', 'r', encoding='utf-8') as f:
    data = json.load(f)

print("Searching exact PDF Page numbers for each topic:")

topic_keywords = {
    "지형_몽블랑": ["몽블랑산", "알프스산맥에서 가장 높다"],
    "지형_사하라": ["사하라 사막", "가장 면적이 넓은 사막"],
    "지형_몽골": ["몽골", "초원이 넓게 펼쳐져"],
    "지형_콜로라도": ["콜로라도강", "로키산맥에서 시작해"],
    "지형_칸쿤": ["칸쿤 해변", "멕시코 카리브해"],
    "지형_빙하": ["페리토모레노", "빙하로 덮여"],
    "지형_아비시니아": ["아비시니아고원", "에티오피아"],
    "지형_마우나로아": ["마우나로아산", "미국 하와이섬"],
    "지형_마추픽추": ["마추픽추", "잉카 문명"],
    
    "기후_열대": ["열대 기후는 가장 추운", "열대 우림", "고상 가옥"],
    "기후_건조": ["건조 기후는 강수량보다", "흙벽돌집", "오아시스"],
    "기후_온대": ["온대 기후는 가장 추운", "벼농사", "지중해성"],
    "기후_냉대": ["냉대 기후는 가장 추운", "침엽수림", "통나무집"],
    "기후_한대": ["한대 기후는 가장 따뜻한", "이누이트", "툰드라"],
    "기후_고산": ["고산 기후는 해발", "상춘", "라파스", "쿠스코"]
}

for topic, kws in topic_keywords.items():
    found_pages = []
    for p in data['pages']:
        text = p['text']
        if any(k in text for k in kws):
            found_pages.append(p['num'])
    print(f"[{topic}]: Found in PDF Pages -> {found_pages}")
