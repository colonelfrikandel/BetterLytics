# Changelog

## 1.2.0

### Skills
- Clicking a gem — in Active Skills, in Gem Priority or in the skill details — copies its name, ready to paste
  into the game's own search. The panel says which name it took.
- A long skill name in Gem Priority ends in an ellipsis instead of reaching into the next column.

### Gear
- Item tooltips now show what the base item gives on its own — the resistance of a ring, the spirit of an amulet,
  the condition of a charm — above the rolled modifiers, as the game does. It was missing on every item that has one.

### Where a build opens
- A build opens again on the tab and at the act or stage you last read it at, remembered for each build on its own.
  A build you open for the first time starts on Overview, whatever you were reading elsewhere.
- When the author renames or rebuilds a variant, the guide finds the stage again by its name and otherwise opens
  the author's default. A link that names a tab or variant still wins, so shared links open what they point at.

### Loading
- A first visit to mobalytics.gg could fail with an HTTP 403: the site's bot protection turns away a browser it
  has not seen before. The guide now waits and asks again a few times, spends its last attempt on the visitor's
  own session, and says on screen that it is still trying instead of showing an error straight away.

## 1.1.0

### Passives and Atlas Tree
- The side panel is now called **Priority** and opens first: it shows the order in which to take the passives.
- Ascendancy passives are numbered in the order to take them.
- Point counts for the ascendancy and the atlas no longer include the free starting node, so they match the game.
- Hovering a passive in the Priority list highlights it on the tree; clicking it centres the tree on that node.

### Skills
- Hovering a gem in **Gem Priority** highlights it in **Active Skills**, so you can see which skill it belongs to.

### Gear
- The belt now sits in the left column with the helmet, body armour, gloves and boots.
- All three charm slots are always shown; empty ones appear as placeholders, so the layout stays the same across
  build variants.
- Every equipped item has a **trade** icon (scales) in the corner of its picture: it opens the official Path of
  Exile trade site with a search for that item.

### Overview
- A collapsed **At a Glance** panel now expands when you click anywhere on it.

## 1.0.0

First public release: a clean tabbed view of PoE 2 build guides on mobalytics.gg — Overview, Skills, Gear, Passives,
Atlas Tree and Progression.
# 1.2.1 — BetterLytics community builds

- Activate on `/poe-2/profile/<author>/builds/<build>` pages.
- Read individual guide documents independently of the featured-page query key.
- Keep saved preferences separate for different authors' community builds.
