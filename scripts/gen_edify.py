import csv, random

random.seed(42)

first_names = [
    'Alex','Jordan','Sam','Taylor','Morgan','Casey','Riley','Avery','Blake','Quinn',
    'Drew','Jamie','Peyton','Skyler','Dakota','Reese','Hayden','Rowan','Finley','Emery',
    'Logan','Kendall','Parker','Sage','River','Phoenix','Addison','Bailey','Cameron','Devon',
    'Marcus','Priya','Yuki','Omar','Fatima','Lena','Dmitri','Sienna','Kwame','Ingrid',
    'Rafael','Zara','Nathan','Chloe','Isaiah','Maya','Ethan','Sofia','Aiden','Grace',
]

last_names = [
    'Chen','Rodriguez','Johnson','Williams','Brown','Davis','Miller','Wilson','Moore','Taylor',
    'Anderson','Thomas','Jackson','White','Harris','Martin','Thompson','Garcia','Martinez',
    'Robinson','Clark','Lewis','Lee','Walker','Hall','Allen','Young','King','Scott','Green',
    'Baker','Adams','Nelson','Carter','Mitchell','Turner','Phillips','Campbell','Evans','Collins',
    'Stewart','Sanchez','Morris','Rogers','Reed','Cook','Morgan','Bell','Murphy','Bailey',
    'Rivera','Cooper','Richardson','Cox','Howard','Ward','Torres','Peterson','Gray','Ramirez',
    'James','Watson','Brooks','Kelly','Sanders','Price','Bennett','Wood','Barnes','Ross',
]

majors = [
    'CS','ME','EE','CE','ChE','Geology','Physics','Mathematics',
    'Mining_Eng','Petroleum_Eng','Environmental_Eng','Applied_Math',
    'Economics','Metallurgical_Eng',
]

statuses = ['Enrolled','Enrolled','Enrolled','Enrolled','Part-time','Leave_of_Absence','Withdrawn','Graduated']
housing  = ['On-campus','Off-campus','Commuter']
degrees  = ['BS','BS','BS','MS','PhD']
residency = ['In-state','In-state','Out-of-state','International']

# ── V3 ──────────────────────────────────────────────────────────────────────
v3_headers = [
    'student_id','first_name','last_name','email','date_of_birth','ssn_last4','gpa',
    'major','enrollment_status','enrollment_year','credits_completed','financial_aid_amount',
    'tuition_balance','scholarship_amount','fafsa_filed','transcript_gpa','grade_points',
    'advisor_id','housing_status','disability_accommodation',
]

v3_rows = []
for i in range(120):
    fn = random.choice(first_names)
    ln = random.choice(last_names)
    sid = 10001 + i
    yr, mo, dy = random.randint(1999,2004), random.randint(1,12), random.randint(1,28)
    dob = f'{yr}-{mo:02d}-{dy:02d}'
    ssn4 = str(random.randint(1000, 9999))
    gpa = round(random.uniform(1.5, 4.0), 2)
    major = random.choice(majors)
    enroll_yr = random.randint(2019, 2024)
    status = random.choice(statuses)
    credits = random.randint(15, 128)
    fin_aid = random.choice([0, 0, random.randint(2000, 22000)])
    tuition = random.randint(18000, 42000)
    scholarship = random.choice([0, 0, random.randint(1000, 18000)])
    fafsa = random.choice(['TRUE','FALSE'])
    t_gpa = round(max(1.0, min(4.0, gpa + random.uniform(-0.1, 0.1))), 2)
    grade_pts = round(t_gpa * credits, 1)
    advisor = f'ADV{random.randint(100,120)}'
    house = random.choice(housing)
    disability = random.choice(['FALSE','FALSE','FALSE','TRUE'])
    v3_rows.append([sid, fn, ln, f'{fn[0].lower()}{ln.lower()}@mines.edu', dob, ssn4, gpa,
                    major, status, enroll_yr, credits, fin_aid, tuition, scholarship,
                    fafsa, t_gpa, grade_pts, advisor, house, disability])

with open('backend/mock_data/edify_v3.csv', 'w', newline='', encoding='utf-8') as f:
    w = csv.writer(f)
    w.writerow(v3_headers)
    w.writerows(v3_rows)

# ── V4 (schema drift from v3) ────────────────────────────────────────────────
# Removed: student_id → banner_id, dropped ssn_last4 / grade_points / advisor_id / housing_status
# Added:   medical_hold, degree_program, expected_graduation, residency_status
v4_headers = [
    'banner_id','first_name','last_name','email','date_of_birth','gpa','major',
    'enrollment_status','enrollment_year','credits_completed','financial_aid_amount',
    'tuition_balance','scholarship_amount','fafsa_filed','transcript_gpa',
    'medical_hold','disability_accommodation','degree_program','expected_graduation','residency_status',
]

v4_rows = []
for i in range(120):
    fn = random.choice(first_names)
    ln = random.choice(last_names)
    bid = f'B{10001+i}'
    yr, mo, dy = random.randint(1999,2004), random.randint(1,12), random.randint(1,28)
    dob = f'{yr}-{mo:02d}-{dy:02d}'
    gpa = round(random.uniform(1.5, 4.0), 2)
    major = random.choice(majors)
    enroll_yr = random.randint(2019, 2024)
    status = random.choice(statuses)
    credits = random.randint(15, 128)
    fin_aid = random.choice([0, 0, random.randint(2000, 22000)])
    tuition = random.randint(18000, 42000)
    scholarship = random.choice([0, 0, random.randint(1000, 18000)])
    fafsa = random.choice(['TRUE','FALSE'])
    t_gpa = round(max(1.0, min(4.0, gpa + random.uniform(-0.1, 0.1))), 2)
    medical = random.choice(['FALSE','FALSE','FALSE','TRUE'])
    disability = random.choice(['FALSE','FALSE','FALSE','TRUE'])
    degree = random.choice(degrees)
    grad_yr = enroll_yr + (2 if degree == 'MS' else 5 if degree == 'PhD' else 4)
    expected_grad = f'{grad_yr}-05-15'
    res = random.choice(residency)
    v4_rows.append([bid, fn, ln, f'{fn[0].lower()}{ln.lower()}@mines.edu', dob, gpa, major,
                    status, enroll_yr, credits, fin_aid, tuition, scholarship, fafsa,
                    t_gpa, medical, disability, degree, expected_grad, res])

with open('backend/mock_data/edify_v4.csv', 'w', newline='', encoding='utf-8') as f:
    w = csv.writer(f)
    w.writerow(v4_headers)
    w.writerows(v4_rows)

print(f'v3: {len(v3_rows)} rows x {len(v3_headers)} cols')
print(f'v4: {len(v4_rows)} rows x {len(v4_headers)} cols')
ferpa_kw = ['student_id','ssn','gpa','date_of_birth','financial_aid','scholarship','fafsa','disability','transcript','medical']
print('v3 FERPA cols:', [c for c in v3_headers if any(k in c for k in ferpa_kw)])
print('v4 FERPA cols:', [c for c in v4_headers if any(k in c for k in ferpa_kw)])
