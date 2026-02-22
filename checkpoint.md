packages\web-portal\vector-web\src\app\api\student\credentials\route.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { decryptData } from '@/lib/encryption';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const cookieStore = await cookies();

  // 1. Init Supabase with Service Role to ensure we can fetch data securely
  // independent of restrictive RLS that might block the anon key
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, 
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch (error) {
            // Safe to ignore in a GET handler: happens if Next.js tries to set 
            // a session cookie in a context where headers are already sent.
          }
        },
      },
    }
  );

  try {
    // 2. 🛡️ Auth Check: Who is asking?
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 3. 🛡️ Data Fetch: Only fetch for THIS user's ID
    // We strictly use the session ID, ignoring any client inputs
    const { data: credentials, error } = await supabase
      .from('verified_credentials')
      .select('*')
      .eq('user_id', user.id) 
      .order('issued_at', { ascending: false });

    if (error) throw error;

    // 4. 🔓 Server-Side Decryption (Category 3)
    const processedData = (credentials || []).map(cred => {
        let decryptedNote = null;
        if (cred.private_notes) {
            try {
                decryptedNote = decryptData(cred.private_notes);
            } catch (e) {
                console.error(`Decryption failed for cred: ${cred.id}`);
            }
        }
        return {
            ...cred,
            private_notes: decryptedNote
        };
    });

    return NextResponse.json(processedData);

  } catch (err: any) {
    console.error("Credential Fetch Error:", err);
    return NextResponse.json({ error: 'Failed to fetch credentials' }, { status: 500 });
  }
}
packages\web-portal\vector-web\src\app\api\schemas\route.ts

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Validate the incoming JSON-LD schema payload
const CreateSchemaValidator = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  json_schema: z.record(z.any(), "A valid JSON object is required for the schema"),
});

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate the session via Supabase
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            try { 
              cookiesToSet.forEach(({ name, value, options }) => 
                cookieStore.set(name, value, options)
              ) 
            } catch {}
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Verify the user is a Registrar
    const dbUser = await db.users.findUnique({
      where: { id: user.id },
      select: { role: true }
    });

    if (dbUser?.role !== "registrar") {
      return NextResponse.json({ error: "Forbidden: Registrars only" }, { status: 403 });
    }

    // 3. Parse and Validate the W3C template payload
    const body = await req.json();
    const { title, json_schema } = CreateSchemaValidator.parse(body);

    // 4. Save the schema to the database registry
    const newSchema = await db.credential_schemas.create({
      data: {
        issuer_id: user.id,
        title,
        json_schema,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Schema published successfully",
        data: newSchema,
      },
      { status: 201 }
    );

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors }, 
        { status: 400 }
      );
    }
    
    console.error("POST /api/schemas error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" }, 
      { status: 500 }
    );
  }
}
packages\web-portal\vector-web\src\app\api\schemas\[id]\route.ts

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch the schema from the database
    const schemaRecord = await db.credential_schemas.findUnique({
      where: { id },
      select: {
        title: true,
        json_schema: true,
        issuer_id: true,
        created_at: true,
      },
    });

    // Return a 404 if the schema ID doesn't exist
    if (!schemaRecord) {
      return NextResponse.json(
        { error: "Schema not found" },
        { status: 404 }
      );
    }

    // Serve the raw W3C JSON-LD schema
    return NextResponse.json(schemaRecord.json_schema, {
      status: 200,
      headers: {
        // Set standard caching headers for public schemas
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
        "Content-Type": "application/ld+json",
      },
    });

  } catch (error) {
    console.error("GET /api/schemas/[id] error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

packages\web-portal\vector-web\prisma\schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

model users {
  id                   String                       @id @db.Uuid
  student_id           String?                      @unique
  full_name            String?
  role                 user_role?                   @default(student)
  wallet_address       String?                      @unique
  avatar_url           String?
  created_at           DateTime?                    @default(dbgenerated("timezone('utc'::text, now())")) @db.Timestamptz(6)
  email                String                       @unique
  status               account_status?              @default(pending_verification)
  updated_at           DateTime?                    @default(now()) @updatedAt @db.Timestamptz(6)
  location             String?
  audit_logs_actor     audit_logs[]                 @relation("AuditActor")
  audit_logs_target    audit_logs[]                 @relation("AuditTarget")
  minting_batches      minting_batches[]
  notifications        notifications[]
  profiles             profiles?
  self_reported_skills self_reported_skills[]
  enrollments          student_course_enrollments[]
  verified_credentials verified_credentials[]
  credential_schemas   credential_schemas[]
}

model audit_logs {
  id          String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  created_at  DateTime? @default(now()) @db.Timestamptz(6)
  actor_id    String?   @db.Uuid
  target_id   String?   @db.Uuid
  action_type String
  description String?
  metadata    Json?
  actor       users?    @relation("AuditActor", fields: [actor_id], references: [id], onDelete: NoAction, onUpdate: NoAction)
  target      users?    @relation("AuditTarget", fields: [target_id], references: [id], onDelete: NoAction, onUpdate: NoAction)
}

model minting_batches {
  id             String                 @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  registrar_id   String?                @db.Uuid
  batch_name     String?
  total_students Int?
  created_at     DateTime?              @default(dbgenerated("timezone('utc'::text, now())")) @db.Timestamptz(6)
  registrar      users?                 @relation(fields: [registrar_id], references: [id], onDelete: NoAction, onUpdate: NoAction)
  credentials    verified_credentials[]
}

model credential_schemas {
  id          String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  issuer_id   String    @db.Uuid
  title       String
  json_schema Json
  created_at  DateTime? @default(dbgenerated("timezone('utc'::text, now())")) @db.Timestamptz(6)
  issuer      users     @relation(fields: [issuer_id], references: [id], onDelete: Cascade)
}

model verified_credentials {
  id                 String           @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  user_id            String           @db.Uuid
  batch_id           String?          @db.Uuid
  skill_name         String
  token_id           String
  transaction_hash   String?
  issuer_did         String?
  metadata_uri       String?
  schema_url         String?
  credential_data    Json?
  issued_at          DateTime?        @default(dbgenerated("timezone('utc'::text, now())")) @db.Timestamptz(6)
  private_notes      String?
  certificate_number String?
  batch              minting_batches? @relation(fields: [batch_id], references: [id], onDelete: NoAction, onUpdate: NoAction)
  student            users            @relation(fields: [user_id], references: [id], onDelete: NoAction, onUpdate: NoAction)

  @@index([user_id], map: "idx_verified_credentials_user")
}

model self_reported_skills {
  id            String    @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  user_id       String    @db.Uuid
  skill_name    String
  proficiency   String?
  evidence_link String?
  created_at    DateTime? @default(dbgenerated("timezone('utc'::text, now())")) @db.Timestamptz(6)
  student       users     @relation(fields: [user_id], references: [id], onDelete: NoAction, onUpdate: NoAction)

  @@index([user_id], map: "idx_self_reported_skills_user")
}

model market_snapshots {
  id          BigInt    @id @default(autoincrement())
  skill_name  String
  job_count   Int
  data_source String?   @default("jsearch")
  recorded_at DateTime? @default(dbgenerated("timezone('utc'::text, now())")) @db.Timestamptz(6)

  @@index([skill_name, recorded_at(sort: Desc)], map: "idx_market_snapshots_skill_date")
}

model skill_health_cache {
  skill_name         String             @id
  trend_slope        Float?
  status             String?
  last_updated       DateTime?          @default(dbgenerated("timezone('utc'::text, now())")) @db.Timestamptz(6)
  monitored_keywords monitored_keywords @relation(fields: [skill_name], references: [keyword], onDelete: NoAction, onUpdate: NoAction)
}

model courses {
  id          String                       @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  title       String
  provider    String?
  skill_tags  String[]
  link        String?
  created_at  DateTime?                    @default(dbgenerated("timezone('utc'::text, now())")) @db.Timestamptz(6)
  enrollments student_course_enrollments[]
}

model student_course_enrollments {
  id           String    @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  user_id      String    @db.Uuid
  course_id    String    @db.Uuid
  status       String?
  completed_at DateTime? @db.Timestamptz(6)
  created_at   DateTime? @default(dbgenerated("timezone('utc'::text, now())")) @db.Timestamptz(6)
  course       courses   @relation(fields: [course_id], references: [id], onDelete: NoAction, onUpdate: NoAction)
  student      users     @relation(fields: [user_id], references: [id], onDelete: NoAction, onUpdate: NoAction)
}

model monitored_keywords {
  keyword            String              @id
  category           String?
  is_active          Boolean?            @default(true)
  skill_health_cache skill_health_cache?
}

model notifications {
  id         String    @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  user_id    String    @db.Uuid
  title      String
  message    String?
  type       String?   @default("info")
  is_read    Boolean?  @default(false)
  link_url   String?
  created_at DateTime? @default(dbgenerated("timezone('utc'::text, now())")) @db.Timestamptz(6)
  users      users     @relation(fields: [user_id], references: [id], onDelete: NoAction, onUpdate: NoAction)
}

model profiles {
  id              String    @id @db.Uuid
  bio             String?
  phone           String?
  university      String?   @default("PHINMA University")
  major           String?
  graduation_year String?
  linkedin_url    String?
  github_url      String?
  updated_at      DateTime? @default(dbgenerated("timezone('utc'::text, now())")) @db.Timestamptz(6)
  portfolio_links Json?     @default("{\"github\": \"\", \"linkedin\": \"\", \"portfolio\": \"\"}")
  users           users     @relation(fields: [id], references: [id], onDelete: Cascade, onUpdate: NoAction)
}

/// This model contains row level security and requires additional setup for migrations. Visit https://pris.ly/d/row-level-security for more info.
model rate_limits {
  ip           String
  endpoint     String
  attempts     Int?      @default(1)
  last_attempt DateTime? @default(now()) @db.Timestamptz(6)

  @@id([ip, endpoint])
}

/// This model contains row level security and requires additional setup for migrations. Visit https://pris.ly/d/row-level-security for more info.
model verification_codes {
  id         BigInt            @id @default(autoincrement())
  email      String
  code       String
  type       verification_type @default(EMAIL_VERIFICATION)
  expires_at DateTime          @db.Timestamptz(6)
  created_at DateTime?         @default(now()) @db.Timestamptz(6)
}

enum verification_type {
  EMAIL_VERIFICATION
  PASSWORD_RESET
}

enum user_role {
  student
  registrar
  super_admin
}

enum account_status {
  active
  pending_verification
  suspended
}

model system_logs {
  id         String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  method     String   
  path       String   
  status     Int      
  ip_address String?  
  duration   Int?     
  user_agent String?  
  created_at DateTime @default(now()) @db.Timestamptz(6)

  @@index([status]) 
  @@index([created_at(sort: Desc)]) 
}


packages\blockchain-core\contracts\VectorToken.sol
// packages/blockchain-core/contracts/VectorToken.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract VectorToken is ERC1155, AccessControl {
    using Strings for uint256;

    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");
    
    string private _baseURI;
    
    event SkillMinted(address indexed student, uint256 tokenId, uint256 amount, string studentDID);
    event BatchSkillsMinted(address[] students, uint256[] tokenIds, uint256[] amounts);
    event RegistrarAdded(address indexed registrar);
    event RegistrarRemoved(address indexed registrar);
    
    constructor(string memory baseURI_) 
        // Base URI should be the Next.js API endpoint (e.g., https://yourdomain.com/api/credentials/)
        ERC1155(baseURI_)
    {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(REGISTRAR_ROLE, msg.sender);
        _baseURI = baseURI_;
    }
    
    // ========== DYNAMIC MINTING FUNCTIONS ==========
    function mintSkill(address student, uint256 tokenId, uint256 amount) 
        public 
        onlyRole(REGISTRAR_ROLE) 
        returns (bool)
    {
        _mint(student, tokenId, amount, "");
        
        // Emitting the DID in the event for off-chain indexing
        emit SkillMinted(student, tokenId, amount, addressToDID(student));
        return true;
    }
    
    function batchMintSkills(
        address[] calldata students,
        uint256[] calldata tokenIds,
        uint256[] calldata amounts
    ) public onlyRole(REGISTRAR_ROLE) returns (bool) {
        require(
            students.length == tokenIds.length && 
            tokenIds.length == amounts.length,
            "Array length mismatch"
        );
        
        for (uint256 i = 0; i < students.length; i++) {
            _mint(students[i], tokenIds[i], amounts[i], "");
        }
        
        emit BatchSkillsMinted(students, tokenIds, amounts);
        return true;
    }
    
    // ========== REGISTRAR MANAGEMENT ==========
    function addRegistrar(address registrar) public onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(REGISTRAR_ROLE, registrar);
        emit RegistrarAdded(registrar);
    }
    
    function removeRegistrar(address registrar) public onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(REGISTRAR_ROLE, registrar);
        emit RegistrarRemoved(registrar);
    }
    
    function isRegistrar(address account) public view returns (bool) {
        return hasRole(REGISTRAR_ROLE, account);
    }
    
    // ========== W3C METADATA & UTILITIES ==========
    
    /**
     * @dev Formats a standard wallet address into a Polygon Amoy W3C DID.
     */
    function addressToDID(address wallet) public pure returns (string memory) {
        return string(abi.encodePacked("did:polygon:amoy:", Strings.toHexString(uint160(wallet), 20)));
    }

    /**
     * @dev Overrides the standard ERC1155 uri function. 
     * Points directly to the backend W3C JSON-LD registry without appending ".json".
     */
    function uri(uint256 tokenId) public view override returns (string memory) {
        return string(abi.encodePacked(_baseURI, tokenId.toString()));
    }
    
    function setBaseURI(string memory newBaseURI) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _baseURI = newBaseURI;
    }
    
    // ========== OVERRIDES ==========
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}


