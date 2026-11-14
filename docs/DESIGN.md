---
name: TerraLunar Science Console
colors:
  surface: '#fbf9f8'
  surface-dim: '#dbdad9'
  surface-bright: '#fbf9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3f3'
  surface-container: '#efeded'
  surface-container-high: '#e9e8e7'
  surface-container-highest: '#e4e2e2'
  on-surface: '#1b1c1c'
  on-surface-variant: '#4c4546'
  inverse-surface: '#303030'
  inverse-on-surface: '#f2f0f0'
  outline: '#7e7576'
  outline-variant: '#cfc4c5'
  surface-tint: '#5e5e5e'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1b1b1b'
  on-primary-container: '#848484'
  inverse-primary: '#c6c6c6'
  secondary: '#545f73'
  on-secondary: '#ffffff'
  secondary-container: '#d5e0f8'
  on-secondary-container: '#586377'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#390c00'
  on-tertiary-container: '#d3623a'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2e2e2'
  primary-fixed-dim: '#c6c6c6'
  on-primary-fixed: '#1b1b1b'
  on-primary-fixed-variant: '#474747'
  secondary-fixed: '#d8e3fb'
  secondary-fixed-dim: '#bcc7de'
  on-secondary-fixed: '#111c2d'
  on-secondary-fixed-variant: '#3c475a'
  tertiary-fixed: '#ffdbcf'
  tertiary-fixed-dim: '#ffb59c'
  on-tertiary-fixed: '#390c00'
  on-tertiary-fixed-variant: '#822801'
  background: '#fbf9f8'
  on-background: '#1b1c1c'
  surface-variant: '#e4e2e2'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-mono:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.04em
  metric-mono-lg:
    fontFamily: JetBrains Mono
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.02em
  metric-mono-sm:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 18px
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system establishes a high-rigor, utilitarian research environment built for planetary geologists, aerospace mission planners, and evaluation juries. The visual aesthetic fuses strict technical minimalism with aerospace telemetry: high contrast, zero ornamental fluff, and razor-sharp typographic discipline.

The aesthetic is functionalist monochrome with analytical chromatic isolation: chromatic color is entirely withheld from the chrome, navigation, and structural scaffolding, operating strictly as a calibrated data visualization layer (scientific scalar mapping, thermal/topographic fidelity, and target planetary classification). Every layout decision prioritizes high data density, spatial awareness, and rapid comparison of terrestrial analog sites against target extraterrestrial coordinates (e.g., Artemis III South Pole Shackleton rim, Lunar permanently shadowed regions, and Martian Jezero/Noachis analogs).

## Colors

The interface enforces a severe monochrome substrate with functional chromatic allocation reserved exclusively for scientific data visualization:

- **Structural Chrome & Ink:** Pure `#000000` (deep ink) and `#FFFFFF` (pure canvas). Neutral steps support interactive feedback: `#EFEFEF` (soft gray hover/substrate), `#E2E2E2` (pressed/active states), `#282828` (elevated dark surfaces), `#5E5E5E` (secondary body copy meeting WCAG AA contrast), and `#AFAFAF` (inactive/muted borders).
- **Analog Fidelity Scale (Sequential):** Used strictly for similarity index, cross-correlation coefficients, and mineralogical match confidence:
  - Low correlation / baseline: `#1E293B` (Dark Slate)
  - Medium/high correlation: `#D97706` (Amber 600)
  - Extreme peak convergence: `#FEF3C7` (Pale Cream)
- **Target Specific Tagging:** Martian terrestrial analogs leverage `#C85A32` (Mars Terracotta) exclusively for planetary tagging, spectral overlays, and mission-mode indicators. Artemis/Lunar polar mode defaults to high-contrast white-on-black telemetry.
- **Deep Viewport Canvas:** The central geospatial/3D globe viewport uses `#050508` to simulate low-albedo cislunar space.

## Typography

Typography balances rapid scanning and technical legibility under operational conditions:

- **Headings & Body:** Set in `Inter`. Headings maintain strict sentence case to preserve rapid perceptual processing without artificial visual bulk. Weights are strictly partitioned: 700 for headlines (32px, 24px, 20px), 500 for intermediate hierarchy/strong labels, and 400 for standard explanatory text (14px/16px).
- **Telemetry & Numerical Quantities:** Set in `JetBrains Mono` with OpenType `tabular-nums` (`tnum`) permanently enforced across all numeric readouts, coordinates (latitude/longitude/elevation), slope angles, reflectance metrics, and match percentages. This prevents tabular jitter during dynamic parameter filtering.
- **Dataset Attribution:** Data origins and sensor tags are set in uppercase `label-mono` with +0.04em tracking.

