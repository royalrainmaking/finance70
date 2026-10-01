import json
import re

log_file = r'C:\Users\Administrator\.gemini\antigravity-ide\brain\4a35cdd1-e9dd-4ca2-88cd-bba68a2e7181\.system_generated\logs\transcript.jsonl'
with open(log_file, 'r', encoding='utf-8') as f:
    lines = f.readlines()

for line in lines:
    try:
        data = json.loads(line)
        if data.get('type') == 'TOOL_RESPONSE' and 'Total Lines: 835' in line and 'index.html' in line:
            content = data.get('content', '')
            if isinstance(content, dict):
                content = content.get('output', '')
            elif isinstance(content, list):
                content = content[0].get('content', '')
            elif isinstance(content, str):
                pass
            
            # The content might be in a different field
            if not content and 'tool_calls' in data:
                # sometimes tool responses are inside tool_calls?
                pass
                
            # let's just do string search on the raw line!
            start_marker = '1: <!DOCTYPE html>'
            start = line.find(start_marker)
            if start != -1:
                end = line.find('The above content', start)
                if end == -1: end = line.find('The following code', start)
                if end == -1: end = len(line)
                
                raw_html = line[start:end]
                # decode unicode escapes
                raw_html = raw_html.encode('utf-8').decode('unicode_escape')
                
                out = []
                for l in raw_html.split(r'\n'):
                    l = re.sub(r'^\d+:\s', '', l)
                    out.append(l)
                    
                if len(out) > 700:
                    with open(r'c:\Users\Administrator\Desktop\finance2-main\index.html', 'w', encoding='utf-8') as outf:
                        outf.write('\n'.join(out))
                    print(f'Restored {len(out)} lines')
                    break
    except Exception as e:
        print(e)
