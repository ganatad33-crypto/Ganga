# UX Laws — Psychology That Predicts Whether a Layout Feels Intuitive

These are research-backed heuristics (Jakob Nielsen and others) for *how* people perceive and navigate an interface, complementing the visual rules in `visual-system.md`. Apply the ones relevant to the component you're building — not every law applies to every screen.

## The core five (apply these first)

**Jakob's Law** — Users spend most of their time on *other* sites, so they expect yours to work the same way. Don't reinvent nav placement, icon meanings, or common interaction patterns (menu top or left, cart icon top-right, hamburger = menu). Novelty in *core navigation* is a cost, not a feature — save originality for content and brand personality, not for "how does this button work."

**Hick's Law** — Decision time increases (roughly logarithmically) with the number of choices offered. More nav items, more form fields, more buttons on screen = slower, more error-prone decisions.
→ *Apply to*: nav menus, dropdowns, button groups, pricing tiers, filter panels. Group related options, hide advanced/rare choices behind progressive disclosure, and trim any menu approaching 7+ flat items.

**Miller's Law** — Working memory holds about 7 items (±2). Don't force users to hold more than that in their head at once.
→ *Apply to*: multi-step forms (chunk into steps with progress indicators, don't dump 10+ fields on one screen), long unstructured lists (group into 5-7-item clusters with headers), onboarding (reveal progressively, don't front-load everything).

**Fitts's Law** — Time to reach and successfully click/tap a target depends on its size and distance from the current cursor/finger position. Bigger + closer = faster + fewer errors.
→ *Apply to*: primary CTAs (make them big, not a small text link), mobile tap targets (minimum ~44x44px — see `accessibility.md`), destructive actions (keep them *far* from primary actions to prevent mis-taps, e.g. don't put "Delete" right next to "Save").

**Aesthetic-Usability Effect** — Users perceive more attractive designs as *more usable*, even when usability is objectively identical. This is not an excuse to skip real usability work, but it means visual polish (from `visual-system.md`) isn't cosmetic — it measurably changes how forgiving people are of friction elsewhere in the flow.

## Gestalt grouping (how the eye clusters elements)

**Law of Proximity** — Elements placed close together are perceived as one group, even without a visible border. Use whitespace itself as the grouping mechanism before reaching for borders/dividers.

**Law of Similarity** — Elements that look alike (same color/shape/size) are read as having the same function. Don't style two unrelated things identically, and don't style two related things differently — both break users' pattern-matching.

**Law of Common Region** — A shared background/border reads as one group even more strongly than proximity alone (a card with a subtle background color groups its contents unambiguously).

**Law of Uniform Connectedness** — Elements visually connected by a line, arrow, or shared container are read as related — stronger than either proximity or similarity alone. Useful for showing flow/sequence.

## Cognitive bias effects worth designing around

**Peak-End Rule** — People judge an experience mostly by its most intense moment and how it ended, not the average of the whole thing. Invest disproportionate polish in the final step of any flow (checkout confirmation, form submission, onboarding completion) — a great ending buys forgiveness for a mediocre middle.

**Von Restorff Effect (Isolation Effect)** — An item that visually stands out from its surroundings is disproportionately remembered/noticed. Use *sparingly* and deliberately — one differentiated element per screen (the primary CTA) works; three "stand-out" elements cancel each other out.

**Zeigarnik Effect** — People remember incomplete tasks better than completed ones and feel a pull to finish them. Progress bars and "2 of 5 steps done" indicators exploit this productively to drive completion.

**Serial Position Effect** — Items at the start and end of a list are remembered better than items in the middle. Put the most important nav item or option first or last, not buried in the middle of a long row.

## Additional principles

**Tesler's Law (Conservation of Complexity)** — Every process has an irreducible amount of complexity; the only question is whether the system or the user absorbs it. Pushing complexity onto the user (endless config options) is usually the wrong trade — absorb it in sensible defaults instead.

**Doherty Threshold** — Productivity/engagement rises sharply when a system responds within ~400ms. Slow-feeling interactions (even if the actual work takes longer) benefit heavily from optimistic UI, skeleton loaders, or immediate micro-feedback on click.

**Occam's Razor** — Given equally functional options, prefer the one with the fewest elements. When two design solutions solve the problem equally well, the simpler one wins.
