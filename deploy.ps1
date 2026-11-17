# Publish this site to GitHub Pages without git (uses the GitHub REST API).
# Usage: powershell -ExecutionPolicy Bypass -File deploy.ps1 [-Message "commit message"] [-KeyFile path]
# The token is read from githubkey.txt next to this script (or -KeyFile). It is never uploaded or printed.
# The new commit REPLACES the whole repository tree with the files listed below.
# Keep this file ASCII-only: Windows PowerShell 5.1 misreads UTF-8 without a BOM.
param([string]$Message = "Update site", [string]$KeyFile = "")

$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$owner  = 'lizitc'
$repo   = 'lizitc.github.io'
$branch = 'main'
$author = @{ name = 'lizitc'; email = '198859744+lizitc@users.noreply.github.com' }

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$keyFile = $KeyFile
if (-not $keyFile) { $keyFile = Join-Path $root 'githubkey.txt' }
if (-not (Test-Path $keyFile)) { throw "Token file not found: $keyFile" }
$tok  = (Get-Content $keyFile -Raw).Trim()
$headers = @{
  Authorization          = "Bearer $tok"
  'User-Agent'           = 'site-deploy'
  Accept                 = 'application/vnd.github+json'
  'X-GitHub-Api-Version' = '2022-11-28'
}

function Api([string]$Method, [string]$Path, $Body) {
  $uri = "https://api.github.com$Path"
  try {
    if ($null -ne $Body) {
      $bytes = [Text.Encoding]::UTF8.GetBytes(($Body | ConvertTo-Json -Depth 10 -Compress))
      return Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers -Body $bytes -ContentType 'application/json; charset=utf-8'
    }
    return Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers
  } catch {
    $code = 0
    if ($_.Exception.Response) { $code = [int]$_.Exception.Response.StatusCode }
    $detail = $_.ErrorDetails.Message
    throw "[$code] $Method $Path :: $detail"
  }
}
function Exists([string]$Path) {
  try { Api GET $Path $null | Out-Null; return $true }
  catch { if ("$_".StartsWith('[404]')) { return $false }; throw }
}

# ---------- 1. Repository ----------
if (-not (Exists "/repos/$owner/$repo")) {
  Write-Host "Creating repository $owner/$repo ..."
  $desc = -join ([char[]](0x6817, 0x5B50)) + 'tc ' + -join ([char[]](0x7684, 0x4E2A, 0x4EBA, 0x7F51, 0x7AD9))
  Api POST '/user/repos' @{
    name = $repo; description = $desc; homepage = "https://$repo/"
    private = $false; auto_init = $true; has_wiki = $false; has_projects = $false
  } | Out-Null
  for ($i = 0; $i -lt 10 -and -not (Exists "/repos/$owner/$repo/git/ref/heads/$branch"); $i++) { Start-Sleep -Seconds 2 }
}
$parent = (Api GET "/repos/$owner/$repo/git/ref/heads/$branch" $null).object.sha
$parentTree = (Api GET "/repos/$owner/$repo/git/commits/$parent" $null).tree.sha

# ---------- 2. Files to publish ----------
$nojekyll = Join-Path $root '.nojekyll'
if (-not (Test-Path $nojekyll)) { New-Item -ItemType File $nojekyll | Out-Null }

$files = @('index.html', 'README.md', '.gitignore', '.nojekyll', 'serve.ps1', 'deploy.ps1')
$files += Get-ChildItem (Join-Path $root 'assets') -Recurse -File |
  ForEach-Object { $_.FullName.Substring($root.Length + 1).Replace('\', '/') }

# ---------- 3. Upload ----------
$tree = @()
foreach ($f in $files) {
  $bytes = [IO.File]::ReadAllBytes((Join-Path $root $f))
  $blob = Api POST "/repos/$owner/$repo/git/blobs" @{ content = [Convert]::ToBase64String($bytes); encoding = 'base64' }
  $tree += @{ path = $f; mode = '100644'; type = 'blob'; sha = $blob.sha }
  Write-Host ("  {0,-40} {1,8:N0} KB" -f $f, ($bytes.Length / 1kb))
}
$newTree = Api POST "/repos/$owner/$repo/git/trees" @{ tree = $tree }

if ($newTree.sha -eq $parentTree) {
  Write-Host "No changes to publish."
} else {
  $commit = Api POST "/repos/$owner/$repo/git/commits" @{
    message = $Message; tree = $newTree.sha; parents = @($parent); author = $author; committer = $author
  }
  Api PATCH "/repos/$owner/$repo/git/refs/heads/$branch" @{ sha = $commit.sha } | Out-Null
  Write-Host "Committed $($commit.sha.Substring(0, 7)) to $branch ($($files.Count) files)."
}

# ---------- 4. GitHub Pages ----------
if (-not (Exists "/repos/$owner/$repo/pages")) {
  Api POST "/repos/$owner/$repo/pages" @{ source = @{ branch = $branch; path = '/' } } | Out-Null
  Write-Host "GitHub Pages enabled."
}
$pages = Api GET "/repos/$owner/$repo/pages" $null
Write-Host "Pages: $($pages.html_url)  status=$($pages.status)"
