---
name: mi-osef-ops
description: Operational runbook for the "מי אוסף" (mi-osef) family scheduling PWA and its sibling "ניהול מלאי" inventory app, both hosted from this repo (ganatad33-crypto/Ganga) via GitHub Pages with a Supabase backend. Use this whenever making, testing, or deploying ANY change to files under mi-osef/ (or the root inventory app) — code fixes, new features, CSS, or Supabase schema changes. Also use it when the user reports the app is "stuck," "not working," "not updating," or a fix "isn't showing up" even though you already pushed it — those are almost always one of the specific known pitfalls documented here (service worker caching, a CSS hidden-attribute bug, or an emailRedirectTo collision), not a fresh mystery to debug from scratch. Trigger this proactively before touching deploy/build/test steps for this project, not just when the user asks for a "runbook."
---

# מי אוסף — ops runbook

This captures hard-won operational knowledge from a long debugging session on this project. The code patterns here (deploy, versioning, testing) are specific to how this repo is wired — read this before repeating work that's already been done, and especially before telling the user "this should work now" without following the version-bump and dual-deploy steps below.

## 1. Deploy process — two branches, always

GitHub Pages serves this site from the `gh-pages` branch ("Deploy from a branch"), **not** GitHub Actions. Actions-based deploy was abandoned: GitHub does not reliably trigger `pages build and deployment` for bot/agent-authored commits, even with the `github-pages` environment's deployment-branch restriction lifted. `.github/workflows/pages.yml` is kept `workflow_dispatch`-only for manual use, not as the live deploy path.

**Real workflow for every change:**
1. Commit and push to the working branch as normal.
2. Fetch `gh-pages` and create a temporary worktree: `git worktree add /tmp/.../gh-pages-wt gh-pages`.
3. `diff` the specific files you changed between the worktree and your working copy **before** touching anything, so you know exactly what's about to change on a branch that also hosts the sibling app at the repo root.
4. Copy over only those exact files (never a broad merge or `git merge`/`cp -r`).
5. Commit and push the worktree.
6. Remove the worktree: `git worktree remove /tmp/.../gh-pages-wt --force`.

Skipping step 2/3 (deploying to gh-pages) is the single most common way a fix looks "done" in git but the user never sees it — they're looking at the live site, not the working branch.

## 2. Version bump rule (read this before you say "should be fixed now")

`mi-osef/js/config.js` has `VERSION: 'x.y.z'` and `mi-osef/sw.js` has `var VERSION = 'miosef-x.y.z'`. The service worker (`sw.js`) caches every app file keyed by this string, cache-first: if a cache entry exists, it's served immediately and only refreshed in the background for *next* time. **If you change any file under `mi-osef/js/`, `mi-osef/index.html`, or `mi-osef/css/`, and don't bump both VERSION strings together, a device that already opened the app will keep serving the old, broken code indefinitely** — no matter how many times the user reloads or how correct your fix is on the server.

