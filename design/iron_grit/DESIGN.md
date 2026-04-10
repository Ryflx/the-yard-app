# Design System Strategy: Industrial High-Performance

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"Kinetic Brutalism."** 

Unlike standard "gym" templates that rely on aggressive angles and cluttered photography, this system draws inspiration from the raw, unyielding architecture of Peckham’s industrial heritage. It is a high-performance framework that prioritizes utility and haptic feedback. We achieve a premium editorial feel through a "Bento-Box" layout logic—organizing data into rigid, disciplined containers that breathe through generous internal whitespace and tonal depth. By stripping away traditional borders and relying on layered neutrals, we create a digital environment that feels as durable as a steel rack and as precise as a calibrated plate.

## 2. Colors
Our palette is rooted in the "Smoky Industrial" spectrum. We use layered neutrals to provide depth without visual noise, reserving our high-energy accents for critical performance data and user interaction.

*   **Foundation:** The base is `background` (#0e0e0e), a deep, obsidian black. We never use pure white for large blocks of text; use `on_surface_variant` (#adaaaa) for secondary info to maintain the "Gritty" persona.
*   **The "No-Line" Rule:** Explicitly prohibit the use of 1px solid borders for sectioning or card definition. Boundaries must be defined through background shifts. For example, a card using `surface_container_high` (#201f1f) should sit atop a `surface` (#0e0e0e) background.
*   **Surface Hierarchy:**
    *   `surface_container_lowest`: Backgrounds for deep-inset elements or secondary modules.
    *   `surface_container_highest`: For active cards or "lifted" interactive elements.
*   **Signature Textures:** For primary CTAs, utilize a subtle gradient from `primary` (#f3ffca) to `primary_container` (#cafd00). This provides a "Digital Texture"—a haptic, glowing feel that suggests energy and "ready" states.
*   **The "Glass" Principle:** Use `secondary_container` (#3a485b) with a 60% opacity and `backdrop-filter: blur(12px)` for floating navigation or mobile overlays to maintain a sense of environmental depth.

## 3. Typography
The typography is a study in contrast: the raw power of the heavy heading meets the surgical precision of the modern sans-serif.

*   **Display & Headlines (Space Grotesk):** This is our "Industrial Strength" face. It should be used in uppercase or tight-tracked bold weights. It mimics the heavy, architectural presence of gym equipment. Use `display-lg` (3.5rem) for hero statements to demand immediate focus.
*   **Body & Labels (Inter):** This is our "Utility" face. Inter provides maximum readability in low-light gym environments. 
*   **Hierarchy as Identity:** Use a dramatic scale jump between `headline-lg` and `body-md`. By pairing a massive, gritty headline with a small, clean, high-tracking label, we create an editorial look that feels curated rather than "templated."

## 4. Elevation & Depth
In this system, depth is earned through tone, not lines. We eschew the "material" look for a more atmospheric, "Industrial Layering."

*   **Tonal Stacking:** Instead of shadows, use the surface tiers. A `surface_container_low` section represents the floor; a `surface_container_highest` card represents a piece of equipment sitting on that floor.
*   **Ambient Shadows:** Where floating elements are required (e.g., a "Book Class" floating action button), use an extra-diffused shadow: `box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4)`. The shadow must feel like ambient occlusion, not a drop shadow.
*   **The "Ghost Border" Fallback:** For accessibility in form inputs, use a "Ghost Border." Apply `outline_variant` (#494847) at 20% opacity. It should be felt, not seen.
*   **Zero Roundedness:** All elements use `0px` border-radius. Sharp corners reinforce the "Durable/No-Nonsense" persona. Softness is a distraction; the grit is in the geometry.

## 5. Components

### Buttons (The Haptic Engine)
*   **Primary:** Background `primary_fixed` (#cafd00), Text `on_primary_fixed` (#3a4a00). No border. On hover, apply a `primary_dim` (#beee00) glow.
*   **Secondary (Industrial):** Background `surface_variant` (#262626), Text `on_surface` (#ffffff). This should feel like brushed metal.
*   **Haptic State:** On press, reduce the button scale to `0.98` to simulate physical resistance.

### Bento Cards & Lists
*   **The Bento Grid:** Group related data (e.g., Workout of the Day, Schedule, PRs) into a grid of varying container sizes.
*   **No Dividers:** Lists within cards must not use horizontal lines. Use 16px or 24px of vertical whitespace (`Spacing Scale`) to separate items.
*   **Interaction:** Cards should transition from `surface_container_high` to `surface_bright` on hover to signal interactivity.

### Inputs & Forms
*   **Style:** Minimalist underline or full-width block using `surface_container_lowest`. 
*   **States:** When focused, the "Ghost Border" becomes a high-energy `primary` (#f3ffca) 1px underline.
*   **Error:** Use `error_dim` (#d7383b) for text and `error_container` (#9f0519) for subtle background washes in the field.

### Performance Chips
*   **Action Chips:** Used for "Filter by Coach" or "Weight Class." Use `secondary_container` with `on_secondary_container` text. Square corners are mandatory.

## 6. Do's and Don'ts

### Do
*   **Do** embrace asymmetry. In a Bento Grid, let some cards span two columns while others stay small to create visual rhythm.
*   **Do** use "Intelligence-First" minimalism. Only show the most critical data (e.g., "3 Spots Left") using the `primary` accent color.
*   **Do** utilize high-quality, high-contrast black and white photography behind semi-transparent `surface` overlays.

### Don't
*   **Don't** use border-radius. Ever. This is a system of hard edges and high durability.
*   **Don't** use standard blue for links. Use `tertiary` (#e0ecff) or `primary` for all interactive triggers.
*   **Don't** use dividers or "fences" to separate content. Let the shift in `surface-container` tiers do the work.
*   **Don't** clutter the UI. If a piece of information doesn't help the athlete lift or show up, remove it.