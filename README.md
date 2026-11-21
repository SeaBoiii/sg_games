# SG Games

Party games for the kopitiam table. They are static HTML, CSS and JS, with no build step, ready for GitHub Pages.

## Games

| Game | Path | What it is |
| --- | --- | --- |
| **Agak Agak** | `games/agak-agak/` (2D) · `games/agak-agak/3d/` (3D) | A Singapore-edition spectrum guessing game. Spin a hidden target, give one clue, and get your team to move the needle as close as possible. Two modes. **Teams** is pass and play on one screen, using about 100 SG Edition cards or a Blank deck where the Psychic says the question and both ends out loud. **Solo** is you against the house: 10 cards with ready-made clues, scored out of 40. Best on a phone held in landscape. |

| **Chope Wars** | `games/chope-wars/` (2D) · `games/chope-wars/3d/` (3D) | Claim hawker-centre tables one tissue packet at a time. Stools are shared between tables; fill a table's 4 stools to claim it (most packets wins, a 2–2 tie goes to the last chope). Fan tables are worth 2 and famous-stall tables 3, and each player can call the cleaner auntie once. 2 players on one screen, or solo against Uncle Lim (CPU, Chill or Kiasu). |
| **MRT Rush** | `games/mrt-rush/` (2D) · `games/mrt-rush/3d/` (3D) | Solo puzzle-arcade. Pack peak-hour commuters into a carriage before the doors close: people must be able to walk in from the open door, bags and trolleys stay off seats, uncles and mums-to-be need seats, and the doorway must be clear. Three fictional lines (Kaya, Teh, Bandung) with stars and best scores. |
| **Kopi Master** | `games/kopi-master/` (2D) · `games/kopi-master/3d/` (3D) | Solo speed game at a kopitiam drinks stall. Customers order in real lingo (O, C, siew dai, ka dai, kosong, peng, gau, po, tapau, teh tarik, yuan yang, Milo Dinosaur); tap the ingredients into the cup and serve before they lose patience. Breakfast, Lunch and Supper shifts plus Endless, with a lingo cheat sheet. |
| **Pasar Malam Haggle** | `games/pasar-malam/` (2D) · `games/pasar-malam/3d/` (3D) | Bargain down a night market with a shopping list and a budget. Every stallholder has a secret lowest price and a patience meter: make offers, take their price, or walk away and hope they call you back. Five personalities, three nights, solo or 2 players taking turns at each stall. |
| **Marina Mini Golf** | `games/marina-golf/` (2D) · `games/marina-golf/3d/` (3D) | Nine holes of mini golf around Singapore: Void Deck, Merlion Park, Esplanade, Lau Pa Sat, Supertree Grove, an MRT crossing, Marina Bay Sands, the Jewel Rain Vortex and the Flyer. Drag back to putt. Water, sand, slopes, bouncy domes, a moving train and a rotating wheel. Solo or 2–4 players passing the phone. |
| **Cannot Say!** | `games/cannot-say/` (2D) · `games/cannot-say/3d/` (3D) | Team word party game. The describer gets your team to say the word on the card (hawker food, places, Singlish, SG life, getting around) without saying any of its five banned words. Got it, skip or buzz against the clock, then fix mistakes before banking the points. 2–4 teams passing one phone. |
| **Chapteh Kick** | `games/chapteh-kick/` (2D) · `games/chapteh-kick/3d/` (3D) | Arcade timing game based on the kampung shuttlecock. The chapteh falls to your left foot, knee or right foot; kick the matching zone as the ring closes for Perfects, combos and golden bonuses. 3 chapteh per run, and it speeds up. Rally mode puts two players on one phone (left half vs right half); Turns mode passes it round 2–4 players. |
| **Kiasu Quiz** | `games/kiasu-quiz/` (2D) · `games/kiasu-quiz/3d/` (3D) | Singapore trivia game show with 128 questions on history, places, makan, Singlish and SG life, each with a "Did you know?" fact. Solo: beat the clock with three lifelines (Kiasu 50:50, Ask Auntie, Chope next). Buzzer battle: 2–4 players buzz in on one screen; wrong answers lose points and let others steal. |

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
games/kopi-master/
  index.html, 3d/       2D (SVG) and 3D (Three.js) builds
  js/engine.js          Order generator (lingo -> recipe), shifts, patience, scoring, glossary (no DOM)
  js/art.js             SVG customers, the drink in the cup, ingredient icons (also used by the hub card)
  js/flow.js            Shift select, live loop, ingredient pad + keyboard, serving feedback, results
  js/board2d.js         SVG stall scene
  js/board3d.js         Three.js stall with HTML speech bubbles that follow each customer
  models/kopi-assets.glb Counter, stall props, cup/glass/tapau bag, customers (from MRT Rush) and hall furniture
