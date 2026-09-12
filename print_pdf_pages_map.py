import json

with open('extracted_text.txt', 'r', encoding='utf-8') as f:
    data = json.load(f)

print("PDF Page Mapping from extracted_text.txt:")
for p in data['pages']:
    lines = [l.strip() for l in p['text'].split('\n') if l.strip()]
    heading = ' | '.join(lines[:3]) if lines else 'Empty'
    print(f"PDF Page {p['num']:2d}: {heading[:100]}")
