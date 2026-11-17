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
- Sleeves are 1 × 1 squares with a printed cover (title strip at the top so it reads in the crate, then title, artwork, subtitle and catalogue number ES-00n) and a track-list back. The vinyl is the turntable model's own record (its grooved mesh and material, converted from quantized to float geometry before scaling), with our paper label over its label on both faces at 44% of the radius. The turntable starts empty.
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

- **In the crate:** the scan's block of LPs is cut out of the mesh offline (triangles right of the Ellington sleeve, inside the walls and above the floor), so the crate holds only our sleeves plus the scanned "Mood Ellington" sleeve leaning against the left wall. Our sleeves stand toward the front and a little right of centre.
- **Turntable:** starts empty. The model's black platter disc is recoloured as a dark felt mat, so the empty platter doesn't read as a hole.
- **Overview (desktop):** intro and record procession in the left column, model credits in the bottom-right corner, crate centred-right and turned toward the deck, deck at the right. The camera looks down from above, so the sleeves (standing low in the crate, each a little further back and higher) show their title strips like a crate you flip through. It follows the pointer slightly.
- **Playing:** the liner notes take 44vw on the right. While the record is taken out and put on the deck, the camera frames the crate and the deck in the free part. Once it spins (2.5s after it was chosen), the camera rises over the turntable and looks down on it, tilted a little toward the room, framed in the free part: left of the notes on desktop, above the sheet on phones. Choosing another record brings the camera back down for the swap, then up again.
- **Phones:** the intro sits on top and the scene below. A row of sleeve links at the bottom acts as the crate's accessible menu. The liner notes become a 60svh bottom sheet, and the camera frames the scene above it.
- **Flat (no WebGL or no script):** intro, then every record's liner notes with both sides.

## Elevation & Depth

Depth is physical and only in the 3D scene: a shadow-casting lamp, a rim light, fog that starts just behind the stage (measured from the camera, so phones see the same room), soft bloom on hot highlights and a vignette. HTML surfaces are flat, with no CSS shadows.

## Motion

- Browse: one record at a time slides up about a third of its height along its own lean (so the records in front still hide its lower half). It is chosen by pointing at it in the crate, by the wheel over the scene, by the arrow keys, or by the arrows of the crate control, and stays up until another is chosen. Enter or the control's Play button plays it. Hit areas stay at the rest pose, and the browsed record's grows over its raised cover, so a click lands on the record you see.
- Play, in phases: the sleeve lifts with the vinyl hidden just behind its back (0–0.6s); the vinyl slides out of the sleeve's open side, in the sleeve's plane (0.6–1.25s); it arcs to the platter and lays flat (1.25–2.3s, flipped for Side B); the sleeve settles back into the crate standing tall (1.4–2.2s); then the record spins at 1.7 rad/s (about 16 rpm, half a real 33⅓, so the label stays readable) and the tone arm swings in.
- Return (Esc, back, or another record): the sleeve rises from its "now playing" spot; the vinyl arcs off the platter to the sleeve's open side (0–0.85s) and slides back in behind the cover (0.85–1.4s); the sleeve moves over its slot and drops straight down into it (1.35–2.3s), or stops pulled up in its slot if it is still the browsed record. The vinyl then rides hidden behind its sleeve until it unmounts, so browsing never drags it through the cover.
- `prefers-reduced-motion`: poses jump, the camera cuts, nothing drifts.

## Performance

- The canvas renders on demand. Every animation asks for the next frame only while it is still easing, so an idle page draws nothing. Pointer moves wake the loop for the parallax, and a playing record keeps it running because it spins. Frame deltas are clamped, so nothing jumps when the loop wakes.
- Pixel ratio is capped at 1.5, and the lamp's shadow map is 1024².
- Sleeves share one geometry with three draw groups (edges, cover, back) instead of six faces. Hit areas are invisible meshes: they still raycast but cost no draw call.
- A record's vinyl, its two labels and its back cover exist only from the moment it is played until it is back in its slot. A fresh page draws 9 cover canvases instead of 36 canvases.
- The crate scan stays at full detail (about 154k triangles). Aggressive simplification broke its texture along UV seams, and gentle simplification barely reduced it.

## Components

- **Record procession (desktop):** after the record label site "Not The Final Vinyl", a vertical 3D procession of sleeves fills the left column under the intro (CSS 3D, not WebGL). The centre sleeve is large and tipped (rotateZ −4°, rotateY 14°); the others recede in depth above and below (smaller, tilted back, fading), and the catalogue wraps around (`ring.ts`). Left of it, a rail: an up arrow, one tick per record (the centre one lit lime, each tick turns straight to its record) and a down arrow, so it reads as a list you can move through. Beside the centre: catalogue number and kind, the title, a Play button and a one-line hint. The track has side room (`--bleed`) because its fade mask clips anything outside its box and the tipped centre sleeve reaches past its own width. Scroll anywhere over the stage, drag the procession, or use the arrow keys to turn it, one sleeve per notch. Pointing at a sleeve pulls that record up in the crate. A click plays. The covers are the same canvases as the 3D sleeves, drawn once (`cover-art.ts`, free of three.js). It hides while a record plays. On phones the bottom row of sleeves does this job.
- **Crate, closed and open:** pointing at the 3D crate does not browse it. Closed, pointing at it draws a soft outline (postprocessing Outline over a selection) and a pointer cursor; a click opens it, the outline turns lime, and only then does pointing at a record pull it up and turn the procession to it (the records' hit areas don't raycast while closed). Escape, a click on empty space or playing a record closes it.
- **Liner notes:** bar (back to the crate, previous/next), catalogue number, title (focused on open), subtitle, Lado A / Lado B tabs (`role="tablist"`), then the side's content. Tracks are numbered A1, A2… on alternating rows. Esc closes, and the URL hash follows the playing record.
- **Primary button:** lime fill, dark label, square.
- **Text link:** bold, orange underline, with an arrow nudge on hover.

## Do's and Don'ts

- **Do** add projects as content. The catalog (`buildCatalog`) turns them into records, and its tests guard ids, tracks and theme art.
- **Do** keep every record's content available as HTML.
- **Don't** give the owner's drawings a section of their own. They are cover art.
- **Don't** add CSS shadows, gradients, glass or numbered sections.
- **Don't** light the room up. It is night, and the lamp and the sleeves carry the image.
