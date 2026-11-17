import { SLEEVES, type RecordSpec } from "./catalog";

/*
 * Sleeve artwork drawn on 2D canvases. Kept free of three.js so the page's own
 * HTML (the record procession) can show the same covers without loading WebGL code.
 */

/** Texture resolution: a sleeve face is drawn at 1024 × 1024. */
export const FACE = 1024;

const images = new Map<string, Promise<HTMLImageElement>>();
export function loadImage(src: string): Promise<HTMLImageElement> {
  if (!images.has(src)) {
    images.set(
      src,
      new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = src;
      }),
    );
  }
  return images.get(src)!;
}

export function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/** Largest size (≤ max) at which the text wraps into at most `maxLines` lines that fit. */
export function fit(
  ctx: CanvasRenderingContext2D,
  text: string,
  width: number,
  maxLines: number,
  max: number,
  weight: string,
  font: string,
) {
  for (let size = max; size > 12; size -= 2) {
    ctx.font = `${weight} ${size}px ${font}`;
    const lines = wrap(ctx, text, width);
    if (lines.length <= maxLines && text.split(/\s+/).every((w) => ctx.measureText(w).width <= width))
      return { size, lines };
  }
  ctx.font = `${weight} 12px ${font}`;
  return { size: 12, lines: wrap(ctx, text, width) };
}

export function canvas(width: number, height: number) {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  return { c, ctx: c.getContext("2d")! };
}

/** Front cover: artwork in a window, the title set big, catalogue number small. */
async function drawCover(record: RecordSpec, font: string): Promise<HTMLCanvasElement> {
  const colors = SLEEVES[record.sleeve];
  const { c, ctx } = canvas(FACE, FACE);
  ctx.fillStyle = colors.sleeve;
  ctx.fillRect(0, 0, FACE, FACE);

  // In a crate only the top strip of each sleeve shows, so a one-line title and
  // the catalogue number sit right at the top edge.
  const pad = 64;
  ctx.fillStyle = colors.ink;
  const band = fit(ctx, record.title, FACE - pad * 2 - 150, 1, 54, "800", font);
  ctx.font = `800 ${band.size}px ${font}`;
  ctx.textBaseline = "top";
  ctx.fillText(band.lines[0] ?? "", 34, 10);
  ctx.font = `700 34px ${font}`;
  ctx.textAlign = "right";
  ctx.fillText(record.catalog, FACE - 34, 18);
  ctx.textAlign = "left";
  // Below the strip: the title at full size, then the artwork.
  const title = fit(ctx, record.title, FACE - pad * 2, record.art ? 2 : 4, record.art ? 96 : 150, "800", font);
  ctx.font = `800 ${title.size}px ${font}`;
  const titleTop = 130;
  title.lines.forEach((line, i) => ctx.fillText(line, pad, titleTop + i * title.size * 0.98));
  const artTop = titleTop + title.lines.length * title.size * 0.98 + 24;

  if (record.art) {
    try {
      const image = await loadImage(record.art.src);
      const box = { x: pad, y: artTop, w: FACE - pad * 2, h: FACE - pad - 70 - artTop };
      const scale = Math.max(box.w / image.width, box.h / image.height);
      const sw = box.w / scale;
      const sh = box.h / scale;
      ctx.drawImage(image, (image.width - sw) / 2, (image.height - sh) / 2, sw, sh, box.x, box.y, box.w, box.h);
    } catch {
      // Artwork missing: the cover stays typographic.
    }
  }
  ctx.fillStyle = colors.ink;

  ctx.font = `600 34px ${font}`;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(record.subtitle, pad, FACE - pad);
  ctx.textAlign = "right";
  ctx.fillText(record.catalog, FACE - pad, FACE - pad);
  return c;
}

const covers = new Map<string, Promise<HTMLCanvasElement>>();
/** The front cover, drawn once per record and font and shared by the 3D sleeve and the page. */
export function coverCanvas(record: RecordSpec, font: string): Promise<HTMLCanvasElement> {
  const key = `${record.id}|${record.title}|${record.subtitle}|${font}`;
  if (!covers.has(key)) covers.set(key, drawCover(record, font));
  return covers.get(key)!;
}
