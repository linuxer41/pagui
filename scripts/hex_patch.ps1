# hex_patch.ps1 - Parche binario a nivel HEX sin Python (equivale a HxD)
# Reemplaza 03/09/2026 -> 28/08/2026 manteniendo misma longitud (10 -> 10) sin reflow
# Para PDF comprimido (FlateDecode) primero descomprime a QDF con qpdf/mutool, luego parchea.
# Uso:
#   powershell -ExecutionPolicy Bypass -File scripts\hex_patch.ps1 -Input SIAT_9636_original.pdf -Output visor_out.pdf
#   powershell -ExecutionPolicy Bypass -File scripts\hex_patch.ps1 -Input SIAT_qdf.pdf -Output visor_out.pdf -Old "03/09/2026" -New "28/08/2026"
param(
  [string]$InFile = "SIAT_9636_original.pdf",
  [string]$OutFile = "visor_out.pdf",
  [string]$Old = "03/09/2026",
  [string]$New = "28/08/2026"
)
if ($Old.Length -ne $New.Length) { Write-Error "Longitudes distintas $($Old.Length) vs $($New.Length) - debe ser igual para parche in-place"; exit 1 }
if (-not (Test-Path $InFile)) { Write-Error "No existe $InFile"; exit 2 }

$oldB = [Text.Encoding]::ASCII.GetBytes($Old)
$newB = [Text.Encoding]::ASCII.GetBytes($New)
# hex sin <> y con <>
$oldHex = ($Old.ToCharArray() | ForEach-Object { "{0:X2}" -f [int]$_ }) -join ""
$newHex = ($New.ToCharArray() | ForEach-Object { "{0:X2}" -f [int]$_ }) -join ""
$oldHexB = [Text.Encoding]::ASCII.GetBytes($oldHex)
$newHexB = [Text.Encoding]::ASCII.GetBytes($newHex)
$oldHexLowB = [Text.Encoding]::ASCII.GetBytes($oldHex.ToLower())
$newHexLowB = [Text.Encoding]::ASCII.GetBytes($newHex.ToLower())

function Replace-Bytes([byte[]]$data, [byte[]]$search, [byte[]]$replace) {
  $count = 0
  for ($i=0; $i -le $data.Length - $search.Length; $i++) {
    $match = $true
    for ($j=0; $j -lt $search.Length; $j++) { if ($data[$i+$j] -ne $search[$j]) { $match=$false; break } }
    if ($match) {
      for ($j=0; $j -lt $replace.Length; $j++) { $data[$i+$j] = $replace[$j] }
      $count++
      $i += $search.Length -1
    }
  }
  return $count
}

$data = [IO.File]::ReadAllBytes($InFile)
$total = 0
$total += Replace-Bytes $data $oldB $newB
$total += Replace-Bytes $data $oldHexB $newHexB
$total += Replace-Bytes $data $oldHexLowB $newHexLowB
# con < >
$total += Replace-Bytes $data ([Text.Encoding]::ASCII.GetBytes("<$oldHex>")) ([Text.Encoding]::ASCII.GetBytes("<$newHex>"))
$total += Replace-Bytes $data ([Text.Encoding]::ASCII.GetBytes("<$($oldHex.ToLower())>")) ([Text.Encoding]::ASCII.GetBytes("<$($newHex.ToLower())>"))

if ($total -eq 0) {
  Write-Host "AVISO: 0 reemplazos en binario raw. El PDF esta comprimido (FlateDecode)." -ForegroundColor Yellow
  Write-Host "Solucion sin Python: descomprime a QDF primero con qpdf o mutool, luego parchea:" -ForegroundColor Yellow
  Write-Host "  qpdf --qdf --object-streams=disable $InFile SIAT_qdf.pdf" -ForegroundColor Cyan
  Write-Host "  powershell -File scripts\hex_patch.ps1 -InFile SIAT_qdf.pdf -OutFile visor_out.pdf" -ForegroundColor Cyan
  Write-Host "  qpdf SIAT_qdf.pdf visor_out.pdf   # recomprime" -ForegroundColor Cyan
} else {
  [IO.File]::WriteAllBytes($OutFile, $data)
  Write-Host "OK: $total reemplazo(s) '$Old' -> '$New' (hex level, sin editor)" -ForegroundColor Green
  Write-Host "Entrada: $InFile"
  Write-Host "Salida : $OutFile"
}
