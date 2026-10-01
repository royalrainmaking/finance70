import sys

with open('index.html', 'r', encoding='utf-8') as f:
    text = f.read()

start = text.find('<script>')
end = text.rfind('</script>')
js = text[start+8:end]

state = 'CODE' # CODE, STRING1, STRING2, TEMPLATE, SL_COMMENT, ML_COMMENT, REGEX
stack = []
escape = False
i = 0

while i < len(js):
    char = js[i]
    next_char = js[i + 1] if i + 1 < len(js) else ''
    line = text[:start+8+i].count('\n') + 1

    if state == 'SL_COMMENT':
        if char == '\n':
            state = 'CODE'
    elif state == 'ML_COMMENT':
        if char == '*' and next_char == '/':
            state = 'CODE'
            i += 1
    elif state in ('STRING1', 'STRING2'):
        if escape:
            escape = False
        elif char == '\\':
            escape = True
        elif state == 'STRING1' and char == "'":
            state = 'CODE'
        elif state == 'STRING2' and char == '"':
            state = 'CODE'
    elif state == 'TEMPLATE':
        if escape:
            escape = False
        elif char == '\\':
            escape = True
        elif char == '`':
            state = 'CODE'
        elif char == '$' and next_char == '{':
            stack.append(('${', line))
            state = 'CODE'
            i += 1
    elif state == 'REGEX':
        if escape:
            escape = False
        elif char == '\\':
            escape = True
        elif char == '/':
            state = 'CODE'
    elif state == 'CODE':
        if char == '/' and next_char == '/':
            state = 'SL_COMMENT'
            i += 1
        elif char == '/' and next_char == '*':
            state = 'ML_COMMENT'
            i += 1
        elif char == "'":
            state = 'STRING1'
        elif char == '"':
            state = 'STRING2'
        elif char == '`':
            state = 'TEMPLATE'
        elif char == '{':
            stack.append(('{', line))
        elif char == '}' and len(stack) > 0 and stack[-1][0] == '${':
            # This is closing a template expression
            stack.pop()
            state = 'TEMPLATE'
        elif char == '}' and len(stack) > 0 and stack[-1][0] == '{':
            stack.pop()
        elif char == '}':
            print(f"Error: Unmatched }} at line {line}")
        elif char == '(':
            stack.append(('(', line))
        elif char == ')':
            if len(stack) > 0 and stack[-1][0] == '(':
                stack.pop()
            else:
                print(f"Error: Unmatched ) at line {line}")
        elif char == '[':
            stack.append(('[', line))
        elif char == ']':
            if len(stack) > 0 and stack[-1][0] == '[':
                stack.pop()
            else:
                print(f"Error: Unmatched ] at line {line}")
    i += 1

print(f"Final state: {state}")
for unclosed, line in stack:
    print(f"Unclosed {unclosed} from line {line}")
