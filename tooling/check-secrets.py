#!/usr/bin/env python3
"""
Pre-commit hook to detect accidental secret leakage in staged files.
"""
import re
import subprocess
import sys

SECRET_PATTERNS = [
    (r"-----BEGIN (RSA|EC|PGP|OPENSSH) PRIVATE KEY-----", "Private key detected"),
    (r"sk_live_[0-9a-zA-Z]{24,}", "Live Stripe/Paystack secret key"),
    (r"FLWSECK-[0-9a-zA-Z]{32,}-X", "Live Flutterwave secret key"),
    (r"AIza[0-9A-Za-z-_]{35}", "Google API key"),
    (r"gsk_[0-9a-zA-Z]{48,}", "Groq API key"),
    (r"re_[0-9a-zA-Z]{32,}", "Resend API key"),
    (r"postgresql://[^:]+:[^@]+@", "Database connection string with inline credentials"),
]

def get_staged_files():
    try:
        output = subprocess.check_output(
            ["git", "diff", "--cached", "--name-only", "--diff-filter=ACM"],
            text=True,
            stderr=subprocess.DEVNULL
        )
        return [f.strip() for f in output.splitlines() if f.strip()]
    except Exception:
        return []

def scan_file(filepath):
    # Skip binary, lockfiles, markdown documentation, tests, guard rules, and example configs
    if any(filepath.endswith(ext) for ext in [".lock", ".png", ".jpg", ".pdf", ".ico", ".example", ".md"]):
        return []
    if filepath in ["tooling/check-secrets.py", "apps/api/app/engines/guard.py"] or filepath.startswith("apps/api/tests/"):
        return []
    
    findings = []
    try:
        content = subprocess.check_output(
            ["git", "show", f":{filepath}"],
            text=True,
            errors="replace",
            stderr=subprocess.DEVNULL
        )
        for lineno, line in enumerate(content.splitlines(), start=1):
            for pattern, desc in SECRET_PATTERNS:
                if re.search(pattern, line):
                    # Check if line is a template placeholder or local dev URL
                    if any(p in line for p in ["YOUR_", "sk_test_", "FLWSECK_TEST", "localhost", "127.0.0.1", "dummy", "placeholder", "example.com"]):
                        continue
                    findings.append(f"  {filepath}:{lineno} - {desc}")
    except Exception:
        pass
    return findings

def main():
    staged = get_staged_files()
    if not staged:
        sys.exit(0)
    
    all_findings = []
    for filepath in staged:
        findings = scan_file(filepath)
        if findings:
            all_findings.extend(findings)
    
    if all_findings:
        print("\n[!] SECURITY GATE FAILED: High-entropy secret patterns detected in staged files:")
        for f in all_findings:
            print(f)
        print("\nPlease remove secrets before committing. Use environment variables instead.\n")
        sys.exit(1)

if __name__ == "__main__":
    main()
