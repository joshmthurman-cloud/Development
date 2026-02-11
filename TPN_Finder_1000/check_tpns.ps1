# TPN Status Checker - PowerShell Version
# No installation required - uses built-in Windows PowerShell

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "TPN Status Checker" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Get TPN length
$lengthInput = Read-Host "TPN length (10-12) [default: 10]"
if ([string]::IsNullOrWhiteSpace($lengthInput)) {
    $length = 10
} else {
    try {
        $length = [int]$lengthInput
        if ($length -lt 10 -or $length -gt 12) {
            Write-Host "Invalid length. Using 10." -ForegroundColor Yellow
            $length = 10
        }
    } catch {
        $length = 10
    }
}

# Get starting TPN
$startTpn = Read-Host "Starting TPN (leave empty to start from $('0' * $length))"
if ([string]::IsNullOrWhiteSpace($startTpn)) {
    $startTpn = '0' * $length
} elseif ($startTpn.Length -ne $length) {
    Write-Host "Invalid length. Starting from $('0' * $length)" -ForegroundColor Yellow
    $startTpn = '0' * $length
}
$startTpn = $startTpn.ToUpper()

# Get count
$countInput = Read-Host "Number of TPNs to check (leave empty for continuous)"
$count = $null
if (-not [string]::IsNullOrWhiteSpace($countInput)) {
    try {
        $count = [int]$countInput
    } catch {
        $count = $null
    }
}

# Get delay
$delayInput = Read-Host "Delay between checks in seconds [default: 0.1]"
$delay = 0.1
if (-not [string]::IsNullOrWhiteSpace($delayInput)) {
    try {
        $delay = [double]$delayInput
    } catch {
        $delay = 0.1
    }
}

$outputFile = "tpn_results.txt"
$onlineFile = "online_tpns.txt"

Write-Host ""
Write-Host "Starting check..." -ForegroundColor Green
Write-Host "Length: $length"
Write-Host "Start TPN: $startTpn"
Write-Host "Count: $(if ($count) { $count } else { 'Continuous' })"
Write-Host "Delay: $delay seconds"
Write-Host "Output file: $outputFile"
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Initialize output files
$header = @"
TPN Status Check Results
Started: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
TPN Length: $length
Start TPN: $startTpn
============================================================

TPN             Status              
------------------------------------------------------------
"@
$header | Out-File -FilePath $outputFile -Encoding UTF8

# Function to increment alphanumeric string
function Increment-Tpn {
    param([string]$tpn)
    
    $chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    $tpnArray = $tpn.ToCharArray()
    $carry = $true
    $i = $tpnArray.Length - 1
    
    while ($carry -and $i -ge 0) {
        $charIndex = $chars.IndexOf($tpnArray[$i])
        if ($charIndex -lt $chars.Length - 1) {
            $tpnArray[$i] = $chars[$charIndex + 1]
            $carry = $false
        } else {
            $tpnArray[$i] = $chars[0]
            $i--
        }
    }
    
    if ($carry) {
        return $null  # Reached the end
    }
    
    return -join $tpnArray
}

# Function to check TPN status
function Check-TpnStatus {
    param([string]$tpn)
    
    $url = "https://spinpos.net/spin/GetTerminalStatus?tpn=$tpn"
    
    try {
        $response = Invoke-WebRequest -Uri $url -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
        return $response.Content.Trim()
    } catch {
        return "ERROR: $($_.Exception.Message)"
    }
}

# Main checking loop
$currentTpn = $startTpn
$checked = 0
$onlineCount = 0

try {
    while ($true) {
        if ($count -and $checked -ge $count) {
            break
        }
        
        $status = Check-TpnStatus -tpn $currentTpn
        $checked++
        
        # Display in console
        $statusDisplay = if ($status.Length -gt 50) { $status.Substring(0, 50) } else { $status }
        Write-Host "[$checked] $($currentTpn.PadRight(15)) $statusDisplay"
        
        # Save to results file
        "$($currentTpn.PadRight(15)) $status" | Out-File -FilePath $outputFile -Append -Encoding UTF8
        
        # Check if online
        if ($status -eq "Online") {
            $onlineCount++
            Write-Host "  *** ONLINE FOUND! Total: $onlineCount ***" -ForegroundColor Green
            # Save to online file
            $currentTpn | Out-File -FilePath $onlineFile -Append -Encoding UTF8
        }
        
        # Increment to next TPN
        $nextTpn = Increment-Tpn -tpn $currentTpn
        if ($null -eq $nextTpn) {
            Write-Host "Reached end of TPN range." -ForegroundColor Yellow
            break
        }
        $currentTpn = $nextTpn
        
        if ($delay -gt 0) {
            Start-Sleep -Seconds $delay
        }
    }
} catch {
    Write-Host ""
    Write-Host "Stopped by user or error." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Check complete!" -ForegroundColor Green
Write-Host "Total checked: $checked"
Write-Host "Online found: $onlineCount"
Write-Host "Results saved to: $outputFile"
if ($onlineCount -gt 0) {
    Write-Host "Online TPNs also saved to: $onlineFile" -ForegroundColor Green
}
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
