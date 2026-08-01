---
name: "Eagle’s Dominion Synergy Assembly"
description: "A premium editorial-cinematic church gateway built from distinct human, practical, and Scripture-led scenes."
colors:
  hero-night: "#05070d"
  midnight: "#070913"
  navy: "#171653"
  indigo: "#29246f"
  ivory: "#f3f0e7"
  paper: "#fbfaf6"
  ink: "#15162a"
  white: "#f8f8f5"
  amber: "#e0a955"
  muted: "#686779"
  hero-foreground: "#f4f2f7"
typography:
  display:
    fontFamily: "Manrope, sans-serif"
    fontSize: "clamp(3rem, 5.4vw, 5.75rem)"
    fontWeight: 760
    lineHeight: 0.96
    letterSpacing: "-0.04em"
  editorial:
    fontFamily: "Newsreader, serif"
    fontSize: "clamp(1.65rem, 2.6vw, 2.8rem)"
    fontWeight: 430
    lineHeight: 1.16
    letterSpacing: "-0.026em"
  title:
    fontFamily: "Manrope, sans-serif"
    fontSize: "clamp(1.75rem, 3vw, 3.25rem)"
    fontWeight: 760
    lineHeight: 1
    letterSpacing: "-0.035em"
  body:
    fontFamily: "Manrope, sans-serif"
    fontSize: "clamp(1rem, 1.25vw, 1.125rem)"
    fontWeight: 475
    lineHeight: 1.62
    letterSpacing: "-0.012em"
  label:
    fontFamily: "Manrope, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.04em"
  hero-display:
    fontFamily: "Outfit, sans-serif"
    fontSize: "clamp(3rem, 5.4vw, 5.75rem)"
    fontWeight: 650
    lineHeight: 0.94
    letterSpacing: "-0.035em"
rounded:
  square: "0px"
spacing:
  action-gap: "0.75rem"
  control-inline: "1rem"
  mobile-gutter: "1.25rem"
  cluster-gap: "1.5rem"
  scene-gap: "2.5rem"
  scene-block-min: "5rem"
components:
  hero-action-primary:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
    padding: "0.75rem 1rem"
    height: "2.75rem"
  hero-action-secondary:
    backgroundColor: "rgba(7, 9, 19, 0.28)"
    textColor: "{colors.white}"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
    padding: "0.75rem 1rem"
    height: "2.75rem"
  navigation-visit:
    backgroundColor: "transparent"
    textColor: "{colors.white}"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
    padding: "0 1.1rem"
    height: "2.75rem"
    width: "5.75rem"
  scene-button-dark:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.white}"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
    padding: "0.9rem 1.15rem"
    height: "3rem"
  scene-button-light:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
    padding: "0.9rem 1.15rem"
    height: "3rem"
  social-action:
    backgroundColor: "transparent"
    textColor: "{colors.navy}"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
    padding: "0.75rem 1rem"
    height: "3rem"
    width: "7.75rem"
  scripture-plaque:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.white}"
    typography: "{typography.editorial}"
    rounded: "{rounded.square}"
    padding: "2.25rem 2.75rem"
  quick-access:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
    padding: "1.15rem 2.25rem"
    height: "6.5rem"
---

# Design System: Eagle’s Dominion Synergy Assembly

## Overview

**Creative North Star: "The Editorial Sanctuary"**

The Editorial Sanctuary combines the gravity of a midnight worship space with the clarity of a premium editorial publication. Distinct scenes shift between navy-black atmosphere, ivory and paper utility, amber warmth, and vivid human photography, so the experience feels cinematic without obscuring service information or the next action.

The system is premium through restraint: flat tonal layers, near-square compositions, disciplined type, compact controls, and carefully placed Scripture. Manrope carries navigation, display, body, and utility work; Newsreader introduces a spiritual editorial cadence; Outfit belongs only to the approved opening hero. Real EDSA people and places provide emotion and proof rather than generic church imagery.

Motion creates continuity, never meaning. The opening sequence may be immersive and the preaching stage may use restrained depth on capable desktop devices, while every other state remains complete, legible, and composed without animation.

**Key Characteristics:**

- Distinct editorial scenes joined by a controlled midnight, navy, paper, ivory, and amber palette.
- Real human photography in squared or near-square crops, with scrims used only for legibility.
- Dense display typography balanced by compact, practical action hierarchy.
- Flat tonal layering and deliberate overlap instead of decorative shadow stacks.
- Restrained, interruptible motion with static mobile, coarse-pointer, and reduced-motion compositions.

