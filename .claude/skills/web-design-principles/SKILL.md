---
name: web-design-principles
description: Practical, systematic web and UI design principles distilled from Refactoring UI (Adam Wathan & Steve Schoger), the Laws of UX (Jakob Nielsen and others), and WCAG accessibility guidelines. Use this skill whenever building, redesigning, or reviewing a website, landing page, or UI — even if the user just says "make this look better," "improve the design," "this looks generic," or asks for a new site/page/component, without explicitly asking for "design principles." Also use when reviewing an existing site's visual quality, choosing colors/type/spacing, or when the user shares a screenshot or URL and asks for design feedback. Includes a dedicated RTL/Hebrew section — trigger that section automatically whenever the content or target audience is Hebrew, Arabic, or otherwise right-to-left.
---

# Web Design Principles

A practical, opinionated toolkit for making interfaces look professional — for developers and non-designers, not abstract art theory. The core idea across all of it: **good design is mostly systems and constraints, not artistic talent.** Pick fixed scales in advance (spacing, type, color, shadows) and choose from them — never invent one-off values mid-build.

Read the relevant reference file(s) below before generating design output. Don't try to hold everything in this file alone — go deeper as needed:

- `references/visual-system.md` — spacing/type/color scales, hierarchy, contrast (Refactoring UI)
- `references/ux-laws.md` — the psychology laws that predict whether a layout will feel intuitive
- `references/rtl-hebrew.md` — RTL-specific rules; read this whenever the site is Hebrew/Arabic
- `references/accessibility.md` — contrast ratios, touch targets, screen-reader basics

## The workflow

1. **Design in grayscale first.** Before touching color, get spacing, contrast, and hierarchy right using only black/white/gray. Color is the last 10%, not the first. If a design only works because of color, the underlying structure is broken.
2. **Start with too much whitespace, then remove some.** Cramped interfaces feel cheap; generous spacing feels premium. It's easier to tighten a spacious layout than to fix a dense one.
3. **Design one section in detail, not the whole page at low fidelity.** Pick the hero, nail it, move to the next section. A page built evenly-mediocre everywhere looks worse than 3 great sections and 2 unfinished ones.
4. **Systematize before building**: pick your spacing scale, type scale, and 1-2 color palettes (with 5-9 shades each) before writing a single line of layout code. When mid-build you need a value, you're choosing from the list, never inventing a new one (no "let's use 20px because 16 felt small and 24 felt big").
5. **Establish hierarchy with size + weight + color together, not position alone.** The single most common beginner mistake is a page where everything is roughly the same visual weight — nothing tells the eye where to look first.
6. **Check the specific UX law that applies to the component you're building** (nav → Jakob's Law, choice screens → Hick's Law, forms → Miller's Law, tap targets → Fitts's Law) — see `references/ux-laws.md`.
7. **If the audience is Hebrew/Arabic, read `references/rtl-hebrew.md` before laying anything out** — mirroring isn't optional polish, it's correctness.
8. **Run the accessibility checklist last** — contrast ratios, focus states, tap target sizes. See `references/accessibility.md`.

## Fast scoring rubric (use for design review / "improve this" requests)

When reviewing an existing design or auditing your own output, score 0-10 on each, and always name the single highest-leverage fix first (usually spacing/hierarchy, not color or icons):

1. **Hierarchy** — is it obvious in 2 seconds what matters most on this screen?
2. **Spacing consistency** — does everything look like it came from one spacing scale, or are there ad-hoc gaps?
3. **Contrast** — do primary actions pop and everything else recede appropriately?
4. **Alignment** — do edges line up into clean columns, nothing drifting by a few px?
5. **Color restraint** — is there one dominant color doing the work, or is it fighting itself?
6. **Type scale discipline** — how many distinct font sizes are on screen? (more than 4-5 unrelated sizes = undisciplined)
7. **Accessibility** — does text meet contrast minimums, are tap targets ≥44px, is focus visible?

Fix in priority order: hierarchy/spacing → contrast → alignment → color → decoration (shadows/icons/animation). Decoration first is the most common wasted effort — it can't fix a structurally weak layout.

## Common failure patterns to flag

- Everything the same font-size/weight (no hierarchy)
- More than one accent color competing for attention
- Text touching the edge of its container (no internal padding)
- Buttons/links with borders/backgrounds that are barely different from the background (low-contrast secondary actions done wrong — should be *lower emphasis*, not *illegible*)
- A nav bar or form with 8+ equally-weighted items (violates Hick's/Miller's law — group or trim)
- Pure black text on pure white (too harsh — use a very dark gray, e.g. #1a1a1a, not #000)
- Centered body paragraphs (hurts readability — left-align, or right-align for Hebrew/Arabic)
