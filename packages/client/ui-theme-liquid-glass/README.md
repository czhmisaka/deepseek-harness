---
description: "The Liquid Glass theme: translucent frosted surfaces, backdrop blur, and specular borders registered as a selectable theme with a settings toggle."
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-theme-liquid-glass

English | [中文](README.zh.md)

## Summary

`@deepseek-ai/dsh-client-ui-theme-liquid-glass` registers the **liquid-glass** theme: translucent frosted surfaces, backdrop blur on the sidebar, dialogs, and floating panes, a gradient wallpaper backdrop, and specular edge highlights — all through the standard theme contract. It registers a `ThemeDefinition` (id `liquid-glass`, dark color scheme, alias-token overrides) via `ctx.theme.register`, scopes its structural effects through a `body[data-ds-glass]` attribute that follows the active theme, and offers an on/off toggle row in the settings General section. Because the alias tokens are translucent, every feature surface — chat, panels, the usage bubble — refracts automatically; feature packages need no changes.

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

-----

<a id="use-this-package"></a>
## Use this package

Mount the plugin in the web composition beside `ui-theme`; the shipped `dsh-web-app` bundle mounts it. Toggle it from **Settings → General → Liquid Glass**.

### Composition

```yaml
- name: '@deepseek-ai/dsh-client-ui-theme'
- name: '@deepseek-ai/dsh-client-ui-theme-liquid-glass'
```

### How the theme behaves

- The theme builds on the **dark** base palette (`colorScheme: 'dark'`): the glass panes are light-on-dark.
- The 13 alias tokens (backgrounds, borders, labels, brand, states, sidebar fill) are overridden with translucent values; features pick them up with no changes of their own.
- The structural effects (wallpaper gradient, `backdrop-filter` blur, specular `box-shadow` edges) live in a stylesheet scoped to `body[data-ds-glass]`, an attribute this plugin sets while its theme is active and removes on any other theme.
- The on/off choice persists in `localStorage` and is restored at mount; `ThemeRuntime` only durably persists built-in preferences, so a third-party theme keeps its own session-level persistence.

### Requirements

Glass needs something behind the panes to refract — the wallpaper gradient supplies it. On engines without `backdrop-filter` the surfaces degrade to their translucent token fills (still legible on the dark base).

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

### Source map

| File | Role |
|---|---|
| [`src/client/index.ts`](src/client/index.ts) | Theme registration, the glass scope attribute, stylesheet injection, and the toggle row |
| [`src/client/tokens.ts`](src/client/tokens.ts) | The alias-token overrides |
| [`src/client/glass.css`](src/client/glass.css) | The structural glass effects (`body[data-ds-glass]` scope) |
| [`src/client/GlassRow.tsx`](src/client/GlassRow.tsx) | The settings toggle row |

### Selector strategy

Feature components use CSS Modules with hashed class names a global sheet cannot target. The glass sheet therefore targets **structural anchors only**: the layout columns' class prefixes (`_sidebarCol_`, `_centerCol_`, `_detailsCol_`), the shell overlay's `data-shell-overlay` attribute, native `dialog` elements, and the generic `_card_`/`_panel_` module prefixes. A rename in the layout shell would need the matching prefix update here.

</details>

-----

<a id="model-experience"></a>
## Model Experience

### Token and KV Cache effects

#### What the model sees

Nothing. A theme changes presentation only: it registers a `ThemeDefinition` and sets one body attribute; it contributes no prompt section, tool, message, or session event.

#### Token effect

None. The theme adds no model requests; every figure surfaces through the existing `TokenUsage` the adapters already report.

#### KV Cache effect

None. The theme contributes no request content, so cache identity is unchanged.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>


These limits define where the theme stops and future work begins. They are current package constraints, not a comparison of theming approaches or a task backlog.

- **Dark scheme only** — the theme declares `colorScheme: 'dark'`; a light glass variant would need its own token set and is deferred.
- **Theme selection is session-persistent, not durable** — `ThemeRuntime` persists built-in preferences only, so the choice restores from `localStorage` per browser.
- **Structural selectors couple to layout class prefixes** — a layout shell class rename (e.g. `_sidebarCol_`) needs the matching prefix update in the glass sheet.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

This Dev Note is non-authoritative working context: notes for maintainers and open questions. Shipped behavior and accepted rationale live in the sections above, the package code, and the linked Agent Notes.

- The glass stylesheet is injected by the plugin (not added to `ui-theme/src/styles/`) so the effects' lifetime matches the theme registration exactly and the base theme package stays free of theme-specific structure.

</details>
