"""Run auth browser contracts against disposable infrastructure, never hosted credentials."""
import json
import os
from pathlib import Path
import subprocess
import sys
import time
import urllib.request

ROOT = Path(__file__).resolve().parent.parent
LIVE = "--live" in sys.argv
PNPM = "pnpm.cmd" if os.name == "nt" else "pnpm"
PORT = sys.argv[sys.argv.index("--port") + 1] if "--port" in sys.argv else "3000"
env = dict(os.environ)
# Explicit values override .env.local, including optional telemetry and API identity keys.
env.update(NEXT_PUBLIC_APP_URL=f"http://localhost:{PORT}", NEXT_PUBLIC_API_URL="http://127.0.0.1:8000", NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321", NEXT_PUBLIC_SUPABASE_ANON_KEY="disposable-public-test-key", NEXT_PUBLIC_SENTRY_DSN="", NEXT_PUBLIC_POSTHOG_KEY="", X_API_KEY_WEB="disposable-browser-test", AUTH_E2E_LIVE="1" if LIVE else "0")
if LIVE:
    status = json.loads(subprocess.check_output([PNPM, "exec", "supabase", "status", "-o", "json"], cwd=ROOT, stderr=subprocess.DEVNULL, text=True))
    if not status["API_URL"].startswith("http://127.0.0.1:") or not status["DB_URL"].startswith("postgresql://postgres:postgres@127.0.0.1:"):
        raise SystemExit("Auth tests require disposable loopback Supabase.")
    env.update(NEXT_PUBLIC_SUPABASE_URL=status["API_URL"], NEXT_PUBLIC_SUPABASE_ANON_KEY=status["ANON_KEY"])
subprocess.run([PNPM, "--filter", "@pansgpt/web", "build"], cwd=ROOT, env=env, check=True)
processes = []
try:
    if LIVE:
        api_env = dict(env, X_API_KEY_WEB="", ENVIRONMENT="development", LOCAL_DEV_MODE="false", ENABLE_AI="false", ENABLE_INGESTION="false", DATABASE_URL=status["DB_URL"], SUPABASE_URL=status["API_URL"], SUPABASE_ANON_KEY=status["ANON_KEY"], SUPABASE_SERVICE_ROLE_KEY=status["SERVICE_ROLE_KEY"], SUPABASE_JWT_SECRET=status["JWT_SECRET"])
        # Do not load the developer's ignored environment file.
        processes.append(subprocess.Popen(["uv", "run", "--project", "apps/api", "uvicorn", "app.main:app", "--app-dir", "apps/api", "--host", "127.0.0.1", "--port", "8000"], cwd=ROOT, env=api_env))
    processes.append(subprocess.Popen([PNPM, "--filter", "@pansgpt/web", "exec", "next", "start", "--port", PORT], cwd=ROOT, env=env))
    for url in (["http://127.0.0.1:8000/health/live"] if LIVE else []) + [f"http://localhost:{PORT}/login"]:
        deadline = time.monotonic() + 90
        while True:
            if any(process.poll() is not None for process in processes): raise RuntimeError("Auth test server stopped unexpectedly.")
            try:
                with urllib.request.urlopen(url, timeout=3) as response:
                    if response.status == 200: break
            except Exception:
                if time.monotonic() > deadline: raise RuntimeError("Auth test server did not become ready.") from None
                time.sleep(1)
    result = subprocess.run([PNPM, "--filter", "@pansgpt/web", "exec", "playwright", "test"], cwd=ROOT, env=env)
    if "--preview" in sys.argv:
        print(f"Auth review server ready at http://localhost:{PORT}/login", flush=True)
        while True: time.sleep(10)
    raise SystemExit(result.returncode)
finally:
    for process in reversed(processes):
        if os.name == "nt": subprocess.run(["taskkill.exe", "/PID", str(process.pid), "/T", "/F"], capture_output=True)
        else: process.terminate()
    for process in processes:
        try: process.wait(timeout=10)
        except subprocess.TimeoutExpired: process.kill()
