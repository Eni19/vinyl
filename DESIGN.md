---
name: Enrique Susin — portfolio
description: A crate of vinyl records next to a turntable in a dark room; every project and theme is a record you pull out and play.
colors:
  room: "#0e0c13"
  room-deep: "#08070c"
  paper: "#18151f"
  paper-line: "#26222f"
  ink: "#f1ede4"
  ink-soft: "#aaa3b8"
  lime: "#e1ef4a"
  seafoam: "#7fd8cf"
  orange: "#f0703f"
  blue: "#3d4fd6"
  sleeve-ink: "#1f2a8a"
  sleeve-seafoam: "#7fd8cf"
  sleeve-orange: "#e8572a"
  sleeve-lilac: "#c9bfe6"
  sleeve-lime: "#e1ef4a"
  sleeve-paper: "#f3efe6"
  sleeve-graphite: "#24242a"
  lamp: "#ffcf9a"
  rim: "#7f8cff"
typography:
  display:
    fontFamily: "Archivo (wdth axis), system-ui, sans-serif"
    fontSize: "clamp(3rem, 6.6vw, 6rem)"
    fontWeight: 800
  title:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(2.25rem, 4vw, 3.5rem)"
    fontWeight: 800
  headline:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(1.25rem, 1.7vw, 1.5rem)"
    fontWeight: 800
  lede:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(1.125rem, 1.4vw, 1.3125rem)"
    fontWeight: 400
  body:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
  label:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 700
rounded:
  none: "0px"
spacing:
  margin: "clamp(16px, 3vw, 44px)"
components:
  button-primary:
    backgroundColor: "{colors.lime}"
    textColor: "{colors.room}"
    rounded: "{rounded.none}"
  liner-notes:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
---

# Design System: Enrique Susin — portfolio

## Overview

**Creative North Star: "The Listening Corner at Night"**

The site is a corner of a dark room: a wooden crate of records on a table, a turntable beside it, a warm lamp overhead. Each record is a project or a theme (research, experience, skills, contact). Hovering a record pulls it up out of the crate. Clicking it plays it: the sleeve rises, the disc slides out, travels to the platter and starts to spin, the tone arm swings in, and the liner notes open beside the scene with a Side A and a Side B.

The room is almost black. Colour lives on the sleeves and in the light.

**Key characteristics:**

- One 3D scene (React Three Fiber) with two real CC BY 4.0 models: a scanned record crate (Ellipsoid) and a turntable (ImSiyue). Credits sit under the intro.
- Sleeves are 1 × 1 squares with a printed cover (title strip at the top so it reads in the crate, then title, artwork, subtitle and catalogue number ES-00n) and a track-list back. Discs have a grooved black face and a paper label in the sleeve's label colour.
- Content always also exists as HTML: liner notes, project pages and a flat no-WebGL mode that shows both sides.

## Colors

### Room (neutral)

- **Room** (#0e0c13): page, canvas clear colour and fog, so the canvas edge never shows.
- **Paper** (#18151f): liner notes. **Paper Line** (#26222f): alternating track rows.
- **Ink** (#f1ede4) and **Soft Ink** (#aaa3b8): text.

### Accents

- **Lime** (#e1ef4a): the primary button (dark text), the active side tab, the language switch.
- **Orange** (#f0703f): track numbers (A1, B2) and link underlines.
- **Seafoam** (#7fd8cf): the liner-notes top band.

### Sleeves

Seven sleeve colourways (ink, seafoam, orange, lilac, lime, paper, graphite), each with its own ink and label colour, defined in `src/ui/records/catalog.ts`. Theme records use the owner's drawings as cover art.

### Light

- **Lamp** (#ffcf9a): a warm spotlight from above-left with shadows.
- **Rim** (#7f8cff): a cool back light that separates the objects from the wall.
- A focus spot on the platter brightens while a record plays. The deck's pilot lamp glows orange and is the only thing hot enough to bloom.

### Named Rules

**The Colour Lives on Sleeves Rule.** Grounds are room or paper. Saturated colour appears on covers, labels, the lime button and the side tabs.

## Typography

**Font:** Archivo (variable, with the width axis) through `next/font`, also drawn onto the cover and label canvases after `document.fonts.ready`.

- **Display** (800): the name.
- **Title** (800): the record title in the liner notes.
- **Headline** (800): project, paper and role titles.
- **Lede**, **Body**, **Label** as in the tokens above.

## Layout

- **Overview (desktop):** intro top-left, crate centred-right, deck at the right. The camera pulls back to fit both and follows the pointer slightly.
- **Playing:** the liner notes take 44vw on the right. The camera frames the crate (with the played sleeve standing tall in it) and the spinning deck in the free part.
- **Phones:** the intro sits on top and the scene below. A row of sleeve links at the bottom acts as the crate's accessible menu. The liner notes become a 60svh bottom sheet, and the camera frames the scene above it.
- **Flat (no WebGL or no script):** intro, then every record's liner notes with both sides.

## Elevation & Depth

Depth is physical and only in the 3D scene: a shadow-casting lamp, a rim light, fog that starts just behind the stage (measured from the camera, so phones see the same room), soft bloom on hot highlights and a vignette. HTML surfaces are flat, with no CSS shadows.

## Motion

- Hover: the record rises about a third of its height out of the crate (static hit boxes at rest, so the pointer never loses it).
- Play, in phases: lift (0–0.6s), disc slides out (0.55–1.15s), disc arcs to the platter and lays flat (1.15–2.2s; flipped for Side B), sleeve settles back into the crate standing tall (1.3–2.1s), spin at 3.5 rad/s, tone arm swings in.
- `prefers-reduced-motion`: poses jump, the camera cuts, nothing drifts.

## Components

- **Liner notes:** bar (back to the crate, previous/next), catalogue number, title (focused on open), subtitle, Lado A / Lado B tabs (`role="tablist"`), then the side's content. Tracks are numbered A1, A2… on alternating rows. Esc closes, and the URL hash follows the playing record.
- **Primary button:** lime fill, dark label, square.
- **Text link:** bold, orange underline, with an arrow nudge on hover.

## Do's and Don'ts

- **Do** add projects as content. The catalog (`buildCatalog`) turns them into records, and its tests guard ids, tracks and theme art.
- **Do** keep every record's content available as HTML.
- **Don't** give the owner's drawings a section of their own. They are cover art.
- **Don't** add CSS shadows, gradients, glass or numbered sections.
- **Don't** light the room up. It is night, and the lamp and the sleeves carry the image.
