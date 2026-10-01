import os

with open(r'c:\Users\Administrator\Desktop\finance2-main\index_backup.html', 'r', encoding='utf-8') as f:
    backup_lines = f.readlines()

with open(r'c:\Users\Administrator\Desktop\finance_temp\finance-main\index.html', 'r', encoding='utf-8') as f:
    old_lines = f.readlines()

# Part 1: Backup lines from start up to <th style="width:70px; text-align:center;">ID</th>
part1 = []
for i, line in enumerate(backup_lines):
    part1.append(line)
    if 'text-align:center;">ID</th>' in line:
        break

# Part 2: Old lines from after ID</th> to end of view-offset
# Find ID</th> in old_lines
start_old = 0
for i, line in enumerate(old_lines):
    if 'text-align:center;">ID</th>' in line and 'toggleAllRows' in old_lines[i-1]:
        start_old = i + 1
        break

end_old = 0
for i in range(start_old, len(old_lines)):
    if '<!-- CANCEL -->' in old_lines[i]:
        end_old = i
        break

part2 = old_lines[start_old:end_old]

# Part 3: Backup lines from <!-- CANCEL --> to end
start_backup_end = 0
for i, line in enumerate(backup_lines):
    if '<!-- CANCEL -->' in line:
        start_backup_end = i
        break

part3 = backup_lines[start_backup_end:]

final_lines = part1 + part2 + part3

with open(r'c:\Users\Administrator\Desktop\finance2-main\index.html', 'w', encoding='utf-8') as f:
    f.writelines(final_lines)

print(f'Reconstructed index.html with {len(final_lines)} lines')
