# Agent Note: Pixel ocean mode

Status: implemented

## Problem

The sea had two curves only: the data sea (zeabur) and the ghibli waves. The boss asked for a pixel-ocean mode — the same live sea rendered as retro pixel art, and it must keep the digital sea's defining property: overlapping browser windows see identical water at the same screen position.

## Decision

Buffer-resolution tricks are out: shrinking the canvas backing store and upscaling pins the pixel grid to each window's device ratio and viewport origin, which shatters cross-window continuity. The pixelation runs inside the `ui-theme-liquid-glass` embedded shader, in the coordinate system the sea is already anchored to:

- `FRAG_ZEABUR` gains `uniform float uPixel`; when 1, the sampling uv snaps to a 72×72 grid over the screen-anchored sea, so the water, the color bands, and the digit rain all flatten per cell;
- the final color is posterized to 6 levels per channel for the limited-palette look;
- `uPixel` registers in `Z_NAMES` and is pushed every frame from `activeStyle === "pixel"`; `setStyle("pixel")` routes to the zeabur program — the ghibli programs stay untouched, preserving the three-program precompiled degrade structure.

Wiring only widens existing vocabulary: `seaStyle: 'zeabur' | 'ghibli' | 'pixel'`, a fifth "Pixel ocean" entry on the settings page's Sea style row (`setMany({ seaStyle: 'pixel', seaTheme: 'dark' })`), one dictionary key per locale. The Host half's `seaStyle` was already `z.string()` — no migration.

## Alternatives considered

- **Why not a low-res backing store?** It would buy the pixel look for free but the grid would originate per-window (dpr × viewport offset) — adjacent windows would show mismatched pixels along their shared edge. Rejected for breaking the one guarantee this plugin sells.
- **A separate pixel fragment shader program?** It would duplicate the whole zeabur shader for one uniform and add a fourth compile-and-degrade path. The uniform keeps one program and one degrade chain.
- **Palette quantization with ordered dithering?** Dithering fights per-cell flat shading pixel-by-pixel. Deferred until the live look says otherwise.

## Consequences

- The pixel grid aligns across windows even on mixed-density displays (uv-based snapping), at the cost of physical pixel size tracking the sea scale — intentional.
- Two lines of GLSL plus one uniform; the precompile/degrade structure and the style-row vocabulary carry the extension without new fallback paths.
