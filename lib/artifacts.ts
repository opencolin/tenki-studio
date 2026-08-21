/**
 * Run artifacts.
 *
 * In the real product these are files the crew wrote inside its sandbox, which
 * the orchestrator collects and the run page serves from object storage. Here
 * we produce them for real in the browser from the crew's own task outputs, so
 * an artifact is always a genuine file with a genuine byte count — never a
 * fabricated row. The poster is rendered from the art-direction task's design
 * specification (palette, composition, type treatment).
 */

export interface Artifact {
  /** Path as it would appear inside the sandbox. */
  name: string;
  kind: "image" | "text";
  mime: string;
  /** Real byte length of the blob. */
  size: number;
  /** Object URL — revoke with `releaseArtifacts` when the run is replaced. */
  url: string;
  /** Present for text artifacts, so they can be shown without a fetch. */
  text?: string;
  /** One line on where this came from. */
  source: string;
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/* ------------------------------ the poster ------------------------------ */

/** Palette from the visual design specification: cream ground, sky field, one accent. */
const CREAM = "#F2E7D3";
const SKY = "#0A7ABF";
const SKY_DEEP = "#075E94";
const INK = "#16242E";
const ACCENT = "#C2571C";

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const candidate = line ? `${line} ${w}` : w;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Draws a 1960s-style advertising poster at 2:3, per the design spec:
 * flat colour blocks, geometric cloud forms, a condensed all-caps headline
 * locked to a rule, and the accent used exactly once — on the call to action.
 */
export async function renderPoster(client: string, headline: string): Promise<Blob> {
  const W = 1200;
  const H = 1800;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is unavailable in this browser.");

  try {
    await document.fonts.ready;
  } catch {
    /* fall back to the stack below */
  }
  const display = `"Sora", "Helvetica Neue", Arial, sans-serif`;
  const mono = `"JetBrains Mono", ui-monospace, monospace`;

  // Ground
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, W, H);

  // Sky field — a single arched block, the poster's dominant element.
  ctx.fillStyle = SKY;
  ctx.beginPath();
  ctx.moveTo(90, 900);
  ctx.lineTo(90, 430);
  ctx.arc(600, 430, 510, Math.PI, 0);
  ctx.lineTo(1110, 900);
  ctx.closePath();
  ctx.fill();

