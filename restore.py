import json
import re

log_file = r'C:\Users\Administrator\.gemini\antigravity-ide\brain\4a35cdd1-e9dd-4ca2-88cd-bba68a2e7181\.system_generated\logs\transcript.jsonl'
with open(log_file, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            data = json.loads(line)
            if data.get('type') == 'TOOL_RESPONSE' and 'index.html' in str(data):
                content = data.get('content', '')
                if '1: <!DOCTYPE html>' in content and '291:                 <th style="width:120px; text-align:center;">????? / ???????</th>' in content:
                    start = content.find('1: <!DOCTYPE html>')
                    end = content.find('The above content', start)
                    if end == -1: end = content.find('The following code', start)
                    if end == -1: end = len(content)
                    
                    lines_text = content[start:end]
                    
                    out_lines = []
                    for l in lines_text.split('\n'):
                        l = re.sub(r'^\d+:\s', '', l)
                        if l.strip() or not out_lines or out_lines[-1].strip():
                            out_lines.append(l)
                    
                    if len(out_lines) > 700:
                        with open(r'c:\Users\Administrator\Desktop\finance2-main\index.html', 'w', encoding='utf-8') as outf:
                            outf.write('\n'.join(out_lines))
                        print(f'Restored {len(out_lines)} lines successfully')
                        break
        except Exception as e:
            pass
