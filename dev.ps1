$root = (Get-Item $PSScriptRoot).FullName
$backendDir = Join-Path $root 'backend'
$frontendDir = Join-Path $root 'frontend'

Start-Process wt -ArgumentList @(
	'-d', $backendDir, 'cmd', '/k', 'bun run dev',
	';',
	'split-pane', '-H', '-d', $frontendDir, 'cmd', '/k', 'npm run dev',
	';',
	'split-pane', '-H', '-d', $root, 'powershell', '-NoExit'
)
