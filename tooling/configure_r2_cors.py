#!/usr/bin/env python3
"""
Automated Cloudflare R2 CORS Configuration Script (Roadmap 5.1).
Sets CORS rules on the R2 bucket to allow web frontend direct PUT/GET uploads.
"""

import asyncio
import os
import sys

# Ensure apps/api is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "apps", "api")))

from app.core.config import settings
from app.engines.storage import storage_engine


async def main():
    print("--- Configuring Cloudflare R2 CORS Rules ---")
    if not storage_engine.is_configured:
        print("Cloudflare R2 credentials not fully configured in environment.")
        print(f"Bucket: {settings.r2_bucket_name}")
        sys.exit(0)

    print(f"Target Bucket: {settings.r2_bucket_name}")
    print(f"Endpoint: {settings.r2_endpoint_url}")

    allowed_origins = [
        "http://localhost:3000",
        "http://localhost:3001",
        "https://pansgpt.com",
        "https://app.pansgpt.com",
        "https://staging.pansgpt.com",
        "https://*.vercel.app",
    ]

    print(f"Configuring CORS for origins: {allowed_origins}")
    success = await storage_engine.put_bucket_cors(allowed_origins)
    if success:
        print("CORS rules applied successfully to R2 bucket.")
    else:
        print("Failed to apply CORS rules to R2 bucket (check permissions).")


if __name__ == "__main__":
    asyncio.run(main())
