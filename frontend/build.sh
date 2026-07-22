#!/usr/bin/env bash
set -euo pipefail

TAURI_DIR="$(cd "$(dirname "$0")" && pwd)/src-tauri"
DIST_DIR="$(cd "$(dirname "$0")" && pwd)/dist"

KEYSTORE="$TAURI_DIR/credinza.jks"
KEYPASS="credinza"
ALIAS="credinza"

# ===== ANDROID =====
echo "===== [1/2] Compilando Android ====="
cd "$TAURI_DIR"
bun tauri android build

BUILD_DIR="$TAURI_DIR/gen/android/app/build/outputs"
UNSIGNED_APK="$BUILD_DIR/apk/universal/release/app-universal-release-unsigned.apk"
ALIGNED_APK="$BUILD_DIR/apk/universal/release/app-universal-release-aligned.apk"
SIGNED_APK="$BUILD_DIR/apk/universal/release/app-universal-release.apk"
UNSIGNED_AAB="$BUILD_DIR/bundle/universalRelease/app-universal-release.aab"

ANDROID_DIST="$DIST_DIR/android"
mkdir -p "$ANDROID_DIST"

echo ""
echo "=== Firmando AAB ==="
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 \
    -keystore "$KEYSTORE" -storepass "$KEYPASS" -keypass "$KEYPASS" \
    "$UNSIGNED_AAB" "$ALIAS"
mv "$UNSIGNED_AAB" "$ANDROID_DIST/credinza.aab"

echo ""
echo "=== Alineando APK ==="
zipalign -p -f -v 4 "$UNSIGNED_APK" "$ALIGNED_APK"

echo ""
echo "=== Firmando APK ==="
apksigner sign \
    --ks "$KEYSTORE" --ks-pass "pass:$KEYPASS" --ks-key-alias "$ALIAS" \
    --out "$SIGNED_APK" "$ALIGNED_APK"

echo ""
echo "=== Verificando APK ==="
apksigner verify "$SIGNED_APK"

mv "$SIGNED_APK" "$ANDROID_DIST/credinza.apk"
rm -f "$ALIGNED_APK"

echo "Android -> $ANDROID_DIST"

# ===== DESKTOP =====
echo ""
echo "===== [2/2] Compilando escritorio ====="
cd "$TAURI_DIR"
bun tauri build

DESKTOP_DIST="$DIST_DIR/$(uname | tr '[:upper:]' '[:lower:]')"
mkdir -p "$DESKTOP_DIST"

RELEASE_DIR="$TAURI_DIR/target/release"

UNAME_S="$(uname -s)"

if [ "$UNAME_S" = "Linux" ]; then
    # AppImage
    APPIMAGE_DIR="$RELEASE_DIR/bundle/appimage"
    if [ -d "$APPIMAGE_DIR" ]; then
        for f in "$APPIMAGE_DIR"/*.AppImage; do
            [ -e "$f" ] && mv "$f" "$DESKTOP_DIST/"
        done
    fi
    # .deb
    DEB_DIR="$RELEASE_DIR/bundle/deb"
    if [ -d "$DEB_DIR" ]; then
        for f in "$DEB_DIR"/*.deb; do
            [ -e "$f" ] && mv "$f" "$DESKTOP_DIST/"
        done
    fi
    # Binary
    if [ -f "$RELEASE_DIR/app" ]; then
        mv "$RELEASE_DIR/app" "$DESKTOP_DIST/credinza"
    fi

elif [ "$UNAME_S" = "Darwin" ]; then
    # .dmg
    DMG_DIR="$RELEASE_DIR/bundle/dmg"
    if [ -d "$DMG_DIR" ]; then
        for f in "$DMG_DIR"/*.dmg; do
            [ -e "$f" ] && mv "$f" "$DESKTOP_DIST/"
        done
    fi
    # .app (as .zip)
    if [ -d "$RELEASE_DIR/bundle/macos" ]; then
        for f in "$RELEASE_DIR/bundle/macos"/*.app; do
            [ -e "$f" ] && mv "$f" "$DESKTOP_DIST/"
        done
    fi
    # Binary
    if [ -f "$RELEASE_DIR/app" ]; then
        mv "$RELEASE_DIR/app" "$DESKTOP_DIST/credinza"
    fi
fi

echo "Escritorio -> $DESKTOP_DIST"

# ===== DONE =====
echo ""
echo "===== BUILD COMPLETADO ====="
echo "Android: $ANDROID_DIST"
echo "Desktop: $DESKTOP_DIST"
