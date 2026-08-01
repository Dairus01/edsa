# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary audience is a first-time visitor considering Eagle’s
Dominion Synergy Assembly. They need to understand what EDSA is, see
service times and directions immediately, and feel confident planning a
visit without reading an exhaustive institutional history.

## Product Purpose

The website introduces EDSA as a Christ-centred church through concise
organisation-level content, real church photography, and distinct
editorial scenes. It acts as a ministry gateway: understand the church,
experience its worship and teaching, find a current location, and take a
clear next step. Success means a visitor can act as well as understand.

## Operating Context

EDSA currently gathers at 107 Okpe Road, opposite Odebala Plaza,
Sapele, Delta State 331107, Nigeria. Sapele is a location record, not a
permanent boundary on the organisation identity. The supplied Sunday
service time is 8:00 PM and requires confirmation before public launch.
The Wednesday gathering is at 5:00 PM.

## Capabilities and Constraints

- The approved Phase 1 restoration hero is immutable unless later
  integration proves a defect.
- The homepage after the hero is a concise sequence of quick access,
  identity, experience, teaching, generations, visit, invitation, and
  footer scenes.
- Church facts, locations, homepage copy, Scripture, and image usage are
  centralized in `src/content`.
- Location-specific UI must derive from `locations.ts` so additional
  locations do not require redefining EDSA.
- No denomination, official doctrine, pastor identity, mission
  statement, founding date, miracle claim, healing guarantee, or
  supernatural promise has been confirmed.
- The supplied Sunday time must remain exactly “8:00 PM” until the
  church confirms or corrects it.

## Brand Commitments

- Name: Eagle’s Dominion Synergy Assembly
- Short name: EDSA
- Slogan: Nothing Missing. Nothing Broken.
- Official logo assets live in `public/brand`.
- The approved identity uses deep navy-black atmosphere, white and navy
  branding, restrained amber warmth, and real church photography.
- Manrope is the post-hero display, body, navigation, and utility voice.
  Newsreader is reserved for Scripture and selected editorial phrases.
  Outfit remains scoped to the approved hero.
- Photography creates emotion, words create meaning, motion creates
  continuity, and semantics create understanding.

## Evidence on Hand

The repository contains the approved desktop and mobile hero sequences,
official logo files, and real photographs of the building, worship,
community, children, and preaching under `public/images`. No approved
pastor biography, denomination, doctrinal statement, founding history,
or independently verified testimonial is on hand and none may be
fabricated.

## Product Principles

- Explain the community plainly enough for a first-time visitor.
- Put service information, directions, and visit actions near the
  beginning rather than behind long narrative copy.
- Keep organisation identity independent from any one city while making
  current locations concrete and useful.
- Let real people and real words carry the story together.
- Keep factual and theological claims careful, passionate, and honest.
- Use motion to reveal meaning without competing with the hero.
- Preserve accessibility and performance as part of the experience.

## Accessibility & Inclusion

The experience must remain semantic, keyboard reachable, readable with
200% text sizing, free of horizontal overflow, and complete without
motion. Scroll and pointer effects must disable for reduced-motion and
touch/coarse-pointer users, and no information may depend on animation.
