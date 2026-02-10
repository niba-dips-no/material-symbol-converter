#!/usr/bin/env python3
"""
Convert Figma-exported SVG to Google Material Symbols format.

Usage: python convert_to_material.py input.svg [output.svg]

Transforms:
  - Scales coordinates to 960-unit system
  - Applies negative Y offset (viewBox "0 -960 960 960")
  - Merges all paths into a single <path>
  - Sets proper Material Symbols SVG attributes
"""

import re
import sys

# (params_per_group, indices_that_are_y_coords)
COMMANDS = {
    "M": (2, {1}), "L": (2, {1}), "T": (2, {1}),
    "H": (1, set()), "V": (1, {0}),
    "C": (6, {1, 3, 5}), "S": (4, {1, 3}), "Q": (4, {1, 3}),
    "A": (7, {6}),
    "Z": (0, set()),
}

# Arc command: indices 2,3,4 are angle and flags — don't scale
A_NO_SCALE = {2, 3, 4}


def tokenize(d):
    return re.findall(
        r"[A-Za-z]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?", d
    )


def transform_path(d, scale, y_offset):
    tokens = tokenize(d)
    out = []
    i = 0
    while i < len(tokens):
        t = tokens[i]
        if t.isalpha():
            cmd = t
            out.append(cmd)
            i += 1
            cu = cmd.upper()
            if cu == "Z":
                continue
            rel = cmd.islower()
            params, y_idx = COMMANDS.get(cu, (0, set()))
            if params == 0:
                continue
            while i < len(tokens) and not tokens[i].isalpha():
                for j in range(params):
                    if i >= len(tokens) or tokens[i].isalpha():
                        break
                    v = float(tokens[i])
                    if cu == "A" and j in A_NO_SCALE:
                        out.append(str(int(v)))
                    elif rel:
                        out.append(str(round(v * scale)))
                    elif j in y_idx:
                        out.append(str(round(v * scale + y_offset)))
                    else:
                        out.append(str(round(v * scale)))
                    i += 1
        else:
            i += 1
    return compact(out)


def compact(tokens):
    """Join tokens into a compact path string (no unnecessary spaces)."""
    r = ""
    for t in tokens:
        if t.isalpha():
            r += t
        elif r and r[-1].isdigit() and not t.startswith("-"):
            r += " " + t
        else:
            r += t
    return r


def convert(input_path, output_path=None):
    with open(input_path) as f:
        svg = f.read()

    # Detect source viewBox dimensions
    vb = re.search(r'viewBox="([\d.\s-]+)"', svg)
    if vb:
        parts = vb.group(1).split()
        w = float(parts[2])
    else:
        w = 24

    scale = 960 / w
    y_offset = -960

    # Extract and merge all path d attributes
    paths = re.findall(r"<path[^>]*\bd=\"([^\"]*)\"", svg)
    if not paths:
        print("Error: no <path> elements found", file=sys.stderr)
        sys.exit(1)

    combined = "".join(paths)
    transformed = transform_path(combined, scale, y_offset)

    # Preserve fill-rule="evenodd" if present in source
    has_evenodd = "evenodd" in svg
    fr = ' fill-rule="evenodd"' if has_evenodd else ""

    result = (
        '<svg xmlns="http://www.w3.org/2000/svg" height="24px" '
        'viewBox="0 -960 960 960" width="24px" fill="#1f1f1f">'
        f"<path{fr} d=\"{transformed}\"/></svg>\n"
    )

    if output_path:
        with open(output_path, "w") as f:
            f.write(result)
        print(f"Done: {output_path}")
    else:
        print(result)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} input.svg [output.svg]")
        sys.exit(1)
    convert(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None)
