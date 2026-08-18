# Visual System — Spacing, Type, Color, Hierarchy

Distilled from *Refactoring UI* (Adam Wathan, creator of Tailwind CSS, and Steve Schoger). The whole philosophy: developers don't lack taste, they lack *constraints*. Give yourself a fixed menu of choices and the design gets consistent automatically.

## Spacing scale

Never use arbitrary spacing values (not "let's try 20px"). Pick a scale and only use values from it:

```
4px  → tight coupling (icon + its label)
8px  → related elements within a component
16px → standard gap between components
24px → separation within a section
32px → major section boundary
48px → between distinct page sections
64px → hero / top-of-page breathing room
```

Bigger elements need proportionally more space around them — a large hero heading needs more surrounding whitespace than a small caption.

## Type scale

- Use a constrained type scale (e.g. 12/14/16/18/20/24/32/48px) — never pick a font-size ad hoc.
- More than ~5 distinct sizes on one screen usually signals undisciplined hierarchy.
- Don't rely on font-size alone for hierarchy — weight and color do real work too. A bold 16px can outrank a thin 20px.
- Favor fonts with 5+ weights available; avoid typefaces that only ship as regular/bold.
- Line length: keep body text 45-75 characters per line (~20-35em) — wider lines hurt readability regardless of font size.
- Line-height: taller line-height for small text, tighter line-height for large headlines.
- Align mixed font sizes on their baseline, not their vertical center.
- Left-align body text (right-align for RTL languages — see `rtl-hebrew.md`). Never center long-form paragraphs. Justify only with hyphenation enabled, or not at all.
- Loosen letter-spacing for all-caps text; tighten it slightly for large headlines.

## Color

- **Design in grayscale first, add color last.** This forces spacing/contrast/size to carry the hierarchy — color becomes polish, not a crutch.
- Build a systematic palette: 5-9 shades per color (not just "blue" — blue-50 through blue-900), plus a neutral gray scale with a *slight* tint (pure gray reads as lifeless; warm or cool grays feel intentional).
- Limit yourself to one dominant/primary color + a neutral scale + maybe one accent. Two saturated colors competing reads as noise, not energy.
- Don't use pure black (#000) on pure white — too harsh. Use a very dark gray (~#1a1a1a) for body text.
- Color connotations as a fast default (override based on brand/context): blue = safe/familiar/trustworthy (safest general pick), gold = premium/expensive, pink = fun/playful/less serious, green = growth/success/go, red = urgency/danger/stop.
- Not every interactive link needs a distinct color — sometimes heavier weight or a darker shade communicates "clickable" just as well, especially in link-dense interfaces.

## Hierarchy & emphasis

- Primary action: obvious, solid fill, highest contrast on the screen.
- Secondary action: visible but clearly subordinate — lower contrast, often outline or ghost-button style. (Common mistake: making secondary actions so low-contrast they're illegible instead of merely de-emphasized.)
- Tertiary action: a plain link/text button, no container at all.
- Control emphasis with size + weight + color *together* — don't rely on layout position alone to signal importance.
- Use icons instead of color alone to distinguish states/categories where possible (color-blind accessibility, and it's often clearer anyway).

## Depth & elevation

- Prefer a soft box-shadow, a contrasting background panel, or added whitespace over a hard 1px border to separate content — borders alone often look thin/cheap.
- Use *lighter tints of the element's own hue* for shadows instead of plain black shadows (a dark-blue button gets a soft blue-tinted shadow, not gray).
- Bigger/more prominent elements get bigger shadows; small UI (buttons, chips) gets subtle shadows only.

## Alignment & proportion

- Everything should line up to a clean set of columns/edges — misalignment reads as "amateur" faster than almost any other single issue, even to viewers who can't articulate why.
- Right-align numbers in tables (left-align in LTR text columns; mirror for RTL).
- Maintain consistent proportions between repeated elements (card widths, image aspect ratios) — inconsistency across a grid is very noticeable even at a glance.

## Process notes

- Sketch/wireframe low-fidelity first; don't get pulled into font/color decisions before the layout itself works.
- Build one section to a high standard before moving to the next, rather than a full page at uniform low quality.
- Start with generous/excessive whitespace, then remove — it's easier to tighten than to loosen a cramped layout after the fact.
