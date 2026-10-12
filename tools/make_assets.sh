#!/usr/bin/env bash
# ---------------------------------------------------------------------
# Crops the rendered scene images into the two aspect ratios the site
# uses and grades them to the theme.  Everything is derived from the
# originals in assets/src — re-run this after swapping a source image.
#
#   ./tools/make_assets.sh
#
#   card art   1120x746  (16:10.7 — the ratio of .card__art)
#   gallery    920x1150  (4:5   — the ratio of .frame)
#
# The gallery keeps its full colour in the file itself; the "archive
# duotone at rest, colour on hover" look is done with a CSS filter in
# styles.css so no duplicate copies of each photo are shipped.
# ---------------------------------------------------------------------
set -euo pipefail
cd "$(dirname "$0")/.."
SRC=assets/src
OUT=assets
Q=74

# --- event tiles (1120x746) ---
for pair in "e-hackmatrix.jpg:t-hackmatrix.jpg:center" \
            "e-workshop.jpg:t-workshop.jpg:center" \
            "e-codesprint.jpg:t-codesprint.jpg:center" \
            "e-robotech.jpg:t-robotech.jpg:center" \
            "e-cultural.jpg:t-cultural.jpg:center" \
            "e-expo.jpg:t-expo.jpg:center" \
            "e-cyber.jpg:t-cyberquest.jpg:north"; do
  IFS=: read -r in out grav <<< "$pair"
  magick "$SRC/$in" -resize 1120x746^ -gravity "$grav" -extent 1120x746 \
    -colorspace sRGB -modulate 102,88 -sigmoidal-contrast 3x46% \
    -strip -quality $Q -interlace Plane "$OUT/$out"
  echo "  card    $OUT/$out"
done

# --- gallery frames (920x1150) — one exclusive scene per frame, each cropped on
#     a different region so the archive never repeats the framing of its card ---
gallery() { # src out gravity
  magick "$SRC/$1" -resize 920x1150^ -gravity "$3" -extent 920x1150 \
    -colorspace sRGB -modulate 100,92 -sigmoidal-contrast 4x44% \
    -strip -quality 70 -interlace Plane "$OUT/$2"
  echo "  gallery $OUT/$2"
}
gallery "g-buildhour.jpg"   "g-01.jpg" center   # HackMatrix '25, final build hour
gallery "g-innovacion.jpg"  "g-02.jpg" north    # Innovacion, opening night on stage
gallery "g-dllab.jpg"       "g-03.jpg" center   # Deep Learning Lab, hands-on
gallery "g-expo.jpg"        "g-04.jpg" center   # Project Expo, bench-side judging
gallery "g-robo.jpg"        "g-05.jpg" south    # RoboTech, line-follower run
gallery "g-lecture.jpg"     "g-06.jpg" center   # Guest lecture, seminar hall

# --- social preview ---
magick "$SRC/e-hackmatrix.jpg" -resize 1200x628^ -gravity center -extent 1200x628 \
  -colorspace sRGB -modulate 100,80 -sigmoidal-contrast 4x42% \
  -strip -quality 72 -interlace Plane "$OUT/og-cover.jpg"
echo "  og      $OUT/og-cover.jpg"
