"""Migrate teal references to primary (orange) in Svelte/CSS files."""
import re
from pathlib import Path

SRC = Path(r"D:\work\pagui\frontend\src")

EXCLUDE_DIRS = {"node_modules", ".svelte-kit", "build", ".git"}
# Skip files already manually migrated
EXCLUDE_FILES = {
    "app.css",
    "PillButton.svelte", "OutlineButton.svelte", "GhostButton.svelte", "IconButton.svelte",
    "TextField.svelte", "PasswordField.svelte", "AmountField.svelte", "PhoneField.svelte", "EmailField.svelte",
    "SearchField.svelte",
    "Section.svelte", "Toast.svelte", "BottomSheet.svelte", "EmptyState.svelte", "Checkbox.svelte",
    "PageHeader.svelte", "AppHeader.svelte", "AppShell.svelte",
}

REPLACEMENTS = [
    # Solid teal → primary (bg, color, border)
    (r'rgba\(\s*var\(--teal-rgb\)\s*,\s*1\s*\)', 'var(--primary)'),
    # Tints → primary-rgb tints
    (r'rgba\(\s*var\(--teal-rgb\)\s*,\s*(\d+(?:\.\d+)?)\s*\)', r'rgba(var(--primary-rgb), \1)'),
    # Hardcoded dark teal in gradient (profile/editar-perfil)
    (r'rgba\(\s*9\s*,\s*103\s*,\s*95\s*,\s*1\s*\)', '#CC6A00'),
]

def migrate_file(path: Path) -> bool:
    content = path.read_text(encoding='utf-8')
    new_content = content
    for pattern, replacement in REPLACEMENTS:
        new_content = re.sub(pattern, replacement, new_content)
    if new_content != content:
        path.write_text(new_content, encoding='utf-8')
        return True
    return False

def main():
    changed = 0
    total = 0
    for ext in ('*.svelte', '*.css'):
        for path in SRC.rglob(ext):
            if any(p in path.parts for p in EXCLUDE_DIRS):
                continue
            if path.name in EXCLUDE_FILES:
                continue
            total += 1
            if migrate_file(path):
                print(f"  [OK] {path.relative_to(SRC.parent.parent)}")
                changed += 1
    print(f"\nDone. {changed}/{total} files changed.")

if __name__ == '__main__':
    main()
