import json
import re

with open('raw_line.txt', 'r', encoding='utf-16') as f:
    text = f.read()

# find the string '1: <!DOCTYPE html>'
start = text.find('1: <!DOCTYPE html>')
if start != -1:
    end = text.find('The above content', start)
    if end == -1: end = text.find('\"}', start)
    if end == -1: end = len(text)
    
    raw = text[start:end]
    raw = raw.replace('\\n', '\n').replace('\\\"', '\"').replace('\\\\', '\\')
    
    out = []
    for l in raw.split('\n'):
        l = re.sub(r'^\d+:\s', '', l)
        out.append(l)
        
    with open('index_recovered.html', 'w', encoding='utf-8') as outf:
        outf.write('\n'.join(out))
    print(f'Recovered {len(out)} lines')
else:
    print('Not found')