## Colors

The palette moves between nocturnal worship atmosphere and warm editorial clarity, with amber used as a rare humanizing signal.

### Primary

- **Gateway Navy** (`#171653`): the authoritative action, Scripture-plaque, icon, and emphasis color on pale scenes.
- **Ceremonial Indigo** (`#29246f`): a deeper interactive or tonal variation when Gateway Navy needs separation without changing hue family.

### Secondary

- **Witness Amber** (`#e0a955`): a restrained warmth for Scripture citations, small signals, and generational energy rather than a default action color.

### Neutral

- **Hero Night** (`#05070d`): the approved opening-sequence ground and the deepest cinematic transition tone.
- **Midnight** (`#070913`): post-hero dark scenes, navigation, footer, and image scrim foundations.
- **Ivory Scene** (`#f3f0e7`): warm editorial scene and inset-panel ground.
- **Paper** (`#fbfaf6`): the clearest utility and visit surface.
- **Ink** (`#15162a`): primary copy and high-contrast dark text on pale scenes.
- **Soft White** (`#f8f8f5`): post-hero light text and filled light actions.
- **Hero Light** (`#f4f2f7`): the approved hero’s light foreground, kept separate from the post-hero white.
- **Muted Utility** (`#686779`): secondary practical information on paper and ivory.

### Named Rules

**The Scene Contrast Rule.** Adjacent scenes must change tone, composition, or photographic density clearly enough to feel intentional while remaining part of the same navy-led world.

**The Amber Restraint Rule.** Amber is a moment of warmth or witness, not the default button, body-text, or navigation color.

## Typography

**Display Font:** Manrope (with sans-serif fallback)  
**Body Font:** Manrope (with sans-serif fallback)  
**Editorial Font:** Newsreader (with serif fallback)  
**Approved Hero Font:** Outfit (with sans-serif fallback)

**Character:** Manrope supplies contemporary authority and practical precision; Newsreader slows the cadence for Scripture and selected declarations. Outfit preserves the approved opening sequence without leaking into the rest of the system.

### Hierarchy

- **Display** (760, `clamp(3rem, 5.4vw, 5.75rem)`, 0.96): scene headings with compressed leading and strong negative tracking.
- **Editorial** (430, `clamp(1.65rem, 2.6vw, 2.8rem)`, 1.16): Scripture plaques, italic declarations, and reflective phrases.
- **Title** (760, `clamp(1.75rem, 3vw, 3.25rem)`, 1): photographic chapter titles and intermediate scene beats.
- **Body** (475, `clamp(1rem, 1.25vw, 1.125rem)`, 1.62): explanatory prose kept around 54–61 characters wide where the composition permits.
- **Label** (800, `0.75rem`, `0.04em`, uppercase where practical): service metadata and compact utility labels.
- **Hero Display** (650, `clamp(3rem, 5.4vw, 5.75rem)`, 0.94): Outfit-only typography inside the approved hero.

### Named Rules

**The Three-Voice Rule.** Manrope owns the interface and post-hero hierarchy, Newsreader is reserved for Scripture and selected editorial phrases, and Outfit appears only inside the approved hero.

**The Editorial Phrase Rule.** Newsreader should punctuate a Manrope-led composition; it must not become the default body or navigation face.

## Layout

The scene canvas is capped at 90rem for the shipped post-hero system, with 82rem used for more focused introductions and 96rem used when a photographic stage needs extra breadth. Desktop scenes commonly use a 12-column grid with deliberate overlap, uneven spans, or offset media rather than a repeated centered-card layout.

Primary desktop scene padding begins at 5rem and expands fluidly toward 8–9rem; the mobile gutter is 1.25rem. At 900px and below, multi-column scenes become linear static compositions, photographic stages stack, and the utility rail becomes a two-column grid. At 560px and below, hero actions stack and visit actions become a compact grid. Desktop navigation appears at 1180px; smaller viewports use the modal navigation panel. The 240px hardening rules preserve a single readable column without horizontal overflow.

Photography is treated as structural layout: square source images are cropped into tall, broad, or near-square frames, then paired asymmetrically with copy. Essential meaning remains in normal document flow; no layout should require a scroll animation to reveal its content.

