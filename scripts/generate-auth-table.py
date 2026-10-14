import os
import re
import glob

def scan_file_security(file_path):
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()

    # Auth check
    auth_req = bool(re.search(r'(\bauth\s*\(|\bgetServerSession|\bgetToken|\brequireAdmin|\brequireAuth|\brequireRole|\bcheckUserAuth|\bgetCurrentUserContext\b)', content))
    
    # Roles
    roles = []
    if re.search(r'role\s*===?\s*["\']ADMIN["\']|role\s*!==?\s*["\']ADMIN["\']|\brequireAdmin\b|\bisAdmin\b', content):
        roles.append("ADMIN")
    if re.search(r'role\s*===?\s*["\']TEACHER["\']|role\s*!==?\s*["\']TEACHER["\']|\brequireTeacher\b|\bisTeacher\b', content):
        roles.append("TEACHER")
    if re.search(r'role\s*===?\s*["\']STUDENT["\']|role\s*===?\s*["\']FREE["\']', content):
        roles.append("STUDENT")
    if not roles:
        if auth_req:
            roles_str = "AUTHENTICATED"
        else:
            roles_str = "PUBLIC"
    else:
        roles_str = ", ".join(roles)

    # Ownership / IDOR check
    idor = bool(re.search(r'where:\s*\{[^}]*\b(userId|user\.id|authorId|ownerId)\b|\buserId\s*===?\s*session|\.userId\s*===?\s*user|\buserId\s*:\s*session\?\.user\?\.id|\bfindFirst\s*\(\s*\{\s*where:\s*\{[^}]*userId', content, re.DOTALL))
    
    # Rate limit
    rate_limit = bool(re.search(r'rateLimit|checkRateLimit|rate_limit|rateLimiter|checkLimit', content))

    # Zod validation
    zod = bool(re.search(r'z\.object|\.safeParse|\.parse\(|z\.string|z\.array', content))

    return {
        "auth": "YES" if auth_req else "NO",
        "roles": roles_str,
        "idor": "YES" if idor else ("N/A" if not auth_req else "NO/ROLE_GATED"),
        "rate_limit": "YES" if rate_limit else "NO",
        "zod": "YES" if zod else "NO",
    }

def find_test_coverage(route_path, test_files):
    # derive url pattern e.g. app/api/exam/attempt/user-status/route.ts -> /api/exam/attempt/user-status
    url_pattern = route_path.replace("app", "").replace("/route.ts", "").replace("/route.js", "").replace("lib/actions/", "")
    base_segment = url_pattern.split("[")[0].rstrip("/")
    if not base_segment or base_segment == "/api":
        base_segment = url_pattern

    matched_tests = set()
    for tf, tf_content in test_files.items():
        if (base_segment and base_segment in tf_content) or (url_pattern and url_pattern in tf_content):
            matched_tests.add(os.path.basename(tf))
    
    return ", ".join(sorted(matched_tests)[:2]) if matched_tests else "unit/manual"

def main():
    test_files = {}
    for tf in glob.glob("tests/**/*.ts", recursive=True):
        try:
            with open(tf, "r", encoding="utf-8", errors="ignore") as f:
                test_files[tf] = f.read()
        except:
            pass

    api_routes = sorted(glob.glob("app/api/**/route.ts", recursive=True))
    
    print("### API Routes Authorisation Matrix\n")
    print("| Route | Auth Required | Enforced Roles | Ownership/IDOR Check | Rate Limit | Zod Validated | Test Coverage |")
    print("|---|---|---|---|---|---|---|")

    for route in api_routes:
        sec = scan_file_security(route)
        url = route.replace("app", "").replace("/route.ts", "")
        cov = find_test_coverage(route, test_files)
        print(f"| `{url}` | {sec['auth']} | {sec['roles']} | {sec['idor']} | {sec['rate_limit']} | {sec['zod']} | {cov} |")

    action_files = sorted(glob.glob("lib/actions/**/*.ts", recursive=True))
    print("\n### Server Actions Authorisation Matrix\n")
    print("| Action File | Auth Required | Enforced Roles | Ownership/IDOR Check | Rate Limit | Zod Validated | Test Coverage |")
    print("|---|---|---|---|---|---|---|")

    for act in action_files:
        sec = scan_file_security(act)
        cov = find_test_coverage(act, test_files)
        print(f"| `{act}` | {sec['auth']} | {sec['roles']} | {sec['idor']} | {sec['rate_limit']} | {sec['zod']} | {cov} |")

if __name__ == "__main__":
    main()
