# Configurable Light and Dark Design System

## Context

The frontend currently uses shadcn/ui semantic color variables in
`web/src/index.css`, but the defaults, application behavior, and future
configuration boundary are not represented as a typed theme model.

The visual design must also be updated to follow `DESIGN.md`: a
high-contrast, automotive-inspired "Kinetic Precision" interface with a dark
"Telemetry Cockpit" mode and a light "Wind Tunnel Lab" mode.

This change establishes a maintainable design-token layer, applies both visual
modes across every current frontend page, and adds a user-facing mode toggle.
It must preserve the existing business behavior, API behavior, and routes.

## Goals

- Manage themeable design tokens centrally.
- Provide built-in light and dark themes based on `DESIGN.md`.
- Follow the operating-system color preference on a user's first visit.
- Persist an explicit user mode selection in `localStorage`.
- Apply the selected theme before the first React render to avoid a flash of
  incorrect theme.
- Make future backend-provided partial token overrides straightforward.
- Restyle every existing frontend page and shared UI component consistently.
- Add stable `data-test-id` attributes to frontend elements that need packaged
  application localization.

## Non-Goals

- Backend theme configuration APIs or persistence.
- An administrator-facing visual theme editor.
- Runtime schema validation for backend-provided theme JSON.
- Layout configuration such as sidebar width, spacing scales, or breakpoints.
- New font files, external font requests, or changes to the currently rendered
  font stack.
- Changes to business workflows, API contracts, or frontend routes.

## Architecture

Add a `web/src/theme` module with the following files:

- `tokens.ts`: defines the flat `ThemeTokens` model, `ThemeMode = 'light' |
  'dark'`, override types, and the CSS-variable-name mapping.
- `themes.ts`: defines the built-in light and dark token sets.
- `theme.ts`: provides token merging, CSS variable application, initial-mode
  resolution, and persistence helpers.
- `theme-provider.tsx`: exposes the active mode and toggle operation to React
  components and listens for system preference changes when appropriate.
- `theme-toggle.tsx`: provides the reusable shadcn/ui-based toggle control.
- `index.ts`: exports the stable public theme API.

`web/src/index.css` remains the Tailwind CSS 4 and shadcn/ui integration point.
It maps CSS variables into Tailwind semantic utilities and retains global base
styles. Theme defaults move into TypeScript so there is one source of truth.

Business components continue to use semantic classes such as `bg-card`,
`text-muted-foreground`, and `text-primary`. They do not concatenate CSS
variable names or manage theme storage directly.

## Design Tokens

The flat theme model includes the following categories:

- Semantic colors: background, foreground, card, card foreground, popover,
  popover foreground, primary, primary foreground, secondary, secondary
  foreground, muted, muted foreground, accent, accent foreground, destructive,
  destructive foreground, border, input, and ring.
- Material layers: low, base, high, bright, and glass surface values.
- Outlines: ghost and machined-edge outline values.
- Radius: one base radius used to derive the existing small, medium, large,
  and extra-large utilities.
- Shadows: semantic values for cards, dialogs, menus, inputs, button hover
  states, and dark-mode ambient glow.
- Fonts: sans-serif and monospace fields retained as tokens, with values that
  preserve the current rendered font behavior.

The light theme follows the `DESIGN.md` "Wind Tunnel Lab" palette:

- Cold `#f5f6f8` global surface.
- Layered sterile grey and white containers.
- `#007399` anodized cobalt primary actions.
- `#009fe3` electric-blue hover and active accents.
- Cool, crisp cast shadows.

The dark theme follows the "Telemetry Cockpit" palette:

- `#0e0e0e` global surface.
- `#1a1a1a` and `#20201f` container layers.
- `#81ecff` electric-cyan primary actions.
- `#10d5ff` deep-cyan interactive accents.
- Tinted ambient glow rather than harsh black shadows.

## Runtime Theme Flow

Before the first React render:

1. Read the stored user selection from `localStorage`.
2. If the stored value is `light` or `dark`, use it.
3. Otherwise, read `prefers-color-scheme`.
4. Apply the selected theme tokens to `document.documentElement`.
5. Add or remove the root `.dark` class to keep shadcn/ui variants compatible.

Within React, `ThemeProvider` stores the active mode and exposes a toggle
operation. When the user toggles the mode, the provider:

1. Applies the relevant complete built-in token set.
2. Synchronizes the root `.dark` class.
3. Writes the explicit mode to `localStorage`.
4. Updates React state.

