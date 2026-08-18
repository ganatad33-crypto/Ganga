# RTL & Hebrew-Specific Design Rules

Read this whenever the site/app content is Hebrew, Arabic, or another right-to-left language. RTL is not "LTR with text reversed" — the whole spatial logic of the page mirrors, and getting only the text direction right while missing the rest is what makes RTL sites feel subtly "off" even to people who can't name why.

## What mirrors (almost everything spatial)

- **Reading flow**: right → left. The logical "start" of the page is the right edge, not the left.
- **Navigation**: primary nav / logo typically sits top-right (or the whole nav bar order reverses); a hamburger menu that opens from the left in LTR opens from the right in RTL.
- **Back/forward affordances**: a "back" arrow points right in RTL (not left) — it should point toward where the user came from, which is now the right side conceptually reversed. Chevrons/arrows in breadcrumbs, carousels, and "next/previous" controls all flip.
- **Icons with directionality**: arrows, "send" icons, progress indicators, pagination — all mirror. Icons with no inherent direction (search magnifying glass, trash can, gear/settings) do *not* need to mirror.
- **Alignment**: body text right-aligned, not left or centered. Numbers within Hebrew text still read LTR (this is a known bidi quirk — don't fight it, browsers/CSS handle basic bidi automatically via `dir="rtl"`, but double-check compound strings mixing Hebrew and numbers/Latin render correctly).
- **Forms**: labels sit to the right of their fields (or above); checkboxes/radio buttons typically go on the right of their label text.
- **Tables**: first column (sort priority) usually the rightmost column, not leftmost.
- **Sliders/carousels**: "next" swipes/drags right-to-left, matching reading direction.
- **Progress bars, timelines**: fill/progress direction reverses — flows right-to-left.

## What does NOT mirror

- Numbers and numerals (Hebrew uses standard Western Arabic numerals, always LTR internally).
- Logos/brand marks (unless the brand identity itself is directional, e.g. an arrow in the logo).
- Media controls that map to real-world physical conventions in some contexts (test case-by-case — video scrubbers usually do mirror; play/pause icons don't need to).
- Phone numbers, emails, URLs, code snippets — always LTR regardless of surrounding RTL text.

## Technical implementation basics

- Set `dir="rtl"` on `<html>` (or the relevant container) rather than manually mirroring every element with CSS — this lets the browser handle bidi text runs, form control mirroring, and default alignment correctly.
- Prefer CSS logical properties (`margin-inline-start`, `padding-inline-end`, `text-align: start`) over physical ones (`margin-left`, `text-align: left`) so the layout mirrors automatically instead of needing duplicate RTL-specific overrides.
- Test any icon font / SVG icon set for mirror-sensitivity — some icon libraries ship separate RTL variants for directional icons.
- Mixed-direction strings (a Hebrew sentence containing an English brand name or a phone number) are the most common real bug source — always test with actual mixed content, not lorem-ipsum-only Hebrew.

## Typography notes for Hebrew specifically

- Hebrew has no letter-case (no bold-via-caps trick, no small-caps) — rely on font-weight and size for emphasis, not case transforms.
- Hebrew glyphs are generally optically heavier/denser than Latin at the same pixel size — Hebrew body text often reads more comfortably very slightly larger than the Latin-text equivalent (test, don't assume the same px value looks equally light).
- Choose a typeface with genuine Hebrew glyph support and multiple weights designed for Hebrew (not just a Latin font with a bolted-on Hebrew fallback) — line spacing and letter shapes optimized for Latin often look cramped or uneven in Hebrew.
- Line-height often needs to be slightly more generous for Hebrew than the equivalent Latin text, especially with niqqud (vowel points) present, which add vertical extent.

## Quick pre-ship checklist for a Hebrew/RTL site

- [ ] `dir="rtl"` set at the document or container level
- [ ] Nav/logo placement mirrored
- [ ] All directional icons (arrows, chevrons, back buttons) mirrored
- [ ] Body text right-aligned
- [ ] Numbers, phone numbers, emails, code render LTR inline without breaking
- [ ] Forms: label/input order and checkbox position mirrored
- [ ] Tested with real mixed Hebrew+Latin+number content, not placeholder text only
