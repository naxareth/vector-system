import uuid
import random

wallets = [
    '0xbda5747bfd65f08deb54cb465eb87d40e51b197e',
    '0x9965507d1a55bcc2695c58ba16fb37d819b0a4dc'
]
degrees = [
    'Bachelor of Science in Information Technology',
    'Bachelor of Science in Computer Science',
    'Bachelor of Science in Accountancy',
    'Bachelor of Science in Criminology',
    'Bachelor of Science in Computer Engineering'
]
majors = [
    'Web Development',
    'Artificial Intelligence',
    'Financial Management',
    'Criminal Law',
    'Embedded Systems'
]
honors_list = [
    'Summa Cum Laude',
    'Magna Cum Laude',
    "Dean's Lister",
    'Cum Laude',
    'Dean\'s Lister'
]
skills_list = [
    '"React, Node.js, Python"',
    '"Python, Machine Learning, TensorFlow"',
    '"Accounting, Taxation, Auditing"',
    '"Criminal Justice, Research"',
    '"C++, FPGA, RTOS"'
]

lines = ['student_id,wallet_address,degree_name,major,gpa,honors,graduation_date,skill_tags']
for i in range(500):
    sid = str(uuid.uuid4())
    w = wallets[i % 2]
    d = degrees[i % 5]
    m = majors[i % 5]
    gpa = round(random.uniform(1.0, 3.0), 2)
    h = honors_list[i % 5]
    sk = skills_list[i % 5]
    lines.append(f'{sid},{w},{d},{m},{gpa},{h},2026-07-20,{sk}')

with open('c:/vector-system/test-perf-500rows.csv', 'w', newline='') as f:
    f.write('\n'.join(lines))
print(f'Generated 500-row CSV ({len(lines)-1} data rows)')