## Layout & Spacing

The viewport implements a multi-tier split workstation layout designed for widescreen data scrutiny:

- **Fixed Primary Navigation Sidebar (Left):** 320px fixed width on desktop, styled in `#111111` / `#000000`. Houses query inputs, mission destination toggles (Artemis III vs. Mars 2026), and geomorphological filter sliders.
- **Geospatial & 3D Telemetry Canvas (Center/Full Base):** Spans 100vw/100vh underlying the overlay layers. Background fixed to deep space black (`#050508`).
- **Floating Analytical Overlay Rail (Right):** A dynamic 380px floating stack positioned with `space-lg` margin from canvas bounds. Displays terrestrial analog telemetry (e.g., Atacama, Haughton Crater, Lanzarote, Kilauea Decant).
- **Responsive Adaptations:**
  - *Desktop (>1200px):* 3-tier view with persistent black sidebar, central 3D viewport, and floating right analytics stack.
  - *Tablet (768px - 1199px):* Left sidebar collapses into an expandable left drawer; right card deck converts to a swipeable bottom sheet docked at 40vh.
  - *Mobile (<768px):* Central viewport fills viewport with full-bleed touch controls; metrics access handled via modal bottom sheet overlays using `margin` 1rem.

## Elevation & Depth

Depth is defined through sharp tonal juxtaposition and controlled ambient dispersion, avoiding synthetic physical skeumorphism:

- **Level 0 (Space Canvas):** `#050508`, zero elevation. Houses point clouds, orbital overlays, and digital elevation models (DEMs).
- **Level 1 (Structural Rail):** `#111111` solid backdrop, no shadow, bounded by a 1px crisp `#282828` border on the inner dividing edge.
- **Level 2 (Floating Science Cards):** Pure `#FFFFFF` surface floating over the dark central canvas. Elevated via a calibrated ambient shadow: `box-shadow: 0 4px 16px rgba(0, 0, 0, 0.16)`. Border is a subtle 1px `#E2E2E2` boundary.
- **Level 3 (Epistemic Warning Tier - "Limits of Analogy"):** Inverted dark obsidian surface (`#18181B`) with high-contrast pure white text, bounded by a 1px `#282828` stroke and floating with `0 6px 20px rgba(0, 0, 0, 0.32)`. Signals clear geological boundary parameters (e.g., 1g vs. 1/6g gravity limitations, presence of atmosphere, lack of micrometeorite space weathering).

## Shapes

The design system implements a deliberate structural dichotomy between interactive controls and container surfaces:

- **Interactive Elements (Pill Form):** All action buttons, filter tags, planetary selectors, and segment controls utilize `rounded-full` (999px radius). This delivers maximum click/touch ergonomics and immediate visual affordance against dense data grids.
- **Information Enclosures (Cards):** All floating cards, telemetry panels, and data dialogs use a rigid `rounded-2xl` (16px / 1rem radius) to frame scientific figures cleanly without softening analytical edges.
- **Internal Micro-Containers:** Metric chips, data value cells, and sensor badges use `rounded-md` (6px) to maximize internal surface area for tabular typography.

## Components

### Buttons & Interactive Controls
- **Primary Action:** Pill (`rounded-full`), `#000000` background, `#FFFFFF` text, 40px height, horizontal padding 20px. Hover: `#282828`. Active/Pressed: `#E2E2E2` with `#000000` text.
- **Secondary Action:** Pill, `#FFFFFF` background, 1px border `#E2E2E2`, `#000000` text. Hover: `#EFEFEF`.
- **Target Planetary Toggle:** Segmented pill container in `#111111` with two interactive states:
  - *Lunar Artemis Mode:* High-contrast black/white pill with bold tabular coordinates.
  - *Mars Mode:* Active pill marked with `#C85A32` indicator dot and border highlight.

### Chips & Filter Tags
- Height 28px, pill shape (`rounded-full`), monospace font size 12px.
- Inactive: `#EFEFEF` background, `#5E5E5E` label.
- Active Data Filter: `#000000` background, `#FFFFFF` label.
- Scientific Scalar Chip: Outlined 1px `#AFAFAF`, with a 6px circular dot filled with the similarity gradient step (`#1E293B`, `#D97706`, or `#FEF3C7`).

