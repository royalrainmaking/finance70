import pyjsparser
import sys

with open('index.html', 'r', encoding='utf-8') as f:
    text = f.read()

start = text.find('<script>')
end = text.rfind('</script>')
js = text[start+8:end]

parser = pyjsparser.PyJsParser()
try:
    parser.parse(js)
    print("No errors found!")
except Exception as e:
    print(f"Syntax Error: {e}")
