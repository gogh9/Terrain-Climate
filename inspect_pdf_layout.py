import pdfplumber
import os

pdf_path = "사회(교과서) 6-2-1.pdf"

with pdfplumber.open(pdf_path) as pdf:
    print(f"Total pages: {len(pdf.pages)}")
    
    # Check pages corresponding to textbook pages 10..36
    # PDF Page 1 = Textbook Page 10
    # PDF Page 2 = Textbook Page 11
    # PDF Page 3 = Textbook Page 12
    # PDF Page 4 = Textbook Page 13
    # PDF Page 18 = Textbook Page 27
    # PDF Page 22 = Textbook Page 31
    # PDF Page 23 = Textbook Page 32
    # PDF Page 24 = Textbook Page 33
    # PDF Page 26 = Textbook Page 35
    # PDF Page 27 = Textbook Page 36

    target_pages = [1, 2, 3, 4, 18, 22, 23, 24, 26, 27]
    for p_num in target_pages:
        page = pdf.pages[p_num - 1]
        print(f"\n==================== PDF Page {p_num} (Textbook Page {p_num+9 if p_num <= 4 else p_num+9}) ====================")
        
        # Extract images on page
        images = page.images
        print(f"--- Images found: {len(images)} ---")
        for idx, img in enumerate(images):
            print(f"  Img #{idx+1}: x0={img['x0']:.1f}, top={img['top']:.1f}, x1={img['x1']:.1f}, bottom={img['bottom']:.1f}, width={img['width']:.1f}, height={img['height']:.1f}")
        
        # Extract text words with positions
        words = page.extract_words()
        print(f"--- Words sample ({len(words)} total) ---")
        # Print words containing key names
        key_words = [w for w in words if any(k in w['text'] for k in ['몽블랑', '사하라', '몽골', '콜로라도', '칸쿤', '빙하', '아비시니아', '마우나로아', '마추픽추', '열대', '건조', '온대', '냉대', '한대', '고산', '초원', '산지', '하천', '해안', '화산', '고원', '통나무집', '고상', '흙벽돌'])]
        for w in key_words:
            print(f"  Word '{w['text']}': x0={w['x0']:.1f}, top={w['top']:.1f}")
