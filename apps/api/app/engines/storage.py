# ==============================================================================
# Cloudflare R2 Storage Engine (Phase 5)
# S3-compatible async object storage for university lecture materials & notes
# ==============================================================================

import re
from contextlib import asynccontextmanager

import aioboto3
from botocore.config import Config

from app.core.config import settings


def sanitize_filename_part(text: str) -> str:
    """Sanitize directory and file components for safe R2 storage paths."""
    clean = re.sub(r"[^\w\-_.]", "_", text.strip())
    return clean.lower()


def build_document_storage_key(
    university_id: str,
    course_code: str,
    document_id: str,
    file_extension: str = "pdf",
) -> str:
    """
    Construct canonical R2 key:
    universities/{university_id}/courses/{course_code}/original/{document_id}.{ext}
    """
    ext = file_extension.lstrip(".").lower()
    clean_course = sanitize_filename_part(course_code)
    return f"universities/{university_id}/courses/{clean_course}/original/{document_id}.{ext}"


def build_converted_storage_key(
    document_id: str,
    university_id: str | None = None,
    course_code: str | None = None,
) -> str:
    """
    Construct canonical converted R2 key for Office documents converted to PDF:
    universities/{university_id}/courses/{course_code}/converted/{document_id}.pdf
    with fallback to converted/{document_id}.pdf if university/course not provided.
    """
    if university_id and course_code:
        clean_course = sanitize_filename_part(course_code)
        return f"universities/{university_id}/courses/{clean_course}/converted/{document_id}.pdf"
    return f"converted/{document_id}.pdf"


class R2StorageEngine:
    def __init__(self):
        self._session = aioboto3.Session()
        self._client_config = Config(
            signature_version="s3v4",
            s3={"addressing_style": "path"},
            retries={"max_attempts": 3, "mode": "standard"},
        )

    @property
    def is_configured(self) -> bool:
        return bool(settings.r2_endpoint_url and settings.r2_access_key and settings.r2_secret_key)

    @asynccontextmanager
    async def get_client(self):
        """Async context manager yielding an aioboto3 s3 client."""
        if not self.is_configured:
            raise RuntimeError(
                "Cloudflare R2 is not configured. Missing endpoint, access key, or secret key."
            )
        async with self._session.client(
            "s3",
            endpoint_url=settings.r2_endpoint_url,
            aws_access_key_id=settings.r2_access_key,
            aws_secret_access_key=settings.r2_secret_key,
            config=self._client_config,
        ) as client:
            yield client

    async def generate_presigned_put_url(
        self,
        key: str,
        content_type: str = "application/pdf",
        expires_in: int = 900,
    ) -> str:
        """Generate time-limited presigned URL for direct browser/client upload."""
        async with self.get_client() as s3:
            params = {
                "Bucket": settings.r2_bucket_name,
                "Key": key,
                "ContentType": content_type,
            }
            url = await s3.generate_presigned_url(
                ClientMethod="put_object",
                Params=params,
                ExpiresIn=expires_in,
            )
            return url

    async def generate_presigned_get_url(
        self,
        key: str,
        expires_in: int = 900,
    ) -> str:
        """Generate time-limited presigned URL for edge PDF streaming."""
        async with self.get_client() as s3:
            params = {
                "Bucket": settings.r2_bucket_name,
                "Key": key,
            }
            url = await s3.generate_presigned_url(
                ClientMethod="get_object",
                Params=params,
                ExpiresIn=expires_in,
            )
            return url

    async def download_bytes(self, key: str) -> bytes:
        """Download raw bytes of an object from R2."""
        async with self.get_client() as s3:
            response = await s3.get_object(
                Bucket=settings.r2_bucket_name,
                Key=key,
            )
            async with response["Body"] as stream:
                return await stream.read()

    async def upload_bytes(
        self,
        key: str,
        data: bytes,
        content_type: str = "application/pdf",
    ) -> None:
        """Direct upload of bytes to R2."""
        async with self.get_client() as s3:
            await s3.put_object(
                Bucket=settings.r2_bucket_name,
                Key=key,
                Body=data,
                ContentType=content_type,
            )

    async def object_exists(self, key: str) -> bool:
        """Check if an object exists in the active bucket."""
        try:
            async with self.get_client() as s3:
                await s3.head_object(
                    Bucket=settings.r2_bucket_name,
                    Key=key,
                )
                return True
        except Exception:
            return False

    async def delete_object(self, key: str) -> bool:
        """Delete an object from R2."""
        try:
            async with self.get_client() as s3:
                await s3.delete_object(
                    Bucket=settings.r2_bucket_name,
                    Key=key,
                )
                return True
        except Exception:
            return False

    async def put_bucket_cors(self, allowed_origins: list[str] | None = None) -> bool:
        """
        Configure CORS rules on the R2 bucket to allow web frontend direct PUT/GET uploads.
        """
        origins = allowed_origins or [
            "http://localhost:3000",
            "http://localhost:3001",
            "https://pansgpt.com",
            "https://app.pansgpt.com",
            "https://staging.pansgpt.com",
            "https://*.vercel.app",
        ]
        cors_configuration = {
            "CORSRules": [
                {
                    "AllowedHeaders": ["*"],
                    "AllowedMethods": ["GET", "PUT", "POST", "HEAD"],
                    "AllowedOrigins": origins,
                    "ExposeHeaders": ["ETag"],
                    "MaxAgeSeconds": 3600,
                }
            ]
        }
        try:
            async with self.get_client() as s3:
                await s3.put_bucket_cors(
                    Bucket=settings.r2_bucket_name,
                    CORSConfiguration=cors_configuration,
                )
                return True
        except Exception:
            return False


storage_engine = R2StorageEngine()
r2_storage = storage_engine
