# Material Symbol Converter

Figma plugin that converts selected icons to Google Material Symbols SVG format.

## The Problem

Figma exports SVGs in its own format — even if you designed your icon at 960×960 following Google's guidelines, the export normalizes it to a 24×24 coordinate system with standard Y-axis, wrong fill placement, and stripped Material Symbols attributes.

| Property | Figma Export | Material Symbols Spec |
|---|---|---|
| viewBox | `0 0 24 24` | `0 -960 960 960` |
| Coordinates | 24-scale | 960-scale (×40) |
| Y-axis | Standard (0 = top) | Offset (0 = bottom, -960 = top) |
| Fill | `fill="none"` on svg, color on path | `fill="#1f1f1f"` on svg, inherited by path |

Manually converting every coordinate is tedious and error-prone. This plugin does it automatically.

## How It Works

1. Select an icon frame in Figma
2. Run the plugin
3. Click **Convert Selection**
4. **Download .svg** or **Copy** the result

The plugin exports the selected node as SVG, then transforms all path coordinates from Figma's 24-scale to Google's 960-scale system with the correct viewBox, fill attributes, and negative Y offset. Multiple paths are merged into a single `<path>` element, and `fill-rule="evenodd"` is preserved when present.

## CLI Alternative

A standalone Python script is included for terminal-based conversion (no dependencies required):

```bash
# Print to stdout
python3 convert_to_material.py input.svg

# Write to file
python3 convert_to_material.py input.svg output.svg
```

## Development

```bash
npm install
npm run dev    # watch mode
npm run build  # production build
```

Import into Figma: **Plugins → Development → Import plugin from manifest** → select `manifest.json`.