## Elevation & Depth

The system has no general-purpose elevation shadow scale. Depth comes from tonal scene changes, image scrims, overlap, sticky staging, restrained perspective in the preaching sequence, and the navigation’s translucent midnight layer. Text shadow is limited to hero or image-legibility cases; borders and color shifts communicate ordinary interactive state.

**The Flat-by-Default Rule.** Surfaces rest on one plane; use tonal contrast, overlap, or a one-pixel divider before reaching for a shadow.

## Shapes

The form language is square. Buttons, navigation actions, utility cells, plaques, image stages, and photographic chapters use zero-radius corners. Images are clipped into squared or near-square frames, while one-pixel dividers and inset outlines provide structure without softening the silhouette.

**The Square Form Rule.** Do not introduce rounded cards, pills, or capsule actions into this system; hierarchy comes from proportion, contrast, and placement.

## Components

### Actions

Actions are compact, rectangular, and typographically firm.

- **Hero Primary:** Soft White fill with Ink text, a 1px white border, 0.75rem × 1rem padding, and a 2.75rem minimum height.
- **Hero Secondary:** translucent Midnight fill with Soft White text and a restrained light border at the same height.
- **Scene Dark / Light:** Gateway Navy on Soft White or Soft White on Ink, with 0.9rem × 1.15rem padding and a 3rem minimum height.
- **Social:** transparent paper surface, Gateway Navy text, a subtle 1px border, and a 3rem minimum height.
- **States:** hover may lift 2px on fine pointers; active compresses to 0.97 scale; focus uses a 2px current-color outline with 4px offset. Reduced motion removes transforms.

**The Compact Action Rule.** One filled action leads; secondary actions remain outlined or text-led and must not compete with it in weight.

### Navigation

The fixed header is 4.25rem on desktop and 3.75rem on smaller viewports. It uses translucent Midnight with an 18px backdrop blur after the opening, becomes a gradient over the hero, and keeps the EDSA wordmark compact. Desktop links use quiet Soft White; the active link gains a 1px underline and Visit becomes the bordered primary action. Below 1180px, navigation moves into a full-height native dialog with large separated links.

### Quick Access Rail

The practical rail is a flat Paper surface: four equal cells on desktop, two columns on mobile, with small line icons, uppercase labels, muted values, and 1px dividers. It is intentionally denser than the surrounding scenes so times, location, and directions can be scanned immediately.

### Scripture Plaques

Scripture is a signature editorial component. Newsreader carries the verse, Manrope carries the uppercase citation, and a Navy plaque may overlap an Ivory photographic composition. Dark scenes can use unboxed Scripture in Soft White with amber citations; the text remains in normal flow even when a short reveal transition is enabled.

### Photographic Chapters

Experience chapters and image stages use real EDSA photography, zero-radius clipping, and bottom scrims only where copy overlays the image. Fine-pointer hover may scale a chapter image to 1.025 over 900ms; reduced-motion and touch compositions remain static.

### Visit Details

Service rows pair a small Navy icon with compact metadata and a large Newsreader time. Thin dividers separate rows, the address remains plain and scannable, and one filled Directions action leads the social actions.

### Footer

The footer returns to Midnight and combines a large Manrope wordmark, a small italic Newsreader slogan, amber location icon, quiet service details, and compact links. It stays a utility scene, not another narrative climax.

## Do's and Don'ts

### Do:

- **Do** build pages as a sequence of visibly distinct scenes held together by the same type roles and navy-led palette.
- **Do** use real EDSA people, worship, teaching, children, and place photography in intentional square or near-square crops.
- **Do** keep one filled action visually primary and make service information immediately scannable.
- **Do** preserve complete static compositions for mobile, coarse pointers, loading failure, and reduced motion.
- **Do** use Manrope for practical clarity and reserve Newsreader for Scripture or a selected editorial phrase.

### Don't:

- **Don't** introduce rounded cards, pill buttons, soft dashboard panels, or decorative shadow stacks.
- **Don't** let Outfit escape the approved hero or let Newsreader become the default interface face.
- **Don't** reuse a photograph within the same narrative surface or substitute generic stock-spiritual imagery for real human evidence.
- **Don't** make meaning, service information, or an action depend on animation, hover, or pointer depth.
- **Don't** flood the interface with amber; its rarity gives it warmth and authority.