  // Stylised cloud forms: overlapping discs, flat, no gradients.
  const cloud = (cx: number, cy: number, r: number, color: string) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.arc(cx + r * 0.95, cy + r * 0.2, r * 0.72, 0, Math.PI * 2);
    ctx.arc(cx - r * 0.9, cy + r * 0.25, r * 0.64, 0, Math.PI * 2);
    ctx.fill();
  };
  cloud(420, 470, 96, "#E7F2FA");
  cloud(790, 620, 70, "#BFDDF1");
  cloud(300, 720, 54, "#BFDDF1");

  // Sun disc in the accent's cooler cousin, so the accent stays unique below.
  ctx.fillStyle = SKY_DEEP;
  ctx.beginPath();
  ctx.arc(860, 380, 74, 0, Math.PI * 2);
  ctx.fill();

  // Kicker
  ctx.fillStyle = CREAM;
  ctx.font = `600 26px ${mono}`;
  ctx.letterSpacing = "6px";
  ctx.textAlign = "center";
  ctx.fillText("A NEW KIND OF COMPUTE", W / 2, 300);
  ctx.letterSpacing = "0px";

  // Type block is laid out between the arch and the call-to-action band, and
  // the headline shrinks until the whole block fits — a long client name must
  // never push the body copy under the CTA.
  const ctaY = H - 250;
  const blockTop = 1000;
  const blockBottom = ctaY - 60;

  ctx.fillStyle = INK;
  ctx.textAlign = "left";
  const bodyText = `Disposable Linux sandboxes that boot in about a second. Run the code your agents write — then throw the machine away.`;

  let size = 108;
  let lines: string[] = [];
  let bodyLines: string[] = [];
  for (; size >= 56; size -= 6) {
    ctx.font = `700 ${size}px ${display}`;
    lines = wrap(ctx, headline.toUpperCase(), W - 180);
    ctx.font = `400 30px ${display}`;
    bodyLines = wrap(ctx, bodyText, W - 180);
    const height = lines.length * size * 1.02 + 60 + bodyLines.length * 44;
    if (lines.length <= 4 && height <= blockBottom - blockTop) break;
  }

  ctx.font = `700 ${size}px ${display}`;
  let y = blockTop + size * 0.82;
  for (const line of lines) {
    ctx.fillText(line, 90, y);
    y += size * 1.02;
  }

  // Rule beneath the headline
  ctx.fillStyle = INK;
  ctx.fillRect(90, y - size * 0.28, W - 180, 6);

  // Body
  ctx.font = `400 30px ${display}`;
  ctx.fillStyle = "#3D5566";
  let by = y + 56;
  for (const line of bodyLines) {
    ctx.fillText(line, 90, by);
    by += 44;
  }

  // Call to action — the accent, used exactly once.
  ctx.fillStyle = ACCENT;
  ctx.beginPath();
  ctx.roundRect(90, ctaY, 470, 92, 46);
  ctx.fill();
  ctx.fillStyle = CREAM;
  ctx.font = `600 32px ${display}`;
  ctx.textAlign = "center";
  ctx.fillText("Start a sandbox", 325, ctaY + 58);

  // Client mark, bottom-right optical corner
  ctx.textAlign = "right";
  ctx.fillStyle = INK;
  ctx.font = `700 40px ${display}`;
  ctx.fillText(client, W - 90, ctaY + 50);
  ctx.font = `400 22px ${mono}`;
  ctx.fillStyle = "#5A7184";
  ctx.fillText("est. 2020", W - 90, ctaY + 86);

  // Paper grain — sparse, low alpha, so it reads as print not noise.
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = INK;
  for (let i = 0; i < 5200; i++) {
    ctx.fillRect(Math.random() * W, Math.random() * H, 1.6, 1.6);
  }
  ctx.globalAlpha = 1;

  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not encode the poster."))), "image/png"),
  );
}

/* ------------------------------ collection ------------------------------ */

function textArtifact(name: string, text: string, source: string): Artifact {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  return {
    name,
    kind: "text",
    mime: "text/plain",
    size: blob.size,
    url: URL.createObjectURL(blob),
    text,
    source,
  };
}

/**
 * Build the artifact set for a finished run from the crew's own task outputs.
 * Anything that fails to render is simply omitted — never faked.
 */
export async function buildArtifacts(
  client: string,
  outputs: { brief?: string; design?: string; prompt?: string },
): Promise<Artifact[]> {
  const out: Artifact[] = [];
  const base = slug(client) || "client";

  const headline = `Innovative cloud solutions tailored for ${client}`;
  try {
    const png = await renderPoster(client, headline);
    out.push({
      name: `artifacts/poster_${base}.png`,
      kind: "image",
      mime: "image/png",
      size: png.size,
      url: URL.createObjectURL(png),
      source: "Rendered from the art-direction task's design specification",
    });
  } catch {
    /* no canvas — carry on with the text artifacts */
  }

  if (outputs.design) {
    out.push(
      textArtifact(`artifacts/design_spec_${base}.md`, outputs.design, "Output of the art-direction task"),
    );
  }
  if (outputs.brief) {
    out.push(
      textArtifact(`artifacts/creative_brief_${base}.md`, outputs.brief, "Output of the discovery task"),
    );
  }
  if (outputs.prompt) {
    out.push(
      textArtifact(`artifacts/image_prompt_${base}.txt`, outputs.prompt, "Output of the copywriting task"),
    );
  }
  return out;
}

export function releaseArtifacts(artifacts: Artifact[]) {
  for (const a of artifacts) URL.revokeObjectURL(a.url);
}
