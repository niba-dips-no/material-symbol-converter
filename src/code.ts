figma.showUI(__html__, { width: 400, height: 320 });

// (params_per_group, y_indices)
const COMMANDS: Record<string, [number, Set<number>]> = {
  M: [2, new Set([1])],
  L: [2, new Set([1])],
  T: [2, new Set([1])],
  H: [1, new Set()],
  V: [1, new Set([0])],
  C: [6, new Set([1, 3, 5])],
  S: [4, new Set([1, 3])],
  Q: [4, new Set([1, 3])],
  A: [7, new Set([6])],
  Z: [0, new Set()],
};

const A_NO_SCALE = new Set([2, 3, 4]);

function tokenize(d: string): string[] {
  return d.match(/[A-Za-z]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) || [];
}

function transformPath(d: string, scale: number, yOffset: number): string {
  const tokens = tokenize(d);
  const out: string[] = [];
  let i = 0;

  while (i < tokens.length) {
    const t = tokens[i];
    if (/[A-Za-z]/.test(t)) {
      const cmd = t;
      out.push(cmd);
      i++;
      const cu = cmd.toUpperCase();
      if (cu === "Z") continue;
      const rel = cmd === cmd.toLowerCase() && cmd !== "z";
      const entry = COMMANDS[cu];
      if (!entry) continue;
      const [params, yIdx] = entry;
      if (params === 0) continue;

      while (i < tokens.length && !/[A-Za-z]/.test(tokens[i])) {
        for (let j = 0; j < params; j++) {
          if (i >= tokens.length || /[A-Za-z]/.test(tokens[i])) break;
          let v = parseFloat(tokens[i]);
          if (cu === "A" && A_NO_SCALE.has(j)) {
            out.push(String(Math.round(v)));
          } else if (rel) {
            out.push(String(Math.round(v * scale)));
          } else if (yIdx.has(j)) {
            out.push(String(Math.round(v * scale + yOffset)));
          } else {
            out.push(String(Math.round(v * scale)));
          }
          i++;
        }
      }
    } else {
      i++;
    }
  }
  return compact(out);
}

function compact(tokens: string[]): string {
  let r = "";
  for (const t of tokens) {
    if (/[A-Za-z]/.test(t) && t.length === 1) {
      r += t;
    } else if (r && /\d$/.test(r) && !t.startsWith("-")) {
      r += " " + t;
    } else {
      r += t;
    }
  }
  return r;
}

function convertSvg(svgString: string): string {
  // Extract viewBox width
  const vbMatch = svgString.match(/viewBox="([\d.\s-]+)"/);
  let w = 24;
  if (vbMatch) {
    const parts = vbMatch[1].trim().split(/\s+/);
    w = parseFloat(parts[2]);
  }

  const scale = 960 / w;
  const yOffset = -960;

  // Extract all path d attributes
  const paths: string[] = [];
  const pathRegex = /<path[^>]*\bd="([^"]*)"/g;
  let match;
  while ((match = pathRegex.exec(svgString)) !== null) {
    paths.push(match[1]);
  }

  if (paths.length === 0) {
    throw new Error("No <path> elements found in SVG");
  }

  const combined = paths.join("");
  const transformed = transformPath(combined, scale, yOffset);

  // Check for evenodd
  const hasEvenodd = svgString.includes("evenodd");
  const fr = hasEvenodd ? ' fill-rule="evenodd"' : "";

  return (
    '<svg xmlns="http://www.w3.org/2000/svg" height="24px" ' +
    'viewBox="0 -960 960 960" width="24px" fill="#1f1f1f">' +
    `<path${fr} d="${transformed}"/></svg>`
  );
}

async function processSelection() {
  const selection = figma.currentPage.selection;

  if (selection.length === 0) {
    figma.ui.postMessage({ type: "error", message: "Select an icon frame first" });
    return;
  }

  if (selection.length > 1) {
    figma.ui.postMessage({ type: "error", message: "Select only one node" });
    return;
  }

  const node = selection[0];

  try {
    const svgBytes = await node.exportAsync({ format: "SVG" });
    const svgString = String.fromCharCode(...svgBytes);
    const result = convertSvg(svgString);

    figma.ui.postMessage({
      type: "result",
      svg: result,
      name: node.name,
    });
  } catch (err: any) {
    figma.ui.postMessage({
      type: "error",
      message: err.message || "Export failed",
    });
  }
}

figma.ui.onmessage = async (msg) => {
  switch (msg.type) {
    case "convert":
      await processSelection();
      break;
    case "close":
      figma.closePlugin();
      break;
  }
};

// Auto-convert on launch if something is selected
processSelection();
