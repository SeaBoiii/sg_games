# SG Games

Party games for the kopitiam table. They are static HTML, CSS and JS, with no build step, ready for GitHub Pages.

## Games

| Game | Path | What it is |
| --- | --- | --- |
| **Agak Agak** | `games/agak-agak/` (2D) · `games/agak-agak/3d/` (3D) | A Singapore-edition spectrum guessing game. Spin a hidden target, give one clue, and get your team to move the needle as close as possible. Two modes. **Teams** is pass and play on one screen, using about 100 SG Edition cards or a Blank deck where the Psychic says the question and both ends out loud. **Solo** is you against the house: 10 cards with ready-made clues, scored out of 40. Best on a phone held in landscape. |

| **Chope Wars** | `games/chope-wars/` (2D) · `games/chope-wars/3d/` (3D) | Claim hawker-centre tables one tissue packet at a time. Stools are shared between tables; fill a table's 4 stools to claim it (most packets wins, a 2–2 tie goes to the last chope). Fan tables are worth 2 and famous-stall tables 3, and each player can call the cleaner auntie once. 2 players on one screen, or solo against Uncle Lim (CPU, Chill or Kiasu). |
| **MRT Rush** | `games/mrt-rush/` (2D) · `games/mrt-rush/3d/` (3D) | Solo puzzle-arcade. Pack peak-hour commuters into a carriage before the doors close: people must be able to walk in from the open door, bags and trolleys stay off seats, uncles and mums-to-be need seats, and the doorway must be clear. Three fictional lines (Kaya, Teh, Bandung) with stars and best scores. |

## Project layout

```
index.html              Landing page (hub) that lists every game
404.html                Friendly not-found page
assets/
  games.js              Game registry; the hub renders its cards from this
  hub.css, hub.js       Landing page styles + HDB skyline art
  tile.svg, favicon.svg Shared Peranakan tile and logo
  lib/sfx.js, lib/fx.js Shared synthesised sounds, tweens and confetti for every game
games/chope-wars/
  index.html, 3d/       2D (SVG) and 3D (Three.js) builds
  js/engine.js          Rules, scoring and the Uncle Lim CPU (no DOM)
  js/flow.js            Setup, turns, cleaner auntie, undo, results (shared by 2D and 3D)
  js/board2d.js         SVG board
  js/board3d.js         Three.js board built from Blender templates
  models/chope-assets.glb  Table, stool, tissue packet, fan, stall, tent card and tray templates
games/mrt-rush/
  index.html, 3d/       2D (SVG) and 3D (Three.js) builds
  js/engine.js          Carriage grid, commuter shapes, boarding/alighting rules, lines and scoring (no DOM)
  js/flow.js            Line select, door timer, queue, rotate/place, station summaries, results
  js/board2d.js         SVG carriage (also exports the commuter drawings used in the queue)
  js/board3d.js         Three.js carriage built from Blender templates
  models/mrt-assets.glb Seat, wall, door, pole, ten unique textured commuters (standing + seated, each fits one grid square) and textured luggage; Draco-compressed
games/agak-agak/
  index.html            2D build (SVG dial)
  3d/index.html         3D build (Three.js dial on a kopitiam table)
  js/engine.js          Pure rules: scoring, turns, catch-up, winner
  js/cards.js           ~100 Singapore spectrum cards
  js/flow.js            Screen flow shared by 2D and 3D (setup → psychic → guess → call → reveal)
  js/dial2d.js          SVG dial renderer
  js/dial3d.js          Three.js dial renderer (same adapter API as dial2d)
  js/sfx.js, js/fx.js   Synthesised sound effects, tweens, confetti
  models/agak-scene.glb 3D scene exported from Blender
  models/source/        Editable .blend source (not deployed)
```

The 2D and 3D builds share `engine.js` and `flow.js`. Each build only supplies a dial object with the same methods (`spin`, `setShutter`, `setNeedle`, `setLabels`, …), so a game change only has to be made once.

The 3D scene (dial housing, wheel, shutter, needle, card plaques, marble table, plastic stools, kopi and kaya toast) was modelled procedurally in Blender. Three.js animates parts by node name (`Wheel`, `Shutter`, `Needle`, `CardL`, `CardR`, `SpinKnob`, `TableTop`). If you rename them in Blender, update `js/dial3d.js` too.

## Run locally

ES modules need a web server (opening the file directly won't work):

```powershell
python -m http.server 8765
```

Then open http://localhost:8765.

## Deploy to GitHub Pages

1. Push this folder to a GitHub repository with `main` as the default branch.
2. In the repository, go to **Settings → Pages → Build and deployment** and set **Source** to **GitHub Actions**.
3. Push to `main`. The workflow in `.github/workflows/pages.yml` publishes the site to `https://<user>.github.io/<repo>/`.

All links are relative, so the site works at a sub-path. Alternatively, choose **Deploy from a branch** (`main`, `/ (root)`). That also works, but it publishes the `.blend` source too.

## Add a new game

1. Create `games/<slug>/index.html` (copy `games/agak-agak/index.html` as a starting point; `assets/tile.svg` and the fonts are shared).
2. Add an entry to `assets/games.js`. The hub card, tags and buttons come from there.

## Credits

- [Three.js](https://threejs.org) (MIT), loaded from jsDelivr in the 3D build.
- Fonts: Bricolage Grotesque and DM Sans from Google Fonts (SIL OFL).
- All art, the 3D models, the sounds and the cards are original to this project.
