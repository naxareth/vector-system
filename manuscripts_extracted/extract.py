from html.parser import HTMLParser

class TextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.text = []
    def handle_data(self, d):
        self.text.append(d)

p = TextExtractor()
with open('c:/vector-system/manuscripts_extracted/manuscripts.html', 'r', encoding='utf-8') as f:
    p.feed(f.read())

with open('c:/vector-system/manuscripts_extracted/manuscript_text.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(p.text))

print("Done - wrote", len(p.text), "text nodes")