### Input Fields & Search Bars
- Pill shape (`rounded-full`), 44px height, `#FFFFFF` fill with 1px `#E2E2E2` border.
- Text: `#000000`, 14px `Inter`. Placeholder: `#AFAFAF`.
- Focused state: 2px solid `#000000` outline, 0px shadow blur.

### Standard Telemetry Card
- Surface: `#FFFFFF`, `rounded-2xl` (16px), 1px border `#E2E2E2`, shadow `0 4px 16px rgba(0, 0, 0, 0.16)`.
- Internal padding: 20px (`space-lg`).
- Content hierarchy: Top bar with site name and target match chip, tabular comparison matrix (e.g., Basaltic Regolith Grain Size, Dielectric Constant, Thermal Inertia), and sensor source footer.

### "Limits of Analogy" Card (Mandatory Component)
- Surface: `#18181B` (Black Obsidian), `rounded-2xl`, 1px border `#282828`.
- Headline: 14px bold uppercase `Inter`, `#FFFFFF`.
- Content: `#AFAFAF` text detailing critical divergences where the terrestrial site fails the lunar/Martian model (e.g., "Atmospheric oxidation present", "Hydrological weathering overprint", "Terrestrial gravity 9.81 m/s²").
- Prominent indicator badge: Monospace "EPISTEMIC BOUNDARY // NON-ANALOGOUS REGIME".

### Telemetry / Mock Data Banner
- Fixed utility banner across top of interface or viewport edge: 28px height, `#000000` background, `#FFFFFF` mono-text (11px).
- Explicit technical source tags: `DATA SOURCES: LRO LOLA (0.5m DEM) | TERRA/AQUA MODIS | MARS GLOBAL SURVEYOR MOLA // SIMULATED FOR EVALUATION PURPOSES ONLY`.
- Strict absence of official agency insignias, logos, or flags, relying strictly on scientific data source notations.

## Adaptación para TerraLunar (D-014)

Sistema propuesto por el equipo (reemplaza al aeroespacial de D-012). Cómo se aplica en el código:

- **Tokens** en `web/src/index.css`: `space` `#050508` (lienzo), `rail` `#111111` (barra lateral), `elevated`
  `#282828`, `obsidian` `#18181B` (tarjeta de límites), `mars` `#C85A32`, escala de similitud `sim-low`
  `#1E293B` → `sim-mid` `#D97706` → `sim-high` `#FEF3C7` (también en el mapa, `MapView.tsx`).
- **Letra:** Inter para títulos y texto (oración, sin mayúsculas forzadas) y JetBrains Mono con cifras
  tabulares para números, coordenadas y rótulos de fuentes (`label-mono`, `metric`). Excepción: la
  marca TERRALUNAR de la portada y de la barra superior va en mayúsculas.
- **Textos en español:** la insignia de la tarjeta de límites dice "Régimen no análogo" y el banner dice
  "Datos de prueba" con las fuentes reales que usa la app.
- **Fuentes del banner:** solo las que la app usa de verdad (MODIS, GPM IMERG, NASADEM, LRO LOLA,
  MOLA). No se copian resoluciones de ejemplo de las maquetas (p. ej. "LOLA 0,5 m").
- **Lo que NO se toma de las maquetas:** valores inventados (porcentajes, "Hurst", "FID"), el estado
  "TELEMETRY ONLINE", el ícono de usuario (no hay login), entradas de menú que no existen, la insignia
  con el nombre de la agencia y las imágenes generadas. La app muestra solo sus datos.

## Ajuste orgánico (D-017)

Sobre lo anterior se suavizó el sistema: papel `#F3F1EC` en vez de blanco puro y tinta `#16161A` en
vez de negro, grises cálidos (`#615E58` sobre papel, `#A39E95` sobre oscuro), Marte `#C4704F`, lienzo
`#0B0C10`, tarjetas de 22 px, sombras difusas en capas, transiciones de 250 ms y foco visible suave.
Una sola familia, **Plus Jakarta Sans**, con cifras tabulares para números y coordenadas (reemplaza a
Inter + JetBrains Mono). Los rótulos chicos en mayúsculas usan esa misma letra (600, 11 px, +0,07em).

