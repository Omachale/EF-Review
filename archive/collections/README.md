# Archived: Orion constellation and Clockwork Engine

Disabled and removed from `index.html` on 2026-10-14 (to be remade or adjusted later).
The complete working version is also in git history: commit `2360dbd`.

## What it did
Reaching five stars on a topic lit a star in Orion (grammar) or fitted a cog in a brass machine
(vocabulary), in a fixed order (topic 1 to 12). A small button on each menu opened the picture.
Newly earned pieces animated in, together with the lines, bars and panels they completed.

## Files
- `collections.js`: the whole feature (data for Orion and the engine, gear drawing and meshing maths,
  the `Col` module that renders and animates the SVG, `CDEF`, `pendingCount`, `syncLit`).
  It sat just above the `/* ===== EVENTS ===== */` block.
- `collections.css`: styles. It sat just above the `prefers-reduced-motion` rule.
- `help-paragraph.html`: the paragraph that was in `renderHelp()`, just before the "Scores" heading.

## Hooks that were removed from `index.html` (re-add these to switch it back on)
1. `freshStore()`: add `lit:{}, shown:{}` (`store.lit` = topics that reached 5 stars, `store.shown` = pieces the player has seen light up).
2. HTML: `<section id="collection" class="screen"></section>` after the `#help` section.
3. `startRound()`: add `newLit: []` to the `G` object.
4. `award()`, after `store.answered` is incremented:
   `if (mastery(p) >= 5 && !store.lit[p]){ store.lit[p] = Date.now(); G.newLit.push(p); }`
5. `renderResult()`, before the mistakes `<details>`:
   `${G.newLit.length ? `<button class="btn primary wide newlit" data-act="collection">${CDEF[PT[G.newLit[0]].sec].found(G.newLit.length)}</button>` : ''}`
6. `renderHome()`, in the `back-row`, before the mute button:
   `<button class="icon-btn col-btn${pendingCount(SEC) ? ' has-new' : ''}" data-act="collection" aria-label="${CDEF[SEC].label}" title="${CDEF[SEC].label}">${CDEF[SEC].icon}</button>`
7. Click handler: `case 'collection': Sfx.tap(); Col.open(); show('collection'); break;`
8. Boot: call `syncLit(); save();` before `renderLanding()` (so existing five-star topics light up).

## Notes for the remake
- The Orion star positions are hand-placed approximations; the label sides are set per star.
- Gear meshing: each cog's angle is computed from its parent's (see `gearAngles`), so neighbours stay interlocked.
- The engine layout was found by a random search for a compact, non-overlapping arrangement.
