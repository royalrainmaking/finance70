import re

with open(r'c:\Users\Administrator\Desktop\finance2-main\MainFinancial.gs', 'r', encoding='utf-8') as f:
    text = f.read()

# Fix target loops
replacements = [
    (
        "let target = -1; for (let i=0; i<idData.length; i++) if(idData[i][0] == data.id) { target = i + 5; break; }",
        "let target = -1; for (let i = idData.length - 1; i >= 0; i--) if(idData[i][0].toString().trim() === data.id.toString().trim()) { target = i + 5; break; }"
    ),
    (
        "let target = -1; for (let i=0; i<ids.length; i++) if(ids[i][0].toString().trim() === data.id.toString().trim()) { target = i + 5; break; }",
        "let target = -1; for (let i = ids.length - 1; i >= 0; i--) if(ids[i][0].toString().trim() === data.id.toString().trim()) { target = i + 5; break; }"
    ),
    (
        "for (let i = 0; i < idData.length; i++) {\n    if (idData[i][0].toString() === data.id.toString()) { target = i + 5; break; }\n  }",
        "for (let i = idData.length - 1; i >= 0; i--) {\n    if (idData[i][0].toString().trim() === data.id.toString().trim()) { target = i + 5; break; }\n  }"
    ),
    (
        "let target = -1; for (let i=0; i<idData.length; i++) if(idData[i][0].toString() === data.id.toString()) { target = i + 5; break; }",
        "let target = -1; for (let i = idData.length - 1; i >= 0; i--) if(idData[i][0].toString().trim() === data.id.toString().trim()) { target = i + 5; break; }"
    )
]

for old, new in replacements:
    text = text.replace(old, new)

with open(r'c:\Users\Administrator\Desktop\finance2-main\MainFinancial.gs', 'w', encoding='utf-8') as f:
    f.write(text)

print('Done')
