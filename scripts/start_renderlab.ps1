[CmdletBinding()]
param(
    [ValidateSet("modal", "local")]
    [string]$Provider = "modal",
    [string]$ComfyUrl = "http://127.0.0.1:8100",
    [string]$RenderLabUrl = "http://127.0.0.1:4185",
    [string]$StorageRoot = "analysis_outputs/renderlab_storage",
    [switch]$OpenBrowser
)

$ErrorActionPreference = "Stop"
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$runtimeRoot = Join-Path $projectRoot "analysis_outputs/renderlab_runtime"
New-Item -ItemType Directory -Path $runtimeRoot -Force | Out-Null

function Test-Endpoint {
    param([string]$Url)
    try {
        Invoke-WebRequest -Uri $Url -Method Get -TimeoutSec 3 -UseBasicParsing | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

if ($Provider -eq "local" -and -not (Test-Endpoint -Url "$ComfyUrl/system_stats")) {
    throw "ComfyUI is not reachable at $ComfyUrl. Start the local ComfyUI workspace first, then run this launcher again."
}

$apiHealth = "http://127.0.0.1:8685/studio/health"
if (-not (Test-Endpoint -Url $apiHealth)) {
    $apiLog = Join-Path $runtimeRoot "renderlab-api.log"
    $apiErrorLog = Join-Path $runtimeRoot "renderlab-api.error.log"
    $apiArgs = @("-m", "uvicorn", "apps.studio_api.app:app", "--host", "127.0.0.1", "--port", "8685")
    $apiEnv = @{
        RENDERLAB_STORAGE_ROOT = $StorageRoot
        RENDERLAB_WORKER_ENABLED = "1"
        RENDERLAB_DB_MODE = "test_harness"
        RENDERLAB_COMFYUI_PROVIDER = $Provider
        RENDERLAB_COMFYUI_URL = $ComfyUrl
        RENDERLAB_COMFYUI_TIMEOUT_SECONDS = "1800"
        RENDERLAB_MODAL_TIMEOUT_SECONDS = "1800"
        RENDERLAB_MODAL_ALLOW_CLI_PROFILE = "1"
    }
    foreach ($entry in $apiEnv.GetEnumerator()) {
        [Environment]::SetEnvironmentVariable($entry.Key, $entry.Value, "Process")
    }
    $apiProcess = Start-Process -FilePath "python" -ArgumentList $apiArgs -WorkingDirectory $projectRoot -RedirectStandardOutput $apiLog -RedirectStandardError $apiErrorLog -WindowStyle Hidden -PassThru
    $apiProcess.Id | Set-Content -LiteralPath (Join-Path $runtimeRoot "renderlab-api.pid")
}

$renderLabRoot = $projectRoot
if (-not (Test-Endpoint -Url $RenderLabUrl)) {
    $webLog = Join-Path $runtimeRoot "renderlab-web.log"
    $webErrorLog = Join-Path $runtimeRoot "renderlab-web.error.log"
    $webProcess = Start-Process -FilePath "npm.cmd" -ArgumentList @("run", "dev", "--", "--host", "127.0.0.1") -WorkingDirectory $renderLabRoot -RedirectStandardOutput $webLog -RedirectStandardError $webErrorLog -WindowStyle Hidden -PassThru
    $webProcess.Id | Set-Content -LiteralPath (Join-Path $runtimeRoot "renderlab-web.pid")
}

$deadline = (Get-Date).AddSeconds(30)
while ((Get-Date) -lt $deadline) {
    if ((Test-Endpoint -Url $apiHealth) -and (Test-Endpoint -Url $RenderLabUrl)) {
        Write-Host "RenderLab is ready at $RenderLabUrl"
        Write-Host "Runtime: $Provider"
        if ($Provider -eq "local") { Write-Host "ComfyUI: $ComfyUrl" }
        Write-Host "Runtime logs: $runtimeRoot"
        if ($OpenBrowser) {
            Start-Process $RenderLabUrl
        }
        exit 0
    }
    Start-Sleep -Milliseconds 500
}

throw "RenderLab did not become ready within 30 seconds. Check the logs in $runtimeRoot."
