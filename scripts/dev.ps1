<#
.SYNOPSIS
    PansGPT 2.0 Windows Developer Workflow Utility
.DESCRIPTION
    Provides commands to start, test, lint, and manage services on Windows PowerShell.
.EXAMPLE
    .\scripts\dev.ps1 dev
    .\scripts\dev.ps1 test
    .\scripts\dev.ps1 dev-api
#>

param(
    [Parameter(Position=0)]
    [ValidateSet("help", "dev", "dev-web", "dev-api", "test", "test-api", "lint", "typecheck", "docker-up", "docker-down", "clean")]
    [string]$Command = "help"
)

$RepoRoot = Resolve-Path "$PSScriptRoot\.."
$VenvPython = "$RepoRoot\apps\api\.venv\Scripts\python.exe"
$VenvUvicorn = "$RepoRoot\apps\api\.venv\Scripts\uvicorn.exe"
$VenvRuff = "$RepoRoot\apps\api\.venv\Scripts\ruff.exe"

$Python = if (Test-Path $VenvPython) { $VenvPython } else { "python" }
$Uvicorn = if (Test-Path $VenvUvicorn) { $VenvUvicorn } else { "uvicorn" }
$Ruff = if (Test-Path $VenvRuff) { $VenvRuff } else { "ruff" }

function Show-Help {
    Write-Host "PansGPT 2.0 Monorepo Developer Commands (PowerShell)" -ForegroundColor Cyan
    Write-Host "----------------------------------------------------" -ForegroundColor DarkCyan
    Write-Host "  .\scripts\dev.ps1 dev         - Start all workspaces concurrently (Turbo)"
    Write-Host "  .\scripts\dev.ps1 dev-web     - Start Next.js web application on port 3000"
    Write-Host "  .\scripts\dev.ps1 dev-api     - Start FastAPI backend on port 8000 with reload"
    Write-Host "  .\scripts\dev.ps1 test        - Run all tests across monorepo"
    Write-Host "  .\scripts\dev.ps1 test-api    - Run pytest suite in apps/api"
    Write-Host "  .\scripts\dev.ps1 lint        - Run linting checks across workspaces"
    Write-Host "  .\scripts\dev.ps1 typecheck   - Run typecheck across all workspaces"
    Write-Host "  .\scripts\dev.ps1 docker-up   - Start local Postgres & Redis containers"
    Write-Host "  .\scripts\dev.ps1 docker-down - Stop local Docker containers"
    Write-Host "  .\scripts\dev.ps1 clean       - Clean turbo and build caches"
}

switch ($Command) {
    "help" {
        Show-Help
    }
    "dev" {
        pnpm dev
    }
    "dev-web" {
        pnpm --filter=@pansgpt/web dev
    }
    "dev-api" {
        Push-Location "$RepoRoot\apps\api"
        try {
            & $Uvicorn app.main:app --reload --port 8000
        } finally {
            Pop-Location
        }
    }
    "test" {
        pnpm test
        Push-Location "$RepoRoot\apps\api"
        try {
            & $Python -m pytest -v
        } finally {
            Pop-Location
        }
    }
    "test-api" {
        Push-Location "$RepoRoot\apps\api"
        try {
            & $Python -m pytest -v
        } finally {
            Pop-Location
        }
    }
    "lint" {
        pnpm lint
        Push-Location "$RepoRoot\apps\api"
        try {
            & $Ruff check .
        } finally {
            Pop-Location
        }
    }
    "typecheck" {
        pnpm typecheck
    }
    "docker-up" {
        docker compose up -d
    }
    "docker-down" {
        docker compose down
    }
    "clean" {
        pnpm turbo clean
    }
}
