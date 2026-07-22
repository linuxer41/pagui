@echo off
setlocal enabledelayedexpansion

set TAURI_DIR=%~dp0src-tauri
set DIST_DIR=%~dp0dist

set KEYSTORE=pagui.jks
set KEYPASS=pagui
set ALIAS=pagui

:: ===== ANDROID =====
echo ===== [1/2] Compilando Android =====
cd /d "%TAURI_DIR%"
bun tauri android build
if !errorlevel! neq 0 (
    echo ERROR: Fallo compilacion Android
    exit /b 1
)

set BUILD_DIR=%TAURI_DIR%\gen\android\app\build\outputs
set UNSIGNED_APK=%BUILD_DIR%\apk\universal\release\app-universal-release-unsigned.apk
set ALIGNED_APK=%BUILD_DIR%\apk\universal\release\app-universal-release-aligned.apk
set SIGNED_APK=%BUILD_DIR%\apk\universal\release\app-universal-release.apk
set UNSIGNED_AAB=%BUILD_DIR%\bundle\universalRelease\app-universal-release.aab

set ANDROID_DIST=%DIST_DIR%\android
if not exist "%ANDROID_DIST%" mkdir "%ANDROID_DIST%"

echo.
echo === Firmando AAB ===
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 -keystore "%KEYSTORE%" -storepass %KEYPASS% -keypass %KEYPASS% "%UNSIGNED_AAB%" %ALIAS%
if !errorlevel! neq 0 (
    echo ERROR: Fallo al firmar AAB
    exit /b 1
)
move /y "%UNSIGNED_AAB%" "%ANDROID_DIST%\credinza.aab" >nul

echo.
echo === Alineando APK ===
zipalign -p -f -v 4 "%UNSIGNED_APK%" "%ALIGNED_APK%"
if !errorlevel! neq 0 (
    echo ERROR: Fallo al alinear APK
    exit /b 1
)

echo.
echo === Firmando APK ===
call apksigner sign --ks "%KEYSTORE%" --ks-pass pass:%KEYPASS% --ks-key-alias %ALIAS% --out "%SIGNED_APK%" "%ALIGNED_APK%"
if !errorlevel! neq 0 (
    echo ERROR: Fallo al firmar APK
    exit /b 1
)

echo.
echo === Verificando APK ===
call apksigner verify "%SIGNED_APK%"
if !errorlevel! neq 0 (
    echo ERROR: Verificacion fallo
    exit /b 1
)

move /y "%SIGNED_APK%" "%ANDROID_DIST%\credinza.apk" >nul
del "%ALIGNED_APK%" 2>nul

echo Android -> %ANDROID_DIST%

:: ===== WINDOWS =====
echo.
echo ===== [2/2] Compilando Windows =====
cd /d "%TAURI_DIR%"
bun tauri build
if !errorlevel! neq 0 (
    echo ERROR: Fallo compilacion Windows
    exit /b 1
)

set WIN_DIST=%DIST_DIR%\windows
if not exist "%WIN_DIST%" mkdir "%WIN_DIST%"

set RELEASE_DIR=%TAURI_DIR%\target\release

if exist "%RELEASE_DIR%\app.exe" move /y "%RELEASE_DIR%\app.exe" "%WIN_DIST%\credinza.exe" >nul
if exist "%RELEASE_DIR%\app.pdb" move /y "%RELEASE_DIR%\app.pdb" "%WIN_DIST%\credinza.pdb" >nul

set NSIS_DIR=%RELEASE_DIR%\bundle\nsis
if exist "%NSIS_DIR%" (
    for %%f in ("%NSIS_DIR%\*.exe") do move /y "%%f" "%WIN_DIST%" >nul
)

set MSI_DIR=%RELEASE_DIR%\bundle\msi
if exist "%MSI_DIR%" (
    for %%f in ("%MSI_DIR%\*.msi") do move /y "%%f" "%WIN_DIST%" >nul
)

echo Windows -> %WIN_DIST%

:: ===== DONE =====
echo.
echo ===== BUILD COMPLETADO =====
echo Android: %ANDROID_DIST%
echo Windows: %WIN_DIST%
