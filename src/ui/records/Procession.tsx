"use client";

import { useEffect, useRef, useState } from "react";
import { SLEEVES, type RecordSpec } from "./catalog";
import { coverCanvas } from "./cover-art";
import { ringOffset } from "./ring";

/** Covers small enough for the page, drawn from the same canvases as the 3D sleeves. */
function useCoverUrls(records: RecordSpec[]) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    let alive = true;
    document.fonts.ready.then(() => {
      // Same font string as the scene uses, so both share one drawing per cover.
      const font = getComputedStyle(document.body).fontFamily;
      for (const record of records) {
        coverCanvas(record, font).then((cover) => {
          const small = document.createElement("canvas");
          small.width = small.height = 320;
          small.getContext("2d")!.drawImage(cover, 0, 0, 320, 320);
          const url = small.toDataURL("image/jpeg", 0.86);
          if (alive) setUrls((current) => ({ ...current, [record.id]: url }));
        });
      }
    });
    return () => {
      alive = false;
    };
  }, [records]);
  return urls;
}

export interface ProcessionProps {
  records: RecordSpec[];
  /** Index of the record at the centre of the procession. */
  center: number;
  /** The record currently pulled up in the crate, if any. */
  browsed: string | null;
  hidden: boolean;
  labels: { shelf: string; play: string; hint: string; previous: string; next: string };
  onBrowse: (id: string) => void;
  onLeave: () => void;
  onMove: (delta: number) => void;
  /** Turn straight to the record at this index. */
  onGo: (index: number) => void;
  onPlay: (id: string) => void;
}

/**
 * A vertical procession of sleeves under the intro, after the record label site
 * "Not The Final Vinyl": the centre sleeve large and tilted, the others receding in
 * depth above and below, the catalogue wrapping around. Scroll or drag to move it;
 * pointing at a sleeve pulls that record up in the crate; a click plays it.
 */
export function Procession({
  records,
  center,
  browsed,
  hidden,
  labels,
  onBrowse,
  onLeave,
  onMove,
  onGo,
  onPlay,
}: ProcessionProps) {
  const urls = useCoverUrls(records);
  const count = records.length;
  const shown = records.find((r) => r.id === browsed) ?? records[center];
  const drag = useRef<{ y: number; moved: boolean } | null>(null);

  return (
    <nav
      className="procession"
      aria-label={labels.shelf}
      aria-hidden={hidden || undefined}
      onPointerLeave={onLeave}
      onPointerDown={(e) => {
        drag.current = { y: e.clientY, moved: false };
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d || e.buttons === 0) return;
        // Dragging the procession moves it one sleeve per 56px, like pulling a strip.
        const dy = e.clientY - d.y;
        if (Math.abs(dy) < 56) return;
        onMove(dy < 0 ? 1 : -1);
        drag.current = { y: e.clientY, moved: true };
      }}
      onPointerUp={() => {
        setTimeout(() => (drag.current = null), 0);
      }}
    >
      {/* The way through: up, one tick per record (the centre one lit), down. It says
          there are more records than the three in view, and where you are among them. */}
      <div className="procession-rail">
        <button type="button" className="procession-step" onClick={() => onMove(-1)} aria-label={labels.previous}>
          <svg viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M3 10l5-5 5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" />
          </svg>
        </button>
        <ol className="procession-ticks">
          {records.map((record, i) => (
            <li key={record.id}>
              <button
                type="button"
                className="procession-tick"
                aria-current={i === center || undefined}
                aria-label={`${record.catalog} ${record.title}`}
                tabIndex={-1}
                onClick={() => onGo(i)}
              />
            </li>
          ))}
        </ol>
        <button type="button" className="procession-step" onClick={() => onMove(1)} aria-label={labels.next}>
          <svg viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M3 6l5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" />
          </svg>
        </button>
      </div>

      <ul className="procession-track">
        {records.map((record, i) => {
          const offset = ringOffset(i, center, count);
          const far = Math.abs(offset) > 2;
          return (
            <li
              key={record.id}
              className="procession-item"
              data-offset={offset}
              data-far={far || undefined}
              data-browsed={browsed === record.id || undefined}
              style={
                {
                  "--o": offset,
                  "--abs": Math.abs(offset),
                  "--sleeve": SLEEVES[record.sleeve].sleeve,
                } as React.CSSProperties
              }
            >
              <a
                href={`#${record.id}`}
                tabIndex={far ? -1 : 0}
                aria-label={`${record.catalog} ${record.title}`}
                onPointerEnter={() => onBrowse(record.id)}
                onFocus={() => {
                  onBrowse(record.id);
                  if (offset !== 0) onMove(offset);
                }}
                onClick={(e) => {
                  e.preventDefault();
                  // A drag that ends on a sleeve is a move, not a click.
                  if (drag.current?.moved) return;
                  onPlay(record.id);
                }}
              >
                {urls[record.id] ? (
                  // eslint-disable-next-line @next/next/no-img-element -- a data URL drawn on the client
                  <img src={urls[record.id]} alt="" draggable={false} />
                ) : (
                  <span className="procession-blank" aria-hidden />
                )}
              </a>
            </li>
          );
        })}
      </ul>

      <div className="procession-now" aria-live="polite">
        <p className="procession-meta">
          {shown.catalog} · {shown.subtitle}
        </p>
        <p className="procession-title">{shown.title}</p>
        <button type="button" className="procession-play" onClick={() => onPlay(shown.id)}>
          {labels.play}
          <svg viewBox="0 0 16 16" aria-hidden>
            <path d="M5 3.5v9l7-4.5z" fill="currentColor" />
          </svg>
        </button>
        <p className="procession-hint">{labels.hint}</p>
      </div>
    </nav>
  );
}
