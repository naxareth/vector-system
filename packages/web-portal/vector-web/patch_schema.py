import re
import sys

file_path = "/home/naxareth/Documents/vector-system/packages/web-portal/vector-web/prisma/schema.prisma"
with open(file_path, "r") as f:
    content = f.read()

# 1. Add employer to enum user_role
content = content.replace(
"""enum user_role {
  student
  registrar
  super_admin
}""",
"""enum user_role {
  student
  registrar
  super_admin
  employer
}""")

# 2. Add relations to users model
# The users model ends with:
#   submitted_credentials  credential_submissions[] @relation("SubmittedCredentials")
#   reviewed_credentials   credential_submissions[] @relation("ReviewedCredentials")
# }
users_end = """  submitted_credentials  credential_submissions[] @relation("SubmittedCredentials")
  reviewed_credentials   credential_submissions[] @relation("ReviewedCredentials")
}"""
users_replacement = """  submitted_credentials  credential_submissions[] @relation("SubmittedCredentials")
  reviewed_credentials   credential_submissions[] @relation("ReviewedCredentials")
  employer_profile       employer_profiles?
  job_applications       job_applications[]
}"""
content = content.replace(users_end, users_replacement)

# 3. Add models after credential_submissions
cred_sub_end = """  @@index([user_id])
  @@index([status])
}"""

models_addition = """  @@index([user_id])
  @@index([status])
}

model employer_profiles {
  id            String         @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  user_id       String         @unique @db.Uuid
  company_name  String
  industry      String?
  company_size  String?
  website       String?
  logo_url      String?
  description   String?
  verified      Boolean        @default(false)
  created_at    DateTime?      @default(now()) @db.Timestamptz(6)
  user          users          @relation(fields: [user_id], references: [id], onDelete: Cascade)
  job_postings  job_postings[]
}

model job_postings {
  id               String             @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  employer_id      String             @db.Uuid
  title            String
  description      String
  location         String?
  job_type         String?
  salary_range     String?
  required_skills  String[]           @default([])
  preferred_skills String[]           @default([])
  status           String             @default("active")
  created_at       DateTime?          @default(now()) @db.Timestamptz(6)
  expires_at       DateTime?          @db.Timestamptz(6)
  employer         employer_profiles  @relation(fields: [employer_id], references: [id], onDelete: Cascade)
  applications     job_applications[]

  @@index([status])
}

model job_applications {
  id            String       @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  job_id        String       @db.Uuid
  student_id    String       @db.Uuid
  cvr_export_id String?      @db.Uuid
  cover_note    String?
  status        String       @default("pending")
  applied_at    DateTime?    @default(now()) @db.Timestamptz(6)
  job           job_postings @relation(fields: [job_id], references: [id], onDelete: Cascade)
  student       users        @relation(fields: [student_id], references: [id], onDelete: Cascade)

  @@unique([job_id, student_id])
  @@index([student_id])
}"""

content = content.replace(cred_sub_end, models_addition)

with open(file_path, "w") as f:
    f.write(content)
print("patch applied")
