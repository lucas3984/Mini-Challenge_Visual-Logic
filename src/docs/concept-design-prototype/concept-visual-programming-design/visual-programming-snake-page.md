---
name: Logic Bloom
colors:
  surface: '#131316'
  surface-dim: '#131316'
  surface-bright: '#39393d'
  surface-container-lowest: '#0e0e11'
  surface-container-low: '#1b1b1f'
  surface-container: '#201f23'
  surface-container-high: '#2a292d'
  surface-container-highest: '#353438'
  on-surface: '#e5e1e6'
  on-surface-variant: '#c7c5d0'
  inverse-surface: '#e5e1e6'
  inverse-on-surface: '#313034'
  outline: '#918f9a'
  outline-variant: '#46464f'
  surface-tint: '#c0c2fc'
  primary: '#c0c2fc'
  on-primary: '#292b5c'
  primary-container: '#8a8cc3'
  on-primary-container: '#222455'
  inverse-primary: '#575a8d'
  secondary: '#47f2e1'
  on-secondary: '#003732'
  secondary-container: '#00d5c5'
  on-secondary-container: '#005750'
  tertiary: '#bec6e3'
  on-tertiary: '#273047'
  tertiary-container: '#8890ac'
  on-tertiary-container: '#212940'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e1e0ff'
  primary-fixed-dim: '#c0c2fc'
  on-primary-fixed: '#131546'
  on-primary-fixed-variant: '#404274'
  secondary-fixed: '#53fae9'
  secondary-fixed-dim: '#23ddcd'
  on-secondary-fixed: '#00201d'
  on-secondary-fixed-variant: '#005049'
  tertiary-fixed: '#dae2ff'
  tertiary-fixed-dim: '#bec6e3'
  on-tertiary-fixed: '#121b31'
  on-tertiary-fixed-variant: '#3e465f'
  background: '#131316'
  on-background: '#e5e1e6'
  surface-variant: '#353438'
typography:
  h1:
    fontFamily: Space Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  h2:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
  h3:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.2'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '500'
    lineHeight: '1.5'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-caps:
    fontFamily: Space Grotesk
    fontSize: 14px
    fontWeight: '700'
    lineHeight: '1.0'
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  grid-gutter: 12px
  safe-margin: 20px
---

## Brand & Style

The design system is centered on a **Tactile-Playful** aesthetic, merging the precision of logic puzzles with the high-energy feedback of modern mobile gaming. The emotional response is one of "satisfying clarity"—where every correct placement feels physically impactful. 

The style utilizes a **Modern-Skeuomorphic** approach: elements aren't just flat shapes; they are digital "toys" with weight, depth, and luminosity. We move away from corporate sterility by using thick, colored shadows instead of neutral greys, and by treating the interface as a physical game board. High-energy micro-interactions—like bouncing transitions and pulsing glows—ensure the player feels a constant sense of progression and delight.

## Colors

The palette balances the calm, intellectual tones of Lavender and Periwinkle with the high-voltage energy of Turquoise. 

- **Primary & Secondary:** Lavender Grey (#8789C0) serves as the structural base for most puzzle elements, while Turquoise (#45F0DF) is reserved for "Success" states, active logic paths, and primary "Play" actions.
- **Accents:** Periwinkle (#C2CAE8) provides soft contrast for secondary UI elements and inactive states.
- **Depth:** Space Indigo (#111D4A) is the anchor, used for deep backgrounds and high-contrast shadows to make the lighter puzzle pieces "pop."
- **Gradients:** Use linear gradients (top-down) from `#8789C0` to `#8380B6` to give blocks a subtle 3D curvature.

## Typography

This design system uses a high-contrast typographic pairing to distinguish between "Game Meta" and "Instructional Data."

- **Headlines (Space Grotesk):** Its geometric, quirky terminals reinforce the logical yet futuristic feel of the game. Use it for score displays, level titles, and big "Victory" modals.
- **Body (Inter):** Chosen for its extreme legibility at small sizes. This is used for settings, tutorial text, and tooltips where clarity is paramount.
- **Styling:** For H1 and H2, apply a subtle text-shadow using the Secondary color at low opacity to create a "glowing" effect on Dark Mode backgrounds.

## Layout & Spacing

The layout philosophy follows a **Contextual Grid** model. While the meta-UI (menus, HUD) follows a standard 12-column structure, the game board itself uses a rigid "Puzzle Unit" spacing logic where all elements are multiples of 8px.

- **Game Board:** Elements are packed tightly with `spacing.sm` (8px) gutters to feel like a cohesive machine.
- **Interface:** Use generous `spacing.xl` (32px) margins for main containers to ensure the game board remains the focal point.
- **Patterns:** Backgrounds should feature a repeating geometric "blueprint" or "dot-grid" pattern using a 5% opacity version of the Primary color to add texture without distracting the player.

## Elevation & Depth

In this design system, depth is not simulated with realistic grey shadows, but with **Hard-Edged Color Offsets** and **Luminance**.

- **Puzzle Pieces:** Use a 4px offset shadow (bottom-right) in Space Indigo (#111D4A) to give pieces "weight."
- **Active States:** When a piece is selected or correctly placed, add an outer glow (8px blur) using the Turquoise secondary color.
- **Layering:** 
  - Level 0: Background with geometric pattern.
  - Level 1: "Socket" or "Slot" (Inset shadow, slightly darker than background).
  - Level 2: Game Piece (Drop shadow, gradient fill).
  - Level 3: Modals and Pop-ups (16px colored shadow, high-blur backdrop-filter).

## Shapes

The shape language is defined by the **ROUND_TWELVE** (12px) standard. This specific radius creates a friendly, toy-like feel that avoids the "sharpness" of technical tools but retains more structure than a "pill" shape.

- **Puzzle Blocks:** Every block must use the 12px radius on exterior corners. For interlocking "Tetris-style" pieces, interior corners should be slightly tighter (8px) to visually "nest" together.
- **The "Puzzle Edge":** Give cards and blocks a subtle 1.5px inner-stroke (top and left only) in a lighter shade of the fill color to simulate a beveled edge.

## Components

### Buttons
Buttons are 3D "Squishy" elements. They feature a thick bottom border (4px) to simulate depth. On click, the button should translate 2px downward, and the shadow should shrink, creating a physical "press" sensation.
- **Primary:** Turquoise fill, White text, Dark Turquoise bottom-shadow.
- **Secondary:** Lavender fill, White text, Space Indigo bottom-shadow.

### Puzzle Blocks (The "Pieces")
Pieces are the core component. They must feature:
- A subtle linear gradient.
- A "thick" 4px shadow in Space Indigo.
- A `bounce` micro-interaction when dropped into a valid slot.
- A `pulse` glow effect when they are part of a completed logic string.

### Progress Bars
Avoid thin lines. Use thick, 16px height bars with 12px roundedness. The "fill" should be a Turquoise-to-White gradient that looks like it's glowing.

### Modals & Cards
Cards should use a `backdrop-filter: blur(10px)` when appearing over the game board. Use a 2px solid border in Periwinkle to define the boundary. 

### Icons
Icons must be "Chunky" and stylized. Use 2.5pt stroke weights with rounded caps and joins. Avoid thin, hairline icons; icons should look like they could be physical stamps or plastic pieces.