games/pasar-malam/
  index.html, 3d/       2D (SVG) and 3D (Three.js) builds
  js/engine.js          Stalls, sellers (personality, hidden floor, patience), offers, walk-aways, nights, scoring (no DOM)
  js/art.js             SVG goods and canopy colours; stallholders reuse Kopi Master's character art
  js/flow.js            Night select, solo/2-player turns, offer stepper + keyboard, receipts
  js/board2d.js         SVG night-market stall
  js/board3d.js         Three.js market aisle; the camera walks from stall to stall
  models/pasar-assets.glb Stall, string lights, twelve goods and the SG cast (from MRT Rush)
games/marina-golf/
  index.html, 3d/       2D (SVG) and 3D (Three.js) builds
  js/engine.js          Holes, fixed-step ball physics (walls, bumpers, sand, water, slopes, movers), turns, scoring (no DOM)
  js/art.js             SVG hole art: scenery, turf, hazards, landmarks; also the 3D floor texture
  js/flow.js            Course select, 1–4 player turns, drag-to-putt + keyboard, scorecards
  js/board2d.js         SVG board
  js/board3d.js         Three.js course built from the same hole data; overview and chase cameras
  models/golf-assets.glb Merlion, Supertree, durian domes, MRT train, MBS towers + SkyPark, Flyer gate, hawker set, scenery, SG cast
games/cannot-say/
  index.html, 3d/       2D (SVG) and 3D (Three.js) builds
  js/cards.js           The deck: 174 cards in five categories, five banned words each
  js/engine.js          Teams, rounds, timer, got/skip/buzz, review corrections, scoring (no DOM)
  js/art.js             SVG studio, card faces and stopwatch
  js/flow.js            Setup and options, pass-the-phone turns, pause, review, final scores
  js/board2d.js         SVG game-show studio
  js/board3d.js         Three.js studio: a 3D card that flips and flies, podium score screens, buzzer
  models/studio-assets.glb Stage, LED backdrop and big screen, podiums, buzzer, stopwatch, spotlights, trophy, SG cast
games/chapteh-kick/
  index.html, 3d/       2D (SVG) and 3D (Three.js) builds
  js/engine.js          Chapteh flights (feather-braked arcs), timing windows, zones, combos, lives, rally scoring (no DOM)
  js/art.js             SVG playground, the kid (posed by two-bone IK) and the chapteh
  js/flow.js            Solo / Rally / Turns, stage-tap and keyboard controls, pause, results
  js/board2d.js         SVG board: kick poses, timing ring, score display, effects
  js/board3d.js         Three.js playground: a jointed kid rig driven by the same leg maths
  models/chapteh-assets.glb Kid rig, chapteh, dragon playground, rain tree, HDB blocks, scenery, SG cast
games/kiasu-quiz/
  index.html, 3d/       2D (SVG) and 3D (Three.js) builds
  js/questions.js       The question bank: 128 questions in five categories, with difficulty and a fact for each
  js/engine.js          Question sets (easy to hard), solo timing and streaks, lifelines, buzz-in/steal rules (no DOM)
  js/art.js             SVG studio, question board, answer tiles, podiums; the host reuses Kopi Master's art
  js/flow.js            Setup, solo and buzzer flows, reveal with facts, keyboard buzzers, results
  js/board2d.js         SVG studio board
  js/board3d.js         Three.js studio: live canvas screen and tiles, podiums with buzzers, host desk
  models/quiz-assets.glb Quiz wall with bulbs, podium with buzzer dome, host desk, light truss, SG cast
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
