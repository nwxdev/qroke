# Encaminha somente a porta do QRoke na interface privada escolhida.
# Execute no PowerShell como administrador. Use -Remove para desfazer.
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$ListenAddress,
  [ValidateRange(1024, 65535)][int]$Port = 3100,
  [string]$Distribution = 'Ubuntu',
  [switch]$Remove
)
$ErrorActionPreference = 'Stop'
$qrokeIdentity = [Security.Principal.WindowsIdentity]::GetCurrent()
$qrokePrincipal = New-Object Security.Principal.WindowsPrincipal($qrokeIdentity)
if (-not $qrokePrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  throw 'Abra o PowerShell como administrador para configurar a porta da LAN.'
}
$qrokeIp = $null
if (-not [Net.IPAddress]::TryParse($ListenAddress, [ref]$qrokeIp) -or
    $qrokeIp.AddressFamily -ne [Net.Sockets.AddressFamily]::InterNetwork -or
    $ListenAddress -notmatch '^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)') {
  throw 'Informe o IPv4 privado da interface Wi-Fi/Ethernet, nunca 0.0.0.0 ou o IP publico.'
}
$qrokeRuleName = "QRoke-LAN-$ListenAddress-$Port"
$qrokeRule = Get-NetFirewallRule -Name $qrokeRuleName -ErrorAction SilentlyContinue
if ($Remove) {
  if (-not $qrokeRule) { throw 'Regra QRoke ausente; nenhuma configuracao de rede foi removida.' }
  & netsh interface portproxy delete v4tov4 "listenport=$Port" "listenaddress=$ListenAddress"
  if ($LASTEXITCODE -ne 0) { throw 'Falha ao remover o encaminhamento.' }
  Remove-NetFirewallRule -Name $qrokeRuleName
  Write-Output 'Encaminhamento e regra QRoke removidos.'
  exit 0
}
$qrokeInterface = Get-NetIPAddress -AddressFamily IPv4 -IPAddress $ListenAddress
$qrokeProfile = Get-NetConnectionProfile -InterfaceIndex $qrokeInterface.InterfaceIndex
if ($qrokeProfile.NetworkCategory -ne 'Private') {
  throw 'A interface precisa ser uma rede Privada confiavel. O script nao altera o perfil da rede.'
}
$qrokeMappings = Get-ItemProperty -LiteralPath 'HKLM:\SYSTEM\CurrentControlSet\Services\PortProxy\v4tov4\tcp' -ErrorAction SilentlyContinue
$qrokeExistingMap = if ($qrokeMappings) { $qrokeMappings.PSObject.Properties["$ListenAddress/$Port"] } else { $null }
if ($qrokeExistingMap -and -not $qrokeRule) {
  throw 'Ja existe um encaminhamento nessa porta/IP sem identificacao QRoke. Nenhuma regra foi alterada.'
}
$qrokeListeners = @(Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue |
  Where-Object { $_.LocalAddress -in @($ListenAddress, '0.0.0.0', '::') })
if ($qrokeListeners.Count -and -not $qrokeRule) {
  throw 'Ja existe um servico nessa porta da LAN. Nenhuma regra de outro aplicativo foi alterada.'
}
$qrokeWslAddresses = & wsl.exe -d $Distribution -- hostname -I
if ($LASTEXITCODE -ne 0) { throw 'Nao foi possivel consultar o WSL.' }
$qrokeWslIp = (($qrokeWslAddresses -join ' ').Trim() -split '\s+' |
  Where-Object { $_ -match '^\d+\.\d+\.\d+\.\d+$' } | Select-Object -First 1)
if (-not $qrokeWslIp) { throw 'IPv4 do WSL nao encontrado.' }
if (-not (Test-NetConnection -ComputerName $qrokeWslIp -Port $Port -InformationLevel Quiet -WarningAction SilentlyContinue)) {
  throw "O servidor precisa estar ativo em 0.0.0.0:$Port no WSL antes desta configuracao."
}
& netsh interface portproxy add v4tov4 "listenport=$Port" "listenaddress=$ListenAddress" "connectport=$Port" "connectaddress=$qrokeWslIp"
if ($LASTEXITCODE -ne 0) { throw 'Falha ao criar o encaminhamento.' }
try {
  if ($qrokeRule) {
    Set-NetFirewallRule -Name $qrokeRuleName -Enabled True -Profile Private -Action Allow -Direction Inbound
  } else {
    $qrokeFirewall = @{
      Name = $qrokeRuleName; DisplayName = "QRoke LAN $Port"; Direction = 'Inbound'; Action = 'Allow'
      Enabled = 'True'; Profile = 'Private'; Protocol = 'TCP'; LocalPort = $Port
      LocalAddress = $ListenAddress; RemoteAddress = 'LocalSubnet'; InterfaceAlias = $qrokeInterface.InterfaceAlias
    }
    New-NetFirewallRule @qrokeFirewall | Out-Null
  }
} catch {
  if (-not $qrokeRule) {
    & netsh interface portproxy delete v4tov4 "listenport=$Port" "listenaddress=$ListenAddress" | Out-Null
  }
  throw
}
Write-Output ("QRoke: http://{0}:{1}/ -> {2}:{1}" -f $ListenAddress, $Port, $qrokeWslIp)
Write-Output 'Acesso restrito a rede privada/local. Repita se o IP do Windows ou WSL mudar.'
