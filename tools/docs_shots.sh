#!/usr/bin/env bash
# Rebuild the captures used by README.md and docs/REPORT.md from the audit run.
#   node tools/audit.js && ./tools/docs_shots.sh
# Everything is shot in the same browser session that gates the regressions, so the
# documentation can never show a state the tests have not just verified.
set -euo pipefail
cd "$(dirname "$0")/.."
src=tools/shots
dst=docs/screenshots
mkdir -p "$dst"
copy() { # copy <source png> <destination jpg> [width]
  magick "$src/$1" -resize "${3:-1440}x" -quality 76 "$dst/$2"
  printf '  %-22s <- %s\n' "$2" "$1"
}
copy 01-hero-light.png     hero-light.jpg
copy 02-hero-dark.png      hero-dark.jpg
copy 03-events.png         events-dark.jpg
copy 04-register.png       register.jpg
copy 05-register-errors.png register-errors.jpg
copy 06-contact.png        contact.jpg
copy 07-gallery.png        gallery.jpg
copy 08-lightbox.png       lightbox.jpg
copy 09-about.png          about.jpg
copy 10-mobile-menu.png    mobile-hero.jpg 780
copy 11-mobile-events.png  mobile-events.jpg 780
copy 12-tablet.png         tablet.jpg 900
echo "docs/screenshots: $(ls "$dst" | wc -l) files, $(du -sh "$dst" | cut -f1)"
