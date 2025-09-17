param(
  [Parameter(Mandatory=$true)]
  [string]$RepoPath,                   # Path to your Houseflow repo root

  [switch]$RunPrismaDiff,              # Add this flag to generate schema SQL via Prisma
  [string]$OutputRoot = "$env:USERPROFILE\Desktop"  # Where to drop the zip/folder
)

# Fail on errors
$ErrorActionPreference = "Stop"

# Resolve paths
$Repo = (Resolve-Path $RepoPath).Path
$stamp = (Get-Date).ToString("yyyyMMdd-HHmmss")
$OutDir = Join-Path $OutputRoot "houseflow-snapshot-$stamp"
New-Item -ItemType Directory -Path $OutDir | Out-Null

Write-Host "==> Collecting from: $Repo"
Write-Host "==> Output folder:   $OutDir"

function Copy-IfExists {
  param([string]$RelPath, [string]$DestSub = "")
  $src = Join-Path $Repo $RelPath
  if (Test-Path $src) {
    $dest = if ($DestSub) { Join-Path $OutDir $DestSub } else { $OutDir }
    New-Item -ItemType Directory -Path $dest -Force | Out-Null
    Copy-Item $src -Destination $dest -Recurse -Force
    Write-Host "  Copied: $RelPath"
  } else {
    Write-Host "  Skipped (missing): $RelPath"
  }
}

# 1) Core configs
Copy-IfExists "package.json"
Copy-IfExists "pnpm-lock.yaml"
Copy-IfExists "yarn.lock"
Copy-IfExists "package-lock.json"
Copy-IfExists "tsconfig.json"
Copy-IfExists "next.config.js"
Copy-IfExists "tailwind.config.js"
Copy-IfExists ".nvmrc"
Copy-IfExists "Dockerfile"
Copy-IfExists ".env.example"

# 2) Prisma schema & migrations (schema.prisma is the big one)
Copy-IfExists "prisma\schema.prisma" "prisma"
Copy-IfExists "prisma\migrations" "prisma"

# 3) Auth & middleware (common locations)
Copy-IfExists "src\lib\auth.ts" "src\lib"
Copy-IfExists "src\lib\auth.js" "src\lib"
Copy-IfExists "src\middleware.ts" "src"
Copy-IfExists "src\middleware.js" "src"

# 4) Notes-related files if any already exist
#    (adjust patterns if your structure differs)
$noteGlobs = @(
  "src\pages\notes*",
  "src\pages\api\notes*",
  "src\components\*note*",
  "src\components\notes*",
  "src\styles\notes.css",
  "src\lib\*note*"
)
foreach ($g in $noteGlobs) { Copy-IfExists $g }

# 5) Tree listings (so I see structure without huge copies)
function Write-Tree {
  param([string]$Rel, [string]$OutFile)
  $path = Join-Path $Repo $Rel
  if (Test-Path $path) {
    $list = Get-ChildItem -Path $path -Recurse -File | ForEach-Object {
      $_.FullName.Replace($Repo, "").TrimStart('\','/')
    }
    $dest = Join-Path $OutDir $OutFile
    $list | Set-Content -NoNewline:$false -Path $dest
    Write-Host "  Wrote listing: $OutFile"
  } else {
    Write-Host "  Listing skipped (missing): $Rel"
  }
}
Write-Tree "src\pages"       "LISTING_src_pages.txt"
Write-Tree "src\components"  "LISTING_src_components.txt"
Write-Tree "src\lib"         "LISTING_src_lib.txt"

# 6) Safe env-var names from .env.example (names only)
$envExample = Join-Path $Repo ".env.example"
if (Test-Path $envExample) {
  $names = Get-Content $envExample |
    Where-Object {$_ -match '^[A-Z0-9_]+\s*='} |
    ForEach-Object { ($_ -split '=')[0].Trim() } |
    Sort-Object -Unique
  $names | Set-Content (Join-Path $OutDir "ENV_VARIABLE_NAMES.txt")
  Write-Host "  Extracted env var NAMES to ENV_VARIABLE_NAMES.txt"
} else {
  Write-Host "  .env.example not found; skipping env name extraction"
}

# 7) Optional: Prisma schema-only diff (generates SQL) via npx
if ($RunPrismaDiff) {
  Write-Host "==> Running Prisma diff to SQL (schema-only) ..."
  Push-Location $Repo
  try {
    $diffFile = Join-Path $OutDir "prisma_schema_diff.sql"
    $cmd = "npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > `"$diffFile`""
    # Run via cmd.exe to support redirection
    cmd.exe /c $cmd
    if (Test-Path $diffFile) {
      Write-Host "  Wrote: prisma_schema_diff.sql"
    } else {
      Write-Host "  Prisma diff did not produce output (check if Prisma is installed)."
    }
  } catch {
    Write-Warning "  Prisma diff failed: $($_.Exception.Message)"
  } finally {
    Pop-Location
  }
}

# 8) Zip it
$zipPath = Join-Path $OutputRoot "houseflow-snapshot-$stamp.zip"
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Compress-Archive -Path (Join-Path $OutDir '*') -DestinationPath $zipPath -CompressionLevel Optimal
Write-Host "==> Done. Zip created at: $zipPath"