packages\web-portal\vector-web\src\components\dashboard\SchemaBuilder.tsx
'use client';

import { useState } from 'react';
import { Plus, Trash2, Save, Loader2, AlertCircle } from 'lucide-react';
import { z } from 'zod';

// Define the shape of our dynamic schema builder state
interface SchemaField {
  id: string;
  keyName: string; // The JSON key (e.g., 'hours_completed')
  displayName: string; // The human-readable label (e.g., 'Hours Completed')
  type: 'string' | 'number' | 'boolean' | 'date';
  required: boolean;
}

export default function SchemaBuilder() {
  const [title, setTitle] = useState('');
  const [fields, setFields] = useState<SchemaField[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const addField = () => {
    setFields([
      ...fields,
      {
        id: crypto.randomUUID(),
        keyName: '',
        displayName: '',
        type: 'string',
        required: true,
      },
    ]);
  };

  const removeField = (id: string) => {
    setFields(fields.filter((f) => f.id !== id));
  };

  const updateField = (id: string, updates: Partial<SchemaField>) => {
    setFields(fields.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  };

  const generateJsonSchema = () => {
    const schemaProperties: Record<string, any> = {};
    const requiredFields: string[] = [];

    fields.forEach((field) => {
      // Ensure valid JSON keys (lowercase, no spaces)
      const safeKey = field.keyName.trim().toLowerCase().replace(/\s+/g, '_');
      if (!safeKey) return;

      schemaProperties[safeKey] = {
        type: field.type,
        title: field.displayName,
      };

      if (field.required) {
        requiredFields.push(safeKey);
      }
    });

    return {
      $schema: "http://json-schema.org/draft-07/schema#",
      type: "object",
      properties: schemaProperties,
      required: requiredFields,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!title.trim()) {
      setError("Please provide a title for this credential template.");
      return;
    }

    if (fields.length === 0) {
      setError("You must add at least one field to the schema.");
      return;
    }

    setIsSubmitting(true);

    try {
      const finalSchema = generateJsonSchema();

      const response = await fetch('/api/schemas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          json_schema: finalSchema,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to publish schema');
      }

      setSuccess(true);
      setTitle('');
      setFields([]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 max-w-4xl mx-auto">
      <div className="mb-8 border-b pb-4">
        <h2 className="text-2xl font-bold text-gray-900">Credential Template Builder</h2>
        <p className="text-sm text-gray-500 mt-1">
          Design the custom fields that will be attached to this verifiable credential.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Schema Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Template Name (e.g., Bootcamp Completion Certificate)
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter template name..."
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            required
          />
        </div>

        {/* Dynamic Fields List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-800">Custom Fields</h3>
            <button
              type="button"
              onClick={addField}
              className="flex items-center gap-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-md transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Field
            </button>
          </div>

          {fields.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 border-2 border-dashed rounded-lg text-gray-400">
              No fields added yet. Click "Add Field" to start building your template.
            </div>
          ) : (
            <div className="space-y-3">
              {fields.map((field) => (
                <div key={field.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg border">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Display Name</label>
                      <input
                        type="text"
                        value={field.displayName}
                        onChange={(e) => updateField(field.id, { displayName: e.target.value, keyName: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                        placeholder="e.g., Course Link"
                        className="w-full px-3 py-1.5 text-sm border rounded-md"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Data Type</label>
                      <select
                        value={field.type}
                        onChange={(e) => updateField(field.id, { type: e.target.value as any })}
                        className="w-full px-3 py-1.5 text-sm border rounded-md bg-white"
                      >
                        <option value="string">Text (String)</option>
                        <option value="number">Number</option>
                        <option value="boolean">Yes/No (Boolean)</option>
                        <option value="date">Date</option>
                      </select>
                    </div>
                    <div className="flex flex-col justify-center pt-5">
                      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) => updateField(field.id, { required: e.target.checked })}
                          className="rounded text-blue-600"
                        />
                        Required Field
                      </label>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeField(field.id)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors mt-4"
                    title="Remove field"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Status Messages */}
        {error && (
          <div className="p-3 rounded-lg bg-red-50 text-red-600 flex items-center gap-2 text-sm">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}
        
        {success && (
          <div className="p-3 rounded-lg bg-green-50 text-green-700 flex items-center gap-2 text-sm">
            Template published to the W3C registry successfully!
          </div>
        )}

        {/* Submit Action */}
        <div className="pt-4 border-t flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting || fields.length === 0}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Publish Schema Template
          </button>
        </div>
      </form>
    </div>
  );
}

packages\web-portal\vector-web\src\app\student\skills\[id]\page.tsx
'use client';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import Link from 'next/link';
import { SKILL_MAP } from '@/lib/blockchain'; // ✅ Added to decode bc- IDs

export default function SkillDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [credential, setCredential] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        // 1. 🛡️ Handle Blockchain-Only Credentials (IDs starting with 'bc-')
        if (id.startsWith('bc-')) {
          const skillId = parseInt(id.replace('bc-', ''));
          // Find the skill name by matching the ID in the SKILL_MAP
          const skillName = Object.keys(SKILL_MAP).find(key => (SKILL_MAP as any)[key] === skillId);
          
          if (skillName) {
            setCredential({
              id: id,
              skill_name: skillName,
              certificate_number: 'ON-CHAIN-ONLY',
              issued_at: new Date().toISOString(), // Fallback for pure blockchain reads
              transaction_hash: 'verified_on_chain', 
              private_notes: null
            });
            return; // Exit early, no need to query DB
          }
        }

        // 2. 🛡️ Fetching from our secure API for University-Issued credentials
        const res = await fetch('/api/student/credentials');
        if (!res.ok) throw new Error("Failed to fetch");
        
        const allCreds = await res.json();
        const found = allCreds.find((c: any) => c.id === id);
        
        if (!found) {
          router.push('/student/skills');
          return;
        }
        setCredential(found);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id, router]);

  if (loading) return <div className="p-10 text-center animate-pulse text-purple-600">Verifying Proof...</div>;
  if (!credential) return null; // Safety catch

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumbs */}
        <nav className="flex mb-8 text-sm text-gray-500">
          <Link href="/student/dashboard" className="hover:text-purple-600">Dashboard</Link>
          <span className="mx-2">/</span>
          <Link href="/student/skills" className="hover:text-purple-600">Skills</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900 font-medium">{credential.skill_name}</span>
        </nav>

        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-700 px-8 py-10 text-white text-center">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/30">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            </div>
            <h1 className="text-3xl font-bold mb-2">{credential.skill_name}</h1>
            <p className="text-purple-100 opacity-90">
              {id.startsWith('bc-') ? 'Decentralized Smart Contract Proof' : 'University Verified Micro-Credential'}
            </p>
          </div>

          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Verification Metadata */}
            <div className="space-y-6">
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Verification Details</h2>
              
              <div>
                <label className="block text-xs text-gray-500 mb-1">Status</label>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full border border-green-100 text-sm font-bold">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> Verified
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Certificate Serial Number</label>
                <p className="font-mono text-gray-900 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">{credential.certificate_number || 'N/A'}</p>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Issue Date</label>
                <p className="text-gray-900 font-medium">
                  {id.startsWith('bc-') ? 'Real-time via Smart Contract' : new Date(credential.issued_at).toLocaleDateString('en-US', { dateStyle: 'long' })}
                </p>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Blockchain Receipt</label>
                {/* Check if it's a real tx hash or just our placeholder */}
                {credential.transaction_hash?.startsWith('0x') ? (
                  <a 
                    href={`https://amoy.polygonscan.com/tx/${credential.transaction_hash}`} 
                    target="_blank" 
                    className="text-purple-600 text-sm break-all hover:underline flex items-center gap-1"
                  >
                    {credential.transaction_hash?.slice(0, 24)}...
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  </a>
                ) : (
                   <p className="text-gray-900 text-sm font-medium">Verified via Polygon Contract State</p>
                )}
              </div>
            </div>

            {/* The Vault Section (Decrypted Data) */}
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                The Vault: Registrar Notes
              </h2>
              <div className="bg-white p-4 rounded-xl border border-slate-100 text-slate-700 text-sm min-h-[150px] italic">
                {credential.private_notes ? (
                  `"${credential.private_notes}"`
                ) : (
                  <span className="text-slate-400">No confidential notes recorded for this credential.</span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-4 leading-relaxed">
                Notice: These notes are end-to-end encrypted. Only you and the issuing registrar can view this data. It is not included in the public blockchain metadata.
              </p>
            </div>
          </div>

          <div className="bg-gray-50 px-8 py-6 border-t border-gray-100 flex justify-between items-center">
             <button onClick={() => window.print()} className="text-gray-600 hover:text-gray-900 text-sm font-medium flex items-center gap-2">
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
               Print Official Receipt
             </button>
             <Link href="/student/dashboard" className="px-6 py-2 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 transition-colors shadow-lg">
               Back to Dashboard
             </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

packages\web-portal\vector-web\src\app\student\cvr\page.tsx

'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, VECTOR_TOKEN_ABI, SKILL_MAP } from '@/lib/blockchain';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import ExportCVRModal from '@/components/dashboard/ExportCVRModal';
import CVRSuccessModal from '@/components/dashboard/CVRSuccessModal';
import { z } from 'zod';

const resumeSchema = z.object({
  fullName: z.string().min(2, "Full Name is required (min 2 chars)"),
  title: z.string().min(2, "Professional Title is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional().or(z.literal('')),
  linkedin: z.string().url("Must be a valid URL (https://...)").optional().or(z.literal('')),
  portfolio: z.string().url("Must be a valid URL (https://...)").optional().or(z.literal('')),
  summary: z.string().max(600, "Summary must be under 600 characters").optional(),
  
  education: z.array(z.object({
    degree: z.string().optional(),
    school: z.string().optional(),
    location: z.string().optional(),
    year: z.string().optional(),
    honors: z.string().optional(),
  })).optional(),
  
  experience: z.array(z.object({
    title: z.string().optional(),
    company: z.string().optional(),
    dates: z.string().optional(),
    description: z.string().optional(),
  })).optional(),
});

interface SkillItem {
  id: string;
  name: string;
  verified: boolean;
}

export default function CVRPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('professional');
  const [selectedColor, setSelectedColor] = useState('#6d28d9');
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [availableSkills, setAvailableSkills] = useState<SkillItem[]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState('');
  const [availableCertifications, setAvailableCertifications] = useState<any[]>([]);
  
  const [isGenerated, setIsGenerated] = useState(false);
  const [generatedData, setGeneratedData] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    portfolio: '',
    linkedin: '',
    title: '',
    summary: '',
    education: [] as { degree: string; school: string; location: string; year: string; honors: string; }[],
    experience: [] as { title: string; company: string; dates: string; description: string; }[],
    projects: [] as { title: string; description: string; technologies: string; role: string; }[],
    certifications: [] as { name: string; issuer: string; date: string; verified: boolean; }[],
    awards: [] as { title: string; description: string; }[],
  });

  const addEducation = () => setFormData(prev => ({ ...prev, education: [...prev.education, { degree: '', school: '', location: '', year: '', honors: '' }] }));
  const addExperience = () => setFormData(prev => ({ ...prev, experience: [...prev.experience, { title: '', company: '', dates: '', description: '' }] }));
  const addProject = () => setFormData(prev => ({ ...prev, projects: [...prev.projects, { title: '', description: '', technologies: '', role: '' }] }));
  const addCertification = () => setFormData(prev => ({ ...prev, certifications: [...prev.certifications, { name: '', issuer: '', date: '', verified: false }] }));
  const addAward = () => setFormData(prev => ({ ...prev, awards: [...prev.awards, { title: '', description: '' }] }));

  const removeItem = (section: keyof typeof formData, index: number) => {
    setFormData((prev: any) => ({
      ...prev,
      [section]: prev[section].filter((_: any, i: number) => i !== index)
    }));
  };

  const updateItem = (section: keyof typeof formData, index: number, field: string, value: string) => {
     setFormData((prev: any) => {
       const newItems = [...prev[section]];
       newItems[index] = { ...newItems[index], [field]: value };
       return { ...prev, [section]: newItems };
     });
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
        setErrors(prev => {
            const newErr = { ...prev };
            delete newErr[field];
            return newErr;
        });
    }
  };

  useEffect(() => {
    const initPage = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/login');
          return;
        }

        const { data: userRecord } = await supabase
          .from('users')
          .select('full_name, wallet_address')
          .eq('id', session.user.id)
          .single();

        const { data: profileRecord } = await supabase
          .from('profiles')
          .select('phone, major, bio, linkedin_url')
          .eq('id', session.user.id)
          .maybeSingle();

        setFormData(prev => ({
          ...prev,
          fullName: userRecord?.full_name || '',
          email: session.user.email || '',
          phone: profileRecord?.phone || '',
          title: profileRecord?.major || '',
          summary: profileRecord?.bio || '',
          portfolio: profileRecord?.linkedin_url || ''
        }));

        if (userRecord?.wallet_address) {
          await fetchVerifiedSkills(userRecord.wallet_address);
        }

        const { data: certs } = await supabase
          .from('verified_credentials')
          .select('*')
          .eq('user_id', session.user.id);

        if (certs) setAvailableCertifications(certs);

      } catch (error) {
        console.error("CVR Data Error:", error);
      } finally {
        setLoading(false);
      }
    };

    initPage();
  }, [router]);

  const fetchVerifiedSkills = async (walletAddress: string) => {
    try {
      // ✅ Fallback to Public RPC if MetaMask is not installed so reading skills still works
      const provider = (typeof window !== 'undefined' && (window as any).ethereum)
        ? new ethers.BrowserProvider((window as any).ethereum, "any")
        : new ethers.JsonRpcProvider('https://rpc-amoy.polygon.technology/');

      const contract = new ethers.Contract(CONTRACT_ADDRESS, VECTOR_TOKEN_ABI, provider);
      const foundSkills: SkillItem[] = [];

      for (const [skillName, skillId] of Object.entries(SKILL_MAP)) {
        if (typeof skillId !== 'number') continue;
        try {
          const balance = await contract.balanceOf(walletAddress, skillId);
          if (balance > 0) {
            foundSkills.push({
              id: `chain-${skillId}`,
              name: skillName,
              verified: true
            });
          }
        } catch (e) { /* Ignore read errors */ }
      }
      
      setAvailableSkills(foundSkills);
      setSelectedSkillIds(foundSkills.map(s => s.id));
    } catch (error) {
      console.error("Blockchain Scan Failed:", error);
    }
  };

  const handleSkillToggle = (skillId: string) => {
    setSelectedSkillIds(prev =>
      prev.includes(skillId) ? prev.filter(id => id !== skillId) : [...prev, skillId]
    );
  };

  const handleAddCustomSkill = () => {
    if (customSkill.trim()) {
      const newId = `custom-${Date.now()}`;
      setAvailableSkills(prev => [...prev, { id: newId, name: customSkill, verified: false }]);
      setSelectedSkillIds(prev => [...prev, newId]);
      setCustomSkill('');
    }
  };

  const handleGenerateCVR = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({}); 

    const validation = resumeSchema.safeParse(formData);

    if (!validation.success) {
        const newErrors: Record<string, string> = {};
        validation.error.issues.forEach(issue => {
            if (issue.path[0]) newErrors[issue.path[0].toString()] = issue.message;
        });
        setErrors(newErrors);
        alert("Please fix the errors in the form before generating.");
        return;
    }
    
    const finalSkills = availableSkills.filter(s => selectedSkillIds.includes(s.id));
    const sanitizeArray = (arr: any[]) => arr.filter(item => Object.values(item).some((v: any) => v !== null && v !== undefined && String(v).trim() !== ''));

    const cvrData: any = {
      generatedAt: new Date().toISOString(),
      template: selectedTemplate,
      color: selectedColor,
      skills: finalSkills,
      fullName: formData.fullName,
      email: formData.email,
    };

    if (formData.phone) cvrData.phone = formData.phone;
    if (formData.portfolio) cvrData.portfolio = formData.portfolio;
    if (formData.linkedin) cvrData.linkedin = formData.linkedin;
    if (formData.title) cvrData.title = formData.title;
    if (formData.summary) cvrData.summary = formData.summary;

    const cleanedEducation = sanitizeArray(formData.education || []);
    if (cleanedEducation.length) cvrData.education = cleanedEducation;

    const cleanedExperience = sanitizeArray(formData.experience || []);
    if (cleanedExperience.length) cvrData.experience = cleanedExperience;

    const cleanedProjects = sanitizeArray(formData.projects || []);
    if (cleanedProjects.length) cvrData.projects = cleanedProjects;

    const cleanedCerts = sanitizeArray(formData.certifications || []);
    if (cleanedCerts.length) cvrData.certifications = cleanedCerts;

    const cleanedAwards = sanitizeArray(formData.awards || []);
    if (cleanedAwards.length) cvrData.awards = cleanedAwards;
    
    localStorage.setItem('sampleCVRData', JSON.stringify(cvrData));
    localStorage.setItem('pendingCVR', 'true');
    
    setGeneratedData(cvrData);
    setIsGenerated(true);
    setIsSuccessModalOpen(true);
  };

  const handleCreateNew = () => {
    setIsGenerated(false);
    setGeneratedData(null);
    setSelectedSkillIds(availableSkills.filter(s => s.verified).map(s => s.id));
  };

  const handleAddVerifiedCertification = (cert: any) => {
    const exists = formData.certifications.some((c: any) => c.name === cert.skill_name && c.verified);
    if (exists) return;

    setFormData(prev => ({
      ...prev,
      certifications: [
        ...prev.certifications,
        {
          name: cert.skill_name,
          issuer: 'Vector University (Blockchain Verified)',
          date: new Date(cert.issued_at).toLocaleDateString(),
          verified: true
        }
      ]
    }));
  };

  const handleDownload = () => {
    setIsSuccessModalOpen(false);
    setIsExportModalOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="mb-4 -mt-10">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
          {isGenerated ? 'Credential Verified Resume (CVR)' : 'Credential Verified Resume'}
        </h1>
        <p className="text-sm md:text-base text-gray-500">
          {isGenerated 
            ? 'Your blockchain-verified resume preview' 
            : 'Create your blockchain-verified resume with verified skills'}
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-gray-500 animate-pulse bg-white rounded-xl border border-gray-200">
          Syncing Profile & Blockchain Data...
        </div>
      ) : !isGenerated ? (
      <form onSubmit={handleGenerateCVR} className="w-full">
        <div className="bg-white rounded-xl border border-gray-200 p-6 md:p-8 space-y-6">
          {/* Personal Details Section */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal Details</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => handleChange('fullName', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${errors.fullName ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-purple-500'}`}
                    placeholder="John Doe"
                  />
                  {errors.fullName && <p className="text-xs text-red-500 mt-1">{errors.fullName}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Professional Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${errors.title ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-purple-500'}`}
                    placeholder="Full-Stack Developer"
                  />
                  {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${errors.email ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-purple-500'}`}
                    placeholder="john@example.com"
                  />
                  {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                    placeholder="+63 912 345 6789"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  LinkedIn Profile (Optional)
                </label>
                <input
                  type="url"
                  value={formData.linkedin}
                  onChange={(e) => handleChange('linkedin', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${errors.linkedin ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-purple-500'}`}
                  placeholder="https://linkedin.com/in/johndoe"
                />
                {errors.linkedin && <p className="text-xs text-red-500 mt-1">{errors.linkedin}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Portfolio/Website (GitHub for Devs)
                </label>
                <input
                  type="url"
                  value={formData.portfolio}
                  onChange={(e) => handleChange('portfolio', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${errors.portfolio ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-purple-500'}`}
                  placeholder="https://github.com/johndoe"
                />
                {errors.portfolio && <p className="text-xs text-red-500 mt-1">{errors.portfolio}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Professional Summary
                </label>
                <p className="text-xs text-gray-500 mb-2">A short 2–4 sentence paragraph summarizing who you are, your key skills, career goals, and the value you bring.</p>
                <textarea
                  value={formData.summary}
                  onChange={(e) => handleChange('summary', e.target.value)}
                  rows={4}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${errors.summary ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-purple-500'}`}
                  placeholder="e.g., Diligent Computer Science student with a passion for blockchain technology..."
                />
                {errors.summary && <p className="text-xs text-red-500 mt-1">{errors.summary}</p>}
              </div>
            </div>
          </div>

          {/* Education Section */}
          <div className="pt-6 border-t border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex justify-between items-center">
              Education
              <button type="button" onClick={addEducation} className="text-sm text-purple-600 hover:text-purple-700 font-medium">+ Add Education</button>
            </h2>
            {formData.education.map((edu: any, index: number) => (
              <div key={index} className="bg-gray-50 p-4 rounded-lg mb-4 border border-gray-200 relative">
                <button type="button" onClick={() => removeItem('education', index)} className="absolute top-2 right-2 text-gray-400 hover:text-red-500">×</button>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input placeholder="Degree (e.g. BS Information Technology)" className="p-2 border rounded" value={edu.degree} onChange={(e) => updateItem('education', index, 'degree', e.target.value)} />
                  <input placeholder="School Name" className="p-2 border rounded" value={edu.school} onChange={(e) => updateItem('education', index, 'school', e.target.value)} />
                  <input placeholder="Location" className="p-2 border rounded" value={edu.location} onChange={(e) => updateItem('education', index, 'location', e.target.value)} />
                  <input placeholder="Graduation Year/Date" className="p-2 border rounded" value={edu.year} onChange={(e) => updateItem('education', index, 'year', e.target.value)} />
                  <input placeholder="Academic Honors (Optional)" className="md:col-span-2 p-2 border rounded" value={edu.honors} onChange={(e) => updateItem('education', index, 'honors', e.target.value)} />
                </div>
              </div>
            ))}
             {formData.education.length === 0 && <p className="text-sm text-gray-500 italic">No education added yet.</p>}
          </div>

          {/* Work Experience Section */}
          <div className="pt-6 border-t border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex justify-between items-center">
              Work Experience
              <button type="button" onClick={addExperience} className="text-sm text-purple-600 hover:text-purple-700 font-medium">+ Add Experience</button>
            </h2>
            {formData.experience.map((exp: any, index: number) => (
               <div key={index} className="bg-gray-50 p-4 rounded-lg mb-4 border border-gray-200 relative">
                <button type="button" onClick={() => removeItem('experience', index)} className="absolute top-2 right-2 text-gray-400 hover:text-red-500">×</button>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input placeholder="Job Title" className="p-2 border rounded" value={exp.title} onChange={(e) => updateItem('experience', index, 'title', e.target.value)} />
                  <input placeholder="Company Name" className="p-2 border rounded" value={exp.company} onChange={(e) => updateItem('experience', index, 'company', e.target.value)} />
                  <input placeholder="Dates (e.g. Jan 2023 - Present)" className="md:col-span-2 p-2 border rounded" value={exp.dates} onChange={(e) => updateItem('experience', index, 'dates', e.target.value)} />
                  <textarea placeholder="Description (Bullet points recommended)" rows={3} className="md:col-span-2 p-2 border rounded" value={exp.description} onChange={(e) => updateItem('experience', index, 'description', e.target.value)} />
                </div>
              </div>
            ))}
            {formData.experience.length === 0 && <p className="text-sm text-gray-500 italic">No work experience added yet.</p>}
          </div>

           {/* Projects Section */}
           <div className="pt-6 border-t border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex justify-between items-center">
              Projects
              <button type="button" onClick={addProject} className="text-sm text-purple-600 hover:text-purple-700 font-medium">+ Add Project</button>
            </h2>
            {formData.projects.map((proj: any, index: number) => (
               <div key={index} className="bg-gray-50 p-4 rounded-lg mb-4 border border-gray-200 relative">
                <button type="button" onClick={() => removeItem('projects', index)} className="absolute top-2 right-2 text-gray-400 hover:text-red-500">×</button>
                <div className="grid grid-cols-1 gap-4">
                  <input placeholder="Project Title" className="p-2 border rounded" value={proj.title} onChange={(e) => updateItem('projects', index, 'title', e.target.value)} />
                  <input placeholder="Technologies Used" className="p-2 border rounded" value={proj.technologies} onChange={(e) => updateItem('projects', index, 'technologies', e.target.value)} />
                   <input placeholder="Your Role" className="p-2 border rounded" value={proj.role} onChange={(e) => updateItem('projects', index, 'role', e.target.value)} />
                  <textarea placeholder="Short description..." rows={2} className="p-2 border rounded" value={proj.description} onChange={(e) => updateItem('projects', index, 'description', e.target.value)} />
                </div>
              </div>
            ))}
             {formData.projects.length === 0 && <p className="text-sm text-gray-500 italic">No projects added yet.</p>}
          </div>


           {/* Available Verified Certifications (New Block) */}
           {availableCertifications.length > 0 && (
            <div className="pt-6 border-t border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                Available Verified Certifications
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Blockchain Synced</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableCertifications.map((cert) => {
                   const isAdded = formData.certifications.some((c: any) => c.name === cert.skill_name && c.verified);
                   return (
                    <div key={cert.id} className={`p-4 rounded-lg border flex justify-between items-center ${isAdded ? 'bg-green-50 border-green-200 opacity-70' : 'bg-white border-purple-200 shadow-sm'}`}>
                      <div>
                        <h3 className="font-bold text-gray-800">{cert.skill_name}</h3>
                        <p className="text-xs text-gray-500">Issued: {new Date(cert.issued_at).toLocaleDateString()}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddVerifiedCertification(cert)}
                        disabled={isAdded}
                        className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
                          isAdded 
                            ? 'text-green-700 bg-green-100 cursor-default' 
                            : 'text-white bg-purple-600 hover:bg-purple-700'
                        }`}
                      >
                        {isAdded ? 'Added ✓' : '+ Add to CVR'}
                      </button>
                    </div>
                   );
                })}
              </div>
            </div>
          )}

           {/* Certifications & Awards Section */}
           <div className="pt-6 border-t border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex justify-between items-center">
              Certifications & Awards
               <div className="space-x-4">
                <button type="button" onClick={addCertification} className="text-sm text-purple-600 hover:text-purple-700 font-medium">+ Add Certification</button>
                <button type="button" onClick={addAward} className="text-sm text-purple-600 hover:text-purple-700 font-medium">+ Add Award</button>
               </div>
            </h2>
             {/* Certs */}
            {formData.certifications.map((cert: any, index: number) => (
               <div key={`cert-${index}`} className="bg-blue-50 p-4 rounded-lg mb-4 border border-blue-100 relative">
                <button type="button" onClick={() => removeItem('certifications', index)} className="absolute top-2 right-2 text-gray-400 hover:text-red-500">×</button>
                <p className="text-xs text-blue-600 font-semibold mb-2 uppercase">Certification</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input placeholder="Certification Name" className="p-2 border rounded" value={cert.name} onChange={(e) => updateItem('certifications', index, 'name', e.target.value)} />
                  <input placeholder="Issuing Organization" className="p-2 border rounded" value={cert.issuer} onChange={(e) => updateItem('certifications', index, 'issuer', e.target.value)} />
                  <input placeholder="Date Earned" className="p-2 border rounded" value={cert.date} onChange={(e) => updateItem('certifications', index, 'date', e.target.value)} />
                </div>
              </div>
            ))}
            {/* Awards */}
            {formData.awards.map((award: any, index: number) => (
               <div key={`award-${index}`} className="bg-yellow-50 p-4 rounded-lg mb-4 border border-yellow-100 relative">
                <button type="button" onClick={() => removeItem('awards', index)} className="absolute top-2 right-2 text-gray-400 hover:text-red-500">×</button>
                <p className="text-xs text-yellow-600 font-semibold mb-2 uppercase">Award</p>
                <div className="grid grid-cols-1 gap-4">
                  <input placeholder="Award Title" className="p-2 border rounded" value={award.title} onChange={(e) => updateItem('awards', index, 'title', e.target.value)} />
                  <textarea placeholder="Description" rows={2} className="p-2 border rounded" value={award.description} onChange={(e) => updateItem('awards', index, 'description', e.target.value)} />
                </div>
              </div>
            ))}
             {formData.certifications.length === 0 && formData.awards.length === 0 && <p className="text-sm text-gray-500 italic">No certifications or awards added yet.</p>}
          </div>

          {/* Skills Selection Section */}
          <div className="pt-6 border-t border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Skills</h2>
            
            {/* Verified Skills */}
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-3 flex items-center gap-2">
                Your Verified Skills
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Blockchain Synced</span>
              </p>
              {availableSkills.filter(s => s.verified).length > 0 ? (
                <div className="space-y-2">
                  {availableSkills.filter(s => s.verified).map((skill) => (
                    <label key={skill.id} className="flex items-center p-3 border border-green-200 bg-green-50/30 rounded-lg hover:bg-green-50 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={selectedSkillIds.includes(skill.id)}
                        onChange={() => handleSkillToggle(skill.id)}
                        className="mr-3 w-4 h-4 text-green-600 focus:ring-green-500"
                      />
                      <div className="flex-1 flex justify-between items-center">
                        <span className="font-medium text-gray-900">{skill.name}</span>
                        <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 italic p-3 border border-dashed border-gray-200 rounded-lg">
                  No verified skills found in wallet. Mint some tokens to see them here!
                </div>
              )}
            </div>

            {/* Custom Skills */}
            <div>
              <p className="text-sm text-gray-600 mb-3">Add Custom Skills</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customSkill}
                  onChange={(e) => setCustomSkill(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomSkill())}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                  placeholder="Enter skill name"
                />
                <button
                  type="button"
                  onClick={handleAddCustomSkill}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg font-medium"
                >
                  Add
                </button>
              </div>
              {/* Display Custom Skills */}
              {availableSkills.filter(s => !s.verified).length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {availableSkills
                    .filter(s => !s.verified)
                    .map((skill) => (
                      <span key={skill.id} className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm border transition-all ${
                        selectedSkillIds.includes(skill.id) 
                          ? 'bg-purple-50 border-purple-200 text-purple-700' 
                          : 'bg-gray-50 border-gray-200 text-gray-500'
                      }`}>
                        <input 
                          type="checkbox" 
                          checked={selectedSkillIds.includes(skill.id)}
                          onChange={() => handleSkillToggle(skill.id)}
                          className="mr-1 w-3 h-3 text-purple-600 rounded-sm cursor-pointer"
                        />
                        {skill.name}
                      </span>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Template Selection Section */}
          <div className="pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Choose Template</h2>
              <span className="text-sm text-purple-600 font-medium bg-purple-50 px-3 py-1 rounded-full">
                {selectedTemplate.charAt(0).toUpperCase() + selectedTemplate.slice(1)} Selected
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Professional Template Option */}
              <label className={`group relative cursor-pointer block`}>
                <input
                  type="radio"
                  name="template"
                  value="professional"
                  checked={selectedTemplate === 'professional'}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="sr-only"
                />
                <div className={`h-full rounded-xl border-2 transition-all duration-200 overflow-hidden ${
                  selectedTemplate === 'professional' 
                    ? 'border-purple-600 shadow-md ring-1 ring-purple-600' 
                    : 'border-gray-200 hover:border-purple-300 hover:shadow-sm'
                }`}>
                  <div className="aspect-[3/4] bg-white p-3 flex flex-col gap-2 relative">
                    <div className="w-1/3 h-2 bg-gray-800 rounded-sm mb-2"></div>
                    <div className="w-full h-px bg-gray-200"></div>
                    <div className="flex gap-2">
                        <div className="w-2/3 space-y-1">
                          <div className="w-full h-1.5 bg-gray-200 rounded-sm"></div>
                          <div className="w-5/6 h-1.5 bg-gray-200 rounded-sm"></div>
                          <div className="w-full h-1.5 bg-gray-200 rounded-sm"></div>
                        </div>
                        <div className="w-1/3 space-y-1">
                          <div className="w-full h-1.5 bg-gray-300 rounded-sm"></div>
                          <div className="w-3/4 h-1.5 bg-gray-300 rounded-sm"></div>
                        </div>
                    </div>
                    {selectedTemplate === 'professional' && (
                      <div className="absolute inset-0 bg-purple-600/10 flex items-center justify-center">
                        <div className="bg-purple-600 text-white p-2 rounded-full shadow-lg">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-4 bg-gray-50 border-t border-gray-100">
                    <h3 className="font-bold text-gray-900">Professional</h3>
                    <p className="text-xs text-gray-500 mt-1">Clean, structured layout best for corporate and enterprise roles.</p>
                  </div>
                </div>
              </label>

              {/* Modern Template Option */}
              <label className={`group relative cursor-pointer block`}>
                <input
                  type="radio"
                  name="template"
                  value="modern"
                  checked={selectedTemplate === 'modern'}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="sr-only"
                />
                <div className={`h-full rounded-xl border-2 transition-all duration-200 overflow-hidden ${
                  selectedTemplate === 'modern' 
                    ? 'border-purple-600 shadow-md ring-1 ring-purple-600' 
                    : 'border-gray-200 hover:border-purple-300 hover:shadow-sm'
                }`}>
                    <div className="aspect-[3/4] bg-white flex relative">
                    <div className="w-1/3 bg-gray-100 p-2 space-y-2">
                      <div className="w-12 h-12 rounded-full bg-gray-300 mx-auto mb-2"></div>
                      <div className="w-full h-1.5 bg-gray-300 rounded-sm"></div>
                      <div className="w-2/3 h-1.5 bg-gray-300 rounded-sm mx-auto"></div>
                    </div>
                    <div className="w-2/3 p-2 space-y-2">
                      <div className="w-1/2 h-3 bg-purple-600 rounded-sm mb-2"></div>
                      <div className="w-full h-1.5 bg-gray-200 rounded-sm"></div>
                      <div className="w-full h-1.5 bg-gray-200 rounded-sm"></div>
                      <div className="w-5/6 h-1.5 bg-gray-200 rounded-sm"></div>
                    </div>
                    {selectedTemplate === 'modern' && (
                      <div className="absolute inset-0 bg-purple-600/10 flex items-center justify-center">
                        <div className="bg-purple-600 text-white p-2 rounded-full shadow-lg">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-4 bg-gray-50 border-t border-gray-100">
                    <h3 className="font-bold text-gray-900">Modern</h3>
                    <p className="text-xs text-gray-500 mt-1">Creative two-column design with verified skills sidebar.</p>
                  </div>
                </div>
              </label>

               {/* Simple Template Option */}
               <label className={`group relative cursor-pointer block`}>
                <input
                  type="radio"
                  name="template"
                  value="simple"
                  checked={selectedTemplate === 'simple'}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="sr-only"
                />
                <div className={`h-full rounded-xl border-2 transition-all duration-200 overflow-hidden ${
                  selectedTemplate === 'simple' 
                    ? 'border-purple-600 shadow-md ring-1 ring-purple-600' 
                    : 'border-gray-200 hover:border-purple-300 hover:shadow-sm'
                }`}>
                    <div className="aspect-[3/4] bg-white p-4 flex flex-col gap-2 relative">
                    <div className="text-center space-y-0.5 mb-1">
                       <div className="w-2/3 h-2.5 bg-gray-800 rounded-sm mx-auto"></div>
                       <div className="w-1/2 h-1 bg-gray-300 rounded-sm mx-auto"></div>
                       <div className="w-2/5 h-1 bg-gray-300 rounded-sm mx-auto"></div>
                    </div>
                    <div className="w-full h-px bg-gray-800"></div>
                    <div className="w-full h-1 bg-gray-100 rounded-sm italic"></div>
                    <div className="space-y-1.5 mt-1">
                       <div className="w-2/5 h-1.5 bg-gray-800 rounded-sm tracking-widest"></div>
                       <div className="w-full h-px bg-gray-400"></div>
                       <div className="flex justify-between">
                         <div className="w-1/3 h-1 bg-gray-700 rounded-sm"></div>
                         <div className="w-1/4 h-1 bg-gray-400 rounded-sm"></div>
                       </div>
                       <div className="pl-3 space-y-0.5">
                         <div className="flex items-start gap-1"><div className="w-1 h-1 bg-gray-400 rounded-full mt-0.5 flex-shrink-0"></div><div className="w-full h-1 bg-gray-200 rounded-sm"></div></div>
                         <div className="flex items-start gap-1"><div className="w-1 h-1 bg-gray-400 rounded-full mt-0.5 flex-shrink-0"></div><div className="w-5/6 h-1 bg-gray-200 rounded-sm"></div></div>
                       </div>
                    </div>
                    <div className="space-y-1 mt-1">
                       <div className="w-1/4 h-1.5 bg-gray-800 rounded-sm"></div>
                       <div className="w-full h-px bg-gray-400"></div>
                       <div className="w-full h-1 bg-gray-200 rounded-sm"></div>
                    </div>
                    {selectedTemplate === 'simple' && (
                      <div className="absolute inset-0 bg-purple-600/10 flex items-center justify-center">
                        <div className="bg-purple-600 text-white p-2 rounded-full shadow-lg">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-4 bg-gray-50 border-t border-gray-100">
                    <h3 className="font-bold text-gray-900">Simple</h3>
                    <p className="text-xs text-gray-500 mt-1">Traditional, no-frills resume. Clean and ATS-friendly.</p>
                  </div>
                </div>
              </label>
            </div>
            {/* Color Picker for Template Accent */}
            <div className="mt-4 flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">Primary Color</label>
              <input
                type="color"
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value)}
                className="w-10 h-8 p-0 border rounded-md"
                aria-label="Choose primary color"
              />
              <input
                type="text"
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value)}
                className="px-2 py-1 border rounded-md text-sm w-28"
                aria-label="Primary color hex"
              />
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs text-gray-500">Preview</span>
                <span className="w-6 h-6 rounded-full border" style={{ background: selectedColor }} />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              className="w-full md:w-auto px-8 py-3 bg-purple-600 hover:bg-purple-700 !text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Generate CVR
            </button>
          </div>
        </div>
      </form>
      ) : (
        /* Generated CVR Display */
        <div className="w-full">
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">Resume preview will render here</p>
            <div className="flex flex-wrap justify-center gap-4">
              <button
                onClick={() => setIsExportModalOpen(true)}
                className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold shadow-lg shadow-purple-200 transition-all flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export PDF
              </button>
              <button
                onClick={handleCreateNew}
                className="px-8 py-3 bg-white border-2 border-gray-200 hover:border-purple-200 hover:bg-purple-50 text-gray-700 hover:text-purple-700 rounded-lg font-bold transition-all flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create New Resume
              </button>
            </div>
          </div>
        </div>
      )}
      <CVRSuccessModal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        onDownload={handleDownload}
      />

      <ExportCVRModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
    </DashboardLayout>
  );
}
packages\web-portal\vector-web\src\app\api\registrar\credentials\route.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { decryptData, encryptData } from '@/lib/encryption'; 
import { db } from '@/lib/db';
import { z } from 'zod';

export const dynamic = 'force-dynamic'; 

export async function GET(req: Request) {
  const cookieStore = await cookies();

  // 1. Initialize Supabase with the MASTER KEY (Service Role)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, 
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
      },
    }
  );

  try {
    // 2. 🛡️ VERIFY AUTHENTICATION
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error("API Auth Error:", authError);
      return NextResponse.json({ error: 'Unauthorized: Session invalid' }, { status: 401 });
    }

    // 3. 🛡️ VERIFY AUTHORIZATION (RBAC)
    const { data: userRecord, error: roleError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (roleError || !userRecord) {
      return NextResponse.json({ error: 'Forbidden: User record not found' }, { status: 403 });
    }

    if (userRecord.role !== 'registrar' && userRecord.role !== 'super_admin') {
      return NextResponse.json({ 
        error: `Forbidden: Access restricted for role ${userRecord.role}` 
      }, { status: 403 });
    }

    // 4. FETCH CREDENTIAL DATA (Updated to include W3C fields)
    const { data: credentials, error: fetchError } = await supabase
      .from('verified_credentials')
      .select(`
        id,
        skill_name,
        issued_at,
        transaction_hash,
        certificate_number,
        private_notes,
        schema_url,
        credential_data,
        user:users!user_id (
          full_name,
          wallet_address
        )
      `)
      .order('issued_at', { ascending: false });

    if (fetchError) throw fetchError;

    // 5. 🔓 DECRYPT ON SERVER
    const processedData = credentials.map(cred => {
      let decryptedNote = null;
      if (cred.private_notes) {
        try {
          decryptedNote = decryptData(cred.private_notes);
        } catch (e) {
          console.error(`Failed to decrypt note for ID: ${cred.id}`);
          decryptedNote = "[Decryption Failed]";
        }
      }

      return {
        ...cred,
        private_notes: decryptedNote 
      };
    });

    return NextResponse.json(processedData);

  } catch (error: any) {
    console.error('Fatal API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Validation schema for incoming mint requests
const MintCredentialValidator = z.object({
  user_id: z.string().uuid("Invalid student ID"),
  schema_id: z.string().uuid("Invalid schema ID"),
  skill_name: z.string().min(1, "Skill name is required"),
  credential_data: z.record(z.any(), "Credential data must be an object"),
  private_notes: z.string().optional(),
  certificate_number: z.string().optional(),
  token_id: z.string().min(1, "Token ID is required"),
  transaction_hash: z.string().optional()
});

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
        },
      },
    }
  );

  try {
    // 1. Verify Authentication & Authorization
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const dbUser = await db.users.findUnique({ where: { id: user.id }, select: { role: true, wallet_address: true } });
    if (dbUser?.role !== 'registrar') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // 2. Parse and validate base request
    const body = await req.json();
    const validatedData = MintCredentialValidator.parse(body);

    // 3. Fetch the requested schema template
    const schemaTemplate = await db.credential_schemas.findUnique({
      where: { id: validatedData.schema_id }
    });

    if (!schemaTemplate) {
      return NextResponse.json({ error: 'Schema template not found' }, { status: 404 });
    }

    // 4. Validate incoming student data against the specific schema (Basic Key Match)
    const requiredKeys = Object.keys(schemaTemplate.json_schema as object);
    const providedKeys = Object.keys(validatedData.credential_data);
    const missingKeys = requiredKeys.filter(key => !providedKeys.includes(key));

    if (missingKeys.length > 0) {
      return NextResponse.json({ 
        error: 'Credential data does not match W3C schema requirements',
        missing_fields: missingKeys 
      }, { status: 400 });
    }

    // 5. Generate standard W3C JSON-LD payload
    const issuerDid = dbUser.wallet_address ? `did:polygon:amoy:${dbUser.wallet_address}` : `did:web:yourdomain.com:registrar:${user.id}`;
    const schemaUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/schemas/${schemaTemplate.id}`;

    const w3cPayload = {
      "@context": [
        "https://www.w3.org/2018/credentials/v1",
        schemaUrl
      ],
      "type": ["VerifiableCredential", schemaTemplate.title.replace(/\s+/g, '')],
      "issuer": issuerDid,
      "issuanceDate": new Date().toISOString(),
      "credentialSubject": {
        "id": `did:vector:student:${validatedData.user_id}`,
        ...validatedData.credential_data
      }
    };

    // 6. Encrypt private notes if present
    const encryptedNotes = validatedData.private_notes 
      ? encryptData(validatedData.private_notes) 
      : null;

    // 7. Save to database
    const newCredential = await db.verified_credentials.create({
      data: {
        user_id: validatedData.user_id,
        skill_name: validatedData.skill_name,
        token_id: validatedData.token_id,
        transaction_hash: validatedData.transaction_hash,
        issuer_did: issuerDid,
        schema_url: schemaUrl,
        credential_data: w3cPayload.credentialSubject,
        private_notes: encryptedNotes,
        certificate_number: validatedData.certificate_number
      }
    });

    return NextResponse.json({ 
      success: true, 
      data: newCredential,
      w3c_document: w3cPayload 
    }, { status: 201 });

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    console.error('POST /api/registrar/credentials error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}