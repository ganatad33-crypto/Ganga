# Accessibility Basics (WCAG 2.1/2.2 Level AA)

Run this checklist last, after hierarchy/spacing/color decisions are made — but treat it as non-optional, not a nice-to-have. Low-contrast text is the single most common accessibility failure on the web today (found on the large majority of home pages in independent audits), and it's also nearly free to fix if caught during design rather than after ship.

## Contrast ratios (Level AA — the generally-targeted standard)

- **Normal text** (under ~18pt / 24px, or under 14pt/18.5px bold): minimum **4.5:1** contrast ratio against its background.
- **Large text** (18pt/24px+, or 14pt/18.5px+ bold): minimum **3:1**.
- **UI components & graphical objects** (button borders, form input outlines, icons that carry meaning): minimum **3:1** against adjacent colors.
- **Level AAA** (aspirational, recommended when the audience skews older or low-vision): 7:1 for normal text, 4.5:1 for large text.
- Practical target: don't just scrape past 4.5:1 (e.g. 4.52:1) — that's the compliance floor, not a comfortable reading experience. Aim comfortably above it where the palette allows.
- Exemptions: logos/brand marks, purely decorative text, and text that's part of an inactive/disabled control have no contrast requirement.
- Always verify actual rendered colors with a contrast-checker tool — don't eyeball it, especially for text-over-image or semi-transparent overlay cases.

## Touch targets

- Minimum tap target size: **44×44 CSS pixels** for any pointer/touch input (buttons, links acting as buttons, form controls, icon-only buttons).
- Exceptions: targets inline within a running block of text (e.g. a link mid-sentence), or when an equivalent larger-target control is available elsewhere.
- Space adjacent tap targets apart, not just individually large — accidental mis-taps happen at the *boundary* between two close targets even if each one individually meets the minimum.

## Color & meaning

- Never convey information (errors, required fields, status, links) through color alone — pair it with an icon, text label, underline, or pattern. This also happens to make the design clearer for everyone, not just color-blind users.
- Links within body text: either keep them visually distinct via underline/weight (not color alone), or ensure the color itself meets the 4.5:1 text contrast ratio in every state (default, visited, hover, focus).

## Keyboard & focus

- Every interactive element must be reachable and operable via keyboard alone (Tab/Shift+Tab/Enter/Space) — this is a base-level requirement, not an edge case.
- Focus states must be visible — never remove the focus outline (`outline: none`) without providing a clear custom replacement. A component that "looks fine" but has an invisible focus ring is a real accessibility failure, not a cosmetic nitpick.

## Fast pre-ship pass

1. Run every text/background color pair through a contrast checker (WebAIM's is free and fast) — flag anything under 4.5:1 (normal) / 3:1 (large/UI).
2. Tab through the whole page/flow with a mouse untouched — confirm every action is reachable and focus is always visibly indicated.
3. Check icon-only buttons have an accessible label (aria-label or equivalent), not just a tooltip.
4. Zoom the page to 200% and confirm layout doesn't break or clip content.
