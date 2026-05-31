"""
ZAP API Endpoint Seeder
-----------------------
Hits all VECTOR API endpoints through ZAP's proxy so ZAP can discover and scan them.
Run this WHILE ZAP is open and your dev server is running.

Usage: python zap_seed_endpoints.py
"""

import urllib.request
import json
import time

APP_URL = "http://localhost:3001"
ZAP_PROXY = "http://localhost:3000"

# Configure proxy
proxy_handler = urllib.request.ProxyHandler({
    'http': ZAP_PROXY,
    'https': ZAP_PROXY,
})
opener = urllib.request.build_opener(proxy_handler)

def hit(method, path, body=None, content_type="application/json"):
    url = f"{APP_URL}{path}"
    data = json.dumps(body).encode("utf-8") if body else None
    headers = {"Content-Type": content_type} if content_type else {}
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        resp = opener.open(req, timeout=10)
        status = resp.status
    except urllib.error.HTTPError as e:
        status = e.code
    except Exception as e:
        status = str(e)[:50]
    print(f"  {method:6s} {path:50s} -> {status}")
    return status

print(f"\n{'='*70}")
print(f"  VECTOR ZAP Endpoint Seeder")
print(f"  App: {APP_URL}  |  ZAP Proxy: {ZAP_PROXY}")
print(f"{'='*70}\n")

# ── Frontend Pages ──
print("── Frontend Pages ──")
for page in ["/", "/login", "/register", "/registrar-register", "/security",
             "/admin", "/admin/dashboard", "/admin/audit-logs", "/admin/system-metrics",
             "/registrar", "/registrar/dashboard", "/registrar/students",
             "/student", "/student/dashboard", "/student/skills", "/student/coach",
             "/verify/test-id-123", "/verify/cvr/test-id-123"]:
    hit("GET", page)

time.sleep(1)

# ── Auth API ──
print("\n── Auth API ──")
hit("POST", "/api/auth/login-check", {"email": "test@test.com"})
hit("POST", "/api/auth/request-reset", {"email": "test@test.com"})
hit("POST", "/api/auth/confirm-reset", {"token": "test", "password": "Test1234!"})
hit("POST", "/api/auth/cancel-reset", {"token": "test"})
hit("POST", "/api/auth/send-verification", {"email": "test@test.com"})
hit("POST", "/api/auth/verify-email", {"token": "test"})
hit("POST", "/api/auth/verify-captcha", {"token": "test"})
hit("GET", "/api/auth/callback")

time.sleep(1)

# ── Registrar API ──
print("\n── Registrar API ──")
hit("GET", "/api/registrar/credentials")
hit("POST", "/api/registrar/csv-upload", {"data": "test"})
hit("POST", "/api/registrar/log-mint", {"txHash": "0x123", "students": []})
hit("GET", "/api/verify-registrar")

time.sleep(1)

# ── Student API ──
print("\n── Student API ──")
hit("GET", "/api/student/credentials")
hit("GET", "/api/student/skill-health")
hit("GET", "/api/student/market-insights")

time.sleep(1)

# ── AI / Chat API ──
print("\n── AI / Chat API ──")
hit("POST", "/api/chat", {"message": "test query", "studentId": "test-001"})
hit("POST", "/api/analyze", {"studentId": "test-001"})
hit("POST", "/api/cvr/analyze", {"cvrId": "test-001"})

time.sleep(1)

# ── Blockchain / Mint API ──
print("\n── Blockchain / Mint API ──")
hit("POST", "/api/mint", {"students": [], "skillId": 1})

# ── Verify API ──
print("\n── Verify API ──")
hit("GET", "/api/verify/test-credential-id")
hit("GET", "/api/verify/cvr/test-cvr-id")

time.sleep(1)

# ── Schema API ──
print("\n── Schema API ──")
hit("GET", "/api/schemas")
hit("GET", "/api/schemas/test-schema-id")
hit("POST", "/api/schemas", {"name": "Test Schema", "fields": []})

# ── CVR Export ──
print("\n── CVR API ──")
hit("GET", "/api/cvr/export")

# ── Admin API ──
print("\n── Admin API ──")
hit("GET", "/api/admin")
hit("GET", "/api/admin/system-logs")

# ── Security Demo ──
print("\n── Security Demo ──")
hit("POST", "/api/security-demo/ipfs-test", {"testData": "hello"})

# ── Injection Attempts (for ZAP to see how app handles them) ──
print("\n── Injection Test Payloads ──")
hit("POST", "/api/chat", {"message": "<script>alert('xss')</script>"})
hit("POST", "/api/chat", {"message": "'; DROP TABLE users; --"})
hit("POST", "/api/registrar/csv-upload", {"data": "=CMD('calc')"})
hit("GET", "/api/verify/<script>alert(1)</script>")
hit("GET", "/api/schemas/../../../etc/passwd")

print(f"\n{'='*70}")
print(f"  Done! All endpoints seeded into ZAP.")
print(f"  Now go to ZAP -> right-click localhost:3001 -> Active Scan")
print(f"{'='*70}\n")
