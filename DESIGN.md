---
name: Kaevron OS
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#393939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1b1c1c'
  surface-container: '#1f2020'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353535'
  on-surface: '#e4e2e1'
  on-surface-variant: '#c4c7c8'
  inverse-surface: '#e4e2e1'
  inverse-on-surface: '#303030'
  outline: '#8e9192'
  outline-variant: '#444748'
  surface-tint: '#c6c6c7'
  primary: '#ffffff'
  on-primary: '#2f3131'
  primary-container: '#e2e2e2'
  on-primary-container: '#636565'
  inverse-primary: '#5d5f5f'
  secondary: '#c7c6c6'
  on-secondary: '#303031'
  secondary-container: '#464747'
  on-secondary-container: '#b5b5b5'
  tertiary: '#ffffff'
  on-tertiary: '#313030'
  tertiary-container: '#e5e2e1'
  on-tertiary-container: '#656464'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e2e2e2'
  primary-fixed-dim: '#c6c6c7'
  on-primary-fixed: '#1a1c1c'
  on-primary-fixed-variant: '#454747'
  secondary-fixed: '#e3e2e2'
  secondary-fixed-dim: '#c7c6c6'
  on-secondary-fixed: '#1b1c1c'
  on-secondary-fixed-variant: '#464747'
  tertiary-fixed: '#e5e2e1'
  tertiary-fixed-dim: '#c8c6c5'
  on-tertiary-fixed: '#1c1b1b'
  on-tertiary-fixed-variant: '#474646'
  background: '#131313'
  on-background: '#e4e2e1'
  surface-variant: '#353535'
typography:
  display-lg:
    fontFamily: Space Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  title-md:
    fontFamily: Space Grotesk
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  mono-label:
    fontFamily: Space Grotesk
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 14px
spacing:
  base: 4px
  xs: 8px
  sm: 12px
  md: 20px
  lg: 32px
  xl: 48px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 24px
---

## Brand & Style
The design system is engineered for high-performance enterprise environments, evoking a sense of absolute control, precision, and depth. It utilizes a **Monochrome Glassmorphism** aesthetic—merging the structural rigitity of professional tooling with the ethereal depth of modern operating systems. 

The interface relies on high-contrast relationships to define hierarchy, utilizing "light-leaks" and subtle grain to prevent visual fatigue in dark environments. The emotional response is one of sophisticated utility: it is an interface that feels like a powerful instrument rather than a consumer application. Key stylistic markers include razor-sharp 1px borders, translucent layering, and a focused lack of chromatic distraction.

## Colors
This design system operates on a strict monochromatic scale to maximize clarity and reduce cognitive load during complex data analysis.

- **Surface Tiers:** Use `#000000` for the base desktop/background layer. Use `#111111` for primary application windows and containers.
- **Accents:** White (`#FFFFFF`) is reserved for high-priority interactive elements, primary text, and "glow" highlights.
- **System Boundaries:** Borders must remain consistent at `#2A2A2A` for standard separation, or low-opacity white (10-15%) for glass surfaces.
- **Functional Greys:** `#888888` is the standard for secondary information and disabled states, while `#F5F5F5` is used exclusively for light-mode popovers or high-contrast inverted callouts.

## Typography
The typographic strategy balances the technical personality of **Space Grotesk** for headings and UI markers with the supreme legibility of **Inter** for data-heavy body content.

- **Display & Headlines:** Use Space Grotesk to lean into the "OS-tech" aesthetic. Tighten letter-spacing on larger sizes to maintain a dense, premium feel.
- **Functional Labels:** Captions and labels should utilize Inter at 12px or smaller. Use the `label-md` style for sidebar headers and category titles to create a clear structural anchor.
- **Contrast:** Always use pure white text on dark surfaces. For the rare light-mode surfaces, use `#000000` with 90% opacity to maintain the "ink on paper" precision.

## Layout & Spacing
The layout follows a **Rigid Fluidity** model. While the primary OS shell (Menubar and Sidebars) is fixed, the internal content area utilizes a fluid 12-column grid.

- **The Menubar:** A fixed 32px height bar at the top of the viewport, housing system-level triggers.
- **Sidebars:** Fixed width (240px to 280px). Content within sidebars should use `spacing.sm` for vertical item lists.
- **Desktop Grid:** 12 columns, 16px gutters. Elements should snap to the grid to maintain the "enterprise-grade" alignment.
- **Mobile Reflow:** On mobile, sidebars transition to bottom-sheets or full-screen overlays. Margins reduce to 16px to maximize data density.

## Elevation & Depth
Depth is not communicated via shadows, but through **Tonal Opacity** and **Backdrop Blurs**.

1.  **Level 0 (Desktop):** Pure Black (#000000).
2.  **Level 1 (App Window):** Charcoal (#111111) with a 1px border (#2A2A2A).
3.  **Level 2 (Modals/Popovers):** Glassmorphic surfaces using a white tint at 5% opacity, a 40px backdrop blur, and a 1px white border at 15% opacity.
4.  **Interaction Glows:** Active states or focused inputs may utilize a subtle white outer glow (`0px 0px 8px rgba(255, 255, 255, 0.2)`).

A subtle, 2% opacity film grain should be applied to all Level 2 and Level 3 surfaces to provide a tactile, high-fidelity texture that reduces the clinical feel of pure digital gradients.

## Shapes
This design system employs a **Sharp Architecture**. To emphasize the professional and "unfiltered" nature of the OS, all primary containers, input fields, and windows use 0px radius corners. 

The only exception to this rule is **Pill-shaped elements** (100px radius) used exclusively for active navigation states in the sidebar and specific status chips, creating a clear visual distinction between "containers" and "interactive indicators."

## Components
- **Buttons:** Primary buttons are solid white with black text. Secondary buttons are transparent with a 1px white border. Hover states should trigger a slight inversion or an increase in border opacity.
- **Sidebar Items:** Neutral text on transparent backgrounds. The active state is a white pill-shaped background with black text, or a 2px vertical white line on the far left.
- **Data Tables:** Remove all vertical borders. Use 1px `#2A2A2A` horizontal dividers. Header rows should use `label-md` typography.
- **Cards:** Dark charcoal (`#111111`) backgrounds with a sharp 1px white border at 10% opacity. Include a "light-leak" highlight on the top edge (1px white at 30% opacity).
- **Menubar:** A semi-translucent black strip (`#000000` at 80% opacity) with a `backdrop-filter: blur(20px)`. Text is white at 14px size.
- **Input Fields:** Sharp corners, 1px `#2A2A2A` border. On focus, the border becomes pure white with a 4px soft white outer glow.