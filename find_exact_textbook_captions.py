import pdfplumber

pdf_path = "사회(교과서) 6-2-1.pdf"

# PDF pages for textbook pages:
# Textbook Page 13 = PDF Page 4
# Textbook Page 27 = PDF Page 18
# Textbook Page 28 = PDF Page 19
# Textbook Page 29 = PDF Page 20
# Textbook Page 30 = PDF Page 21
# Textbook Page 31 = PDF Page 22
# Textbook Page 32 = PDF Page 23
# Textbook Page 33 = PDF Page 24
# Textbook Page 34 = PDF Page 25
# Textbook Page 35 = PDF Page 26
# Textbook Page 36 = PDF Page 27
# Textbook Page 37 = PDF Page 28

target_map = {
    4: "Textbook 13p (Machu Picchu & Alps)",
    18: "Textbook 27p (Tropical & Dry Climate)",
    19: "Textbook 28p (Tropical Life)",
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
    for pdf_p, label in target_map.items():
        page = pdf.pages[pdf_p - 1]
        print(f"\n==================== {label} ====================")
        images = page.images
        words = page.extract_words()
        
        for idx, img in enumerate(images):
            ix0, itop, ix1, ibot = img['x0'], img['top'], img['x1'], img['bottom']
            # Find words near this image bbox (within 40px margin)
            near_words = [w['text'] for w in words if (ix0 - 30 <= w['x0'] <= ix1 + 30) and (itop - 30 <= w['top'] <= ibot + 30)]
            caption = " ".join(near_words)
            print(f"  Img #{idx+1} ({img['width']:.0f}x{img['height']:.0f} at y={itop:.0f}): '{caption[:80]}'")