This was the root cause of a long string of "I fixed it, but the user still sees the bug" cycles in this project. Treat it as a required step of shipping, not an optional cleanup — bump on every user-facing change, right before the final commit+push+deploy of that change (keep both files' version numbers identical, e.g. `1.0.12` / `miosef-1.0.12`).

Tell the user, when relevant, that a device which already had the app open may need to fully close and reopen it (not just reload) to pick up a version bump.

## 3. Single-file artifact build (for sharing test links)

`node mi-osef/build.js` inlines fonts, CSS, and all `js/*.js` into `mi-osef/dist/miosef.html` — useful for publishing via the Artifact tool so the user can try a change on their phone without needing email/Supabase.

To make a **local-only demo build** (skips login, works instantly):
1. `cp js/config.js` somewhere safe first.
2. Blank `SUPABASE_URL` and `SUPABASE_ANON_KEY` to `''` in `js/config.js`.
3. Run `node build.js`, copy `dist/miosef.html` out to wherever you're publishing from.
4. **Immediately** restore `js/config.js` from the saved copy.
5. Verify with `git status --short mi-osef/js/config.js` that it shows **no diff** — the real production keys must never end up committed blanked, even for a moment.

Publish with the Artifact tool's `url:` parameter set to the same URL every time, so it updates in place instead of minting a new link the user has to re-find.

## 4. Testing pattern — jsdom scratchpad scripts

There's no test framework here — hand-rolled Node scripts using `jsdom`, typically saved to the session scratchpad directory and run with `node <script>.js`. The pattern:

- Boot the real `mi-osef/index.html` (or a built single-file artifact) via `new JSDOM(html, { runScripts: 'outside-only' or 'dangerously', url: '...', beforeParse, virtualConsole })`.
- Mock `window.supabase = { createClient: () => ({ from, auth, channel, removeChannel }) }` with fake table responses shaped like the real Supabase client's chainable query builder.
- **Filter before you terminate the chain.** A common mistake: calling `.limit()` before `.eq()` in a mock, so `.limit()` returns a bare Promise that has no `.eq()` method for anything chained after it. Real Supabase-js stays chainable until you actually consume it — match that in mocks, or reorder your real code to filter first, terminate last (this was a genuine bug found in `Store.loadRemote`, not just a test artifact).
- Dispatch synthetic interactions with `el.dispatchEvent(new w.Event('submit', { bubbles:true, cancelable:true }))` or `MouseEvent('click', { bubbles:true })`.
- For realtime/live-sync behavior, capture the callback passed to `channel().on('postgres_changes', filter, cb)` in a mock and invoke it manually with a synthetic `{ new: { doc: ... } }` payload.
- For two-household scenarios (join flows, cross-house links), run two separate `JSDOM` windows sharing one plain in-memory object that stands in for the server's tables.

**Always re-run the full existing suite of scratchpad scripts after any change, not just a new targeted test.** Several real regressions in this project were only caught this way — e.g., adding a new `Store` function that threw synchronously broke unrelated flows because it wasn't defensively wrapped, and only showed up when an *older* test happened to exercise the same code path.

## 5. Known pitfalls (check these first before deep-diving a new bug)

**`[hidden]` attribute silently does nothing.** Any element whose own CSS rule sets `display` (e.g. `.gate{display:flex}`, `.app{display:flex}`) completely defeats the browser's built-in `[hidden]{display:none}` — author stylesheets beat user-agent stylesheets at *any* specificity, regardless of selector specificity or source order. Toggling `el.hidden = true/false` in JS then has **zero visual effect**, even though the DOM state is perfectly correct. This was the single root cause behind what looked like dozens of unrelated "stuck screen" reports across an entire session, and it's invisible to jsdom-only tests (jsdom doesn't compute real CSS cascade/layout) — it took a real Chromium/Playwright screenshot to catch it. Fix already applied: a global `[hidden]{display:none!important}` rule near the top of `css/app.css`. If a screen "won't appear" or "won't disappear" despite JS state looking right, check *computed* `display` in a real browser before assuming it's a JS bug.

**Never touch `location.hash` in `emailRedirectTo`.** Supabase's magic-link flow appends its own auth token to the redirect URL via the hash fragment. If your redirect target already has something in the hash (e.g. to carry a custom invite code through login), you get two `#` fragments colliding in one URL, which corrupts both Supabase's own token parsing *and* yours — login fails silently and just bounces back to the email-entry screen with no error shown. Carry custom state (like a pending invite code) through a login redirect via `localStorage` instead, written before starting the OTP flow and read back on the next boot — never via the hash.

**Always `.catch()` Supabase auth calls.** `signInWithOtp`/`verifyOtp` etc. can reject outright (network block, CORS) instead of resolving with a normal `{error}` object. Without a `.catch()`, the UI is left on a busy spinner forever with zero feedback. Wrap with a shared timeout+catch helper (see `withTimeout` in `js/auth.js`).

**`navigator.serviceWorker.register()` can throw synchronously**, not just reject — happens in sandboxed/insecure-origin contexts like Claude Artifact previews. Wrap the call itself in try/catch, not just `.catch()` on its return value.

**RLS + invite tables need an explicit accept policy.** The schema's pattern is one JSON doc per house (`houses.doc`) gated by an `is_member()` function checking a join table. Any "someone claims an invite" flow needs an explicit `UPDATE` RLS policy (e.g. `used_by is null` → claim) — Postgres RLS defaults to deny, so a missing policy means claiming silently fails with a permissions error, not a clear "no policy" message. Check `supabase/schema.sql` and `supabase/migrations/` for what's already there before assuming a new invite-flow feature just needs client code.

**Generate UUIDs client-side for new rows** (`crypto.randomUUID()`) rather than insert-then-read-back — the read-back depends on a membership row created by a trigger on the insert, which can race and return "no row."

**A feature can look fully built while being completely unwired.** This codebase had several cases where the data model, UI, and help text all existed and described a feature correctly, but the actual mechanism was never connected (e.g. an "invite" button that built a URL with `#join=<id>` that literally nothing ever parsed). When investigating "X doesn't work," grep for whether the mechanism is actually *consumed* somewhere, not just whether it's referenced in the UI — don't assume wiring exists just because the surrounding pieces do.

## 6. End-to-end workflow checklist

For any user-facing change to mi-osef:

1. Make the code change.
2. Run the full jsdom regression suite (not just a new targeted test).
3. If relevant, rebuild the single-file artifact and re-run tests against it too.
4. Commit + push to the working branch.
5. Bump `VERSION` in both `js/config.js` and `sw.js` (keep them identical) — skip only for changes with zero user-facing effect (e.g. comments, this skill file, docs).
6. Commit + push the version bump.
7. Apply the same diff to `gh-pages` via a worktree (section 1), then remove the worktree.
8. Republish the Claude Artifact practice link if one exists for this project.
9. Report back to the user.

## 7. Communicating with this user

This user prefers very short, numbered, concrete steps in Hebrew when a manual dashboard action is needed (Supabase, Brevo, GitHub UI) — think "explain it like I'm tired," not a technical explanation of *why* first. Give the click path, not the reasoning, unless asked. Their messages are sometimes garbled by autocorrect/voice-to-text; read intent charitably, and when a screenshot would resolve ambiguity faster than another guess, ask for one — screenshots were consistently the fastest way to actually pinpoint root causes in this project, far faster than iterating blind on described symptoms.