When there is no explicit stored user preference, changes to
`prefers-color-scheme` update the active mode automatically. Once the user has
chosen a mode, the stored selection takes precedence.

`mergeThemeTokens(defaults, overrides)` supports future API integration. It
performs a shallow merge of known typed fields and ignores override values that
are `undefined`. `applyThemeTokens(tokens, root?)` writes a complete token set
to the provided element or to `document.documentElement` by default.

Future backend integration can validate external JSON and merge partial light
or dark overrides with the built-in themes before applying them. Runtime schema
validation is intentionally deferred until external data is introduced.

## Shared Component Restyling

The local shadcn/ui source remains the base component layer. Update it to
express the design through semantic utilities and token-backed styles:

- `Button`: strict, slightly asymmetric corners; cobalt light-mode primary
  action; cyan dark-mode primary action; cool cast hover shadow in light mode;
  diffuse cyan hover glow in dark mode.
- `Input`: fully enclosed high-surface block; hard cobalt focus outline in
  light mode; cyan outline and restrained inner glow in dark mode.
- `Card`, `Dialog`, and `DropdownMenu`: glass or layered surfaces, backdrop
  blur, material shadows, and subtle token-backed edge treatment.
- `Table`, `Tabs`, `Badge`, and `Alert`: tonal separation and spacing instead
  of avoidable one-pixel divider lines.
- Keyboard focus: retain clear focus indicators for accessibility even where
  decorative borders are removed.

The universal "No-Line" rule applies to visual sectioning: use surface shifts,
spacing, and subtle material edge treatments instead of standard solid divider
lines. Functional focus outlines remain allowed.

## Page Restyling

### Login

Use a responsive two-region layout:

- Desktop: leave the left region intentionally empty for future content.
- Desktop: place the login card in the right region with generous dead space.
- Small screens: hide the empty left region and keep the form comfortably
  usable.
- Place the theme toggle in the right region.
- Show a thin in-card progress line while login is pending.
- Do not add branding copy, decorative graphics, metrics, or background
  content to the empty left region.

### Authenticated Shell

- Use layered surfaces for the sidebar, header, and main workspace.
- Remove avoidable solid sidebar and header divider lines.
- Add the shared theme toggle to the top bar.
- Keep the current navigation structure and logout behavior.

### Projects

- Use cool layered project cards with mode-specific hover feedback.
- Preserve the current project creation interaction and project navigation.
- Render the empty state as a tonal panel rather than a dashed-border box.

### Board

- Render workflow columns as layered surface containers.
- Separate task cards with spacing and material contrast.
- Preserve all current task transition, review, testing, and archive actions.

### Delivery

- Render repositories, commits, and archives as technical data panels.
- Use tonal table-row states and spacing rather than divider lines.
- Preserve tabs, repository creation, and displayed delivery data.

### Dialogs and Shared States

- Restyle all create dialogs, loading states, and error alerts consistently.
- Preserve their current mutation behavior and query invalidation behavior.

## Test Identifiers

All new or modified frontend elements that need reliable packaged-application
localization receive stable `data-test-id` values. At minimum, include:

- Theme toggles on login and authenticated pages.
- Login left empty region, right region, card, form, inputs, submit action, and
  pending progress line.
- Authenticated sidebar, top bar, main content, navigation actions, and logout.
- Page headings, create actions, empty states, workflow columns, task cards,
  tabs, tables, and dialog forms.

Identifiers describe semantic roles and remain independent of visible Chinese
labels.

## Testing

Add focused tests for the new behavior:

- Initial mode follows `prefers-color-scheme` when storage has no selection.
- A persisted user selection takes precedence over system preference.
- Toggling persists the mode, synchronizes the root `.dark` class, and applies
  the expected CSS variables.
- System preference changes update the mode only while no explicit selection
  exists.
- Partial token overrides merge correctly and `undefined` does not replace a
  default token.
- Applying tokens writes the expected CSS variables to a supplied target
  element.
- Login and authenticated shell render stable theme-toggle identifiers.
- Login renders the left empty region and pending precision line identifiers.
- Key restyled pages render stable identifiers.

Run:

```bash
cd web && npm test
cd web && npm run build
```

## Constraints

- Prefer the existing local shadcn/ui primitives.
- Do not modify backend files as part of this implementation.
- Preserve the user's existing uncommitted API-related frontend changes.
- Do not introduce font assets or font-network dependencies.
- Do not introduce theme configuration UI beyond the light/dark toggle.
