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
    (  # [PRELAUNCH FIX]
        r"postgresql://[^:]+:[^@]+@",  # [PRELAUNCH FIX]
        "Database connection string with inline credentials",  # [PRELAUNCH FIX]
    ),  # [PRELAUNCH FIX]
]


def get_staged_files() -> list[str]:  # [PRELAUNCH FIX]
    try:
        output = subprocess.check_output(
            ["git", "diff", "--cached", "--name-only", "--diff-filter=ACM"],
            text=True,
            stderr=subprocess.DEVNULL,  # [PRELAUNCH FIX]
        )
        return [f.strip() for f in output.splitlines() if f.strip()]
    except (subprocess.CalledProcessError, OSError) as exc:  # [PRELAUNCH FIX]
        print(  # [PRELAUNCH FIX]
            "SECURITY GATE FAILED: Cannot list staged files.",  # [PRELAUNCH FIX]
            file=sys.stderr,  # [PRELAUNCH FIX]
        )  # [PRELAUNCH FIX]
        raise SystemExit(1) from exc  # [PRELAUNCH FIX]


def scan_file(filepath: str) -> list[str]:  # [PRELAUNCH FIX]
    # Skip binary, lockfiles, markdown documentation, tests, guard rules, and example configs  # [PRELAUNCH FIX]
    if any(  # [PRELAUNCH FIX]
        filepath.endswith(ext)  # [PRELAUNCH FIX]
        for ext in [  # [PRELAUNCH FIX]
            ".lock",  # [PRELAUNCH FIX]
            ".png",  # [PRELAUNCH FIX]
            ".jpg",  # [PRELAUNCH FIX]
            ".pdf",  # [PRELAUNCH FIX]
            ".ico",  # [PRELAUNCH FIX]
            ".example",  # [PRELAUNCH FIX]
            ".md",  # [PRELAUNCH FIX]
        ]  # [PRELAUNCH FIX]
    ):  # [PRELAUNCH FIX]
        return []  # [PRELAUNCH FIX]
    if filepath in [  # [PRELAUNCH FIX]
        "tooling/check-secrets.py",  # [PRELAUNCH FIX]
        "apps/api/app/engines/guard.py",  # [PRELAUNCH FIX]
    ] or filepath.startswith("apps/api/tests/"):  # [PRELAUNCH FIX]
        return []

    findings = []
    try:
        content = subprocess.check_output(
            ["git", "show", f":{filepath}"],
            text=True,
            errors="replace",
            stderr=subprocess.DEVNULL,  # [PRELAUNCH FIX]
        )
        for lineno, line in enumerate(content.splitlines(), start=1):
            for pattern, desc in SECRET_PATTERNS:
                if re.search(pattern, line):
                    # Check if line is a template placeholder or local dev URL
                    if any(  # [PRELAUNCH FIX]
                        p in line  # [PRELAUNCH FIX]
                        for p in [  # [PRELAUNCH FIX]
                            "YOUR_",  # [PRELAUNCH FIX]
                            "sk_test_",  # [PRELAUNCH FIX]
                            "FLWSECK_TEST",  # [PRELAUNCH FIX]
                            "localhost",  # [PRELAUNCH FIX]
                            "127.0.0.1",  # [PRELAUNCH FIX]
                            "dummy",  # [PRELAUNCH FIX]
                            "placeholder",  # [PRELAUNCH FIX]
                            "example.com",  # [PRELAUNCH FIX]
                        ]  # [PRELAUNCH FIX]
                    ):  # [PRELAUNCH FIX]
                        continue
                    findings.append(f"  {filepath}:{lineno} - {desc}")
    except (subprocess.CalledProcessError, OSError) as exc:  # [PRELAUNCH FIX]
        print(  # [PRELAUNCH FIX]
            f"SECURITY GATE FAILED: Cannot read staged file {filepath}.",  # [PRELAUNCH FIX]
            file=sys.stderr,  # [PRELAUNCH FIX]
        )  # [PRELAUNCH FIX]
        raise SystemExit(1) from exc  # [PRELAUNCH FIX]
    return findings


def get_files_to_scan() -> list[str]:  # [PRELAUNCH FIX]
    if "--all" in sys.argv:
        try:
            output = subprocess.check_output(
                ["git", "ls-files"],
                text=True,
                stderr=subprocess.DEVNULL,
            )
            return [f.strip() for f in output.splitlines() if f.strip()]
        except (subprocess.CalledProcessError, OSError) as exc:  # [PRELAUNCH FIX]
            print(  # [PRELAUNCH FIX]
                "SECURITY GATE FAILED: Cannot list tracked files.",  # [PRELAUNCH FIX]
                file=sys.stderr,  # [PRELAUNCH FIX]
            )  # [PRELAUNCH FIX]
            raise SystemExit(1) from exc  # [PRELAUNCH FIX]
    return get_staged_files()


def main() -> None:  # [PRELAUNCH FIX]
    files = get_files_to_scan()
    if not files:
        sys.exit(0)

    all_findings = []
    for filepath in files:
        findings = scan_file(filepath)
        if findings:
            all_findings.extend(findings)

    if all_findings:
        print(  # [PRELAUNCH FIX]
            "\n[!] SECURITY GATE FAILED: High-entropy secret patterns detected in staged files:"  # [PRELAUNCH FIX]
        )  # [PRELAUNCH FIX]
        for f in all_findings:
            print(f)
        print(  # [PRELAUNCH FIX]
            "\nPlease remove secrets before committing. Use environment variables instead.\n"  # [PRELAUNCH FIX]
        )  # [PRELAUNCH FIX]
        sys.exit(1)

    print(f"Secret scan passed ({len(files)} files checked).")  # [PRELAUNCH FIX]


if __name__ == "__main__":
    main()
