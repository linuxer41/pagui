@echo off
setlocal enabledelayedexpansion

set TAURI_DIR=%~dp0src-tauri
set DIST_DIR=%~dp0dist

set KEYSTORE=pagui.jks
set KEYPASS=paguiapp
set ALIAS=pagui

echo ===== Firmando solo Android =====

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
copy /y "%UNSIGNED_AAB%" "%ANDROID_DIST%\pagui.aab" >nul

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

copy /y "%SIGNED_APK%" "%ANDROID_DIST%\pagui.apk" >nul
del "%ALIGNED_APK%" 2>nul

echo.
echo ===== FIRMADO COMPLETADO =====
echo APK: %ANDROID_DIST%\pagui.apk
echo AAB: %ANDROID_DIST%\pagui.aab
