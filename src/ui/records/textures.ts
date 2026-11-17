import * as THREE from "three";
import { SLEEVES, type RecordSpec } from "./catalog";

/** Texture resolution: a sleeve face is drawn at 1024 × 1024. */
const FACE = 1024;

const images = new Map<string, Promise<HTMLImageElement>>();
function loadImage(src: string): Promise<HTMLImageElement> {
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

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
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
function fit(
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

function canvas(width: number, height: number) {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  return { c, ctx: c.getContext("2d")! };
}

function toTexture(c: HTMLCanvasElement): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Front cover: artwork in a window, the title set big, catalogue number small. */
export async function coverTexture(record: RecordSpec, font: string): Promise<THREE.CanvasTexture> {
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
  return toTexture(c);
}

/** Back cover: the track list, numbered like a real sleeve. */
export function backTexture(record: RecordSpec, font: string, sides: { a: string; b: string }): THREE.CanvasTexture {
  const colors = SLEEVES[record.sleeve];
  const { c, ctx } = canvas(FACE, FACE);
  ctx.fillStyle = colors.sleeve;
  ctx.fillRect(0, 0, FACE, FACE);
  ctx.fillStyle = colors.ink;
  const pad = 72;
  ctx.font = `800 64px ${font}`;
  ctx.textBaseline = "top";
  ctx.fillText(record.title, pad, pad, FACE - pad * 2);
  let y = pad + 120;
  const half = Math.ceil(record.tracks.length / 2);
  record.tracks.forEach((track, i) => {
    if (i === 0 || i === half) {
      ctx.font = `800 30px ${font}`;
      ctx.fillText(i === 0 ? sides.a : sides.b, pad, y);
      y += 52;
    }
    ctx.font = `500 30px ${font}`;
    const lines = wrap(ctx, `${(i % half) + 1}. ${track.title}`, FACE - pad * 2).slice(0, 3);
    lines.forEach((line) => {
      ctx.fillText(line, pad, y);
      y += 40;
    });
    y += 14;
  });
  return toTexture(c);
}

/** Spine: title running bottom-to-top, catalogue number at the foot. */
export function spineTexture(record: RecordSpec, font: string, thickness: number): THREE.CanvasTexture {
  const colors = SLEEVES[record.sleeve];
  const long = FACE;
  const short = Math.max(48, Math.round(FACE * thickness));
  const { c, ctx } = canvas(short, long);
  ctx.fillStyle = colors.sleeve;
  ctx.fillRect(0, 0, short, long);
  ctx.save();
  ctx.translate(short / 2, long);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = colors.ink;
  ctx.textBaseline = "middle";
  const size = Math.round(short * 0.5);
  ctx.font = `700 ${Math.round(size * 0.62)}px ${font}`;
  ctx.fillText(record.catalog, 24, 0);
  const offset = 24 + ctx.measureText(record.catalog).width + 28;
  ctx.font = `800 ${size}px ${font}`;
  let title = record.title;
  while (ctx.measureText(title).width > long - offset - 24 && title.length > 4) title = `${title.slice(0, -2)}…`;
  ctx.fillText(title, offset, 0);
  ctx.restore();
  return toTexture(c);
}

/** The paper label at the centre of the vinyl. */
export function labelTexture(record: RecordSpec, font: string, side: string): THREE.CanvasTexture {
  const colors = SLEEVES[record.sleeve];
  const size = 512;
  const { c, ctx } = canvas(size, size);
  ctx.fillStyle = "#101014";
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = colors.label;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f4f1ff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const title = fit(ctx, record.title, size * 0.7, 2, 64, "800", font);
  ctx.font = `800 ${title.size}px ${font}`;
  title.lines.forEach((line, i) => ctx.fillText(line, size / 2, size * 0.3 + i * title.size));
  ctx.font = `700 34px ${font}`;
  ctx.fillText(side, size / 2, size * 0.72);
  ctx.fillStyle = "#101014";
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, 14, 0, Math.PI * 2);
  ctx.fill();
  return toTexture(c);
}

/** Wood grain for the cabinet: soft streaks, not a photograph. */
export function woodTexture(base: string, dark: string): THREE.CanvasTexture {
  const { c, ctx } = canvas(512, 512);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 512, 512);
  ctx.strokeStyle = dark;
  for (let i = 0; i < 70; i++) {
    ctx.globalAlpha = 0.04 + Math.random() * 0.08;
    ctx.lineWidth = 1 + Math.random() * 3;
    const y = Math.random() * 512;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(170, y + (Math.random() - 0.5) * 30, 340, y + (Math.random() - 0.5) * 30, 512, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  const t = toTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
