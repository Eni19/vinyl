"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { SLEEVES, type RecordSpec } from "./catalog";
import { Procession } from "./Procession";

const ShelfScene = dynamic(() => import("./ShelfScene"), { ssr: false });

function subscribe(query: string) {
  return (callback: () => void) => {
    const list = window.matchMedia(query);
    list.addEventListener("change", callback);
    return () => list.removeEventListener("change", callback);
  };
}

function useMedia(query: string, fallback: boolean) {
  return useSyncExternalStore(
    subscribe(query),
    () => window.matchMedia(query).matches,
    () => fallback,
  );
}

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export interface ShelfProps {
  records: RecordSpec[];
  intro: ReactNode;
  /** Model credits (CC BY): in a corner of the stage. */
  credits: ReactNode;
  /** Liner notes for each record: side A and side B, rendered on the server. */
  notes: Record<string, { a: ReactNode; b: ReactNode }>;
  labels: {
    shelf: string;
    sideA: string;
    sideB: string;
    back: string;
    next: string;
    previous: string;
    hint: string;
    hintTouch: string;
    play: string;
    explore: string;
  };
  switcher: ReactNode;
}

/**
 * The record shelf. With WebGL, picking a record pulls it out, puts the vinyl
 * on the turntable and opens its liner notes beside it, side A first. Without
 * WebGL the same notes read as a page under a grid of sleeves.
 */
export function Shelf({ records, intro, credits, notes, labels, switcher }: ShelfProps) {
  const [webgl, setWebgl] = useState(false);
  const [ready, setReady] = useState(false);
  const [running, setRunning] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [side, setSide] = useState<"a" | "b">("a");
  /** The record pulled up in the crate: what Enter plays. */
  const [browsed, setBrowsed] = useState<string | null>(null);
  /** The record at the centre of the procession. */
  const [center, setCenter] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const notesRef = useRef<HTMLDivElement>(null);
  const lastTrigger = useRef<HTMLElement | null>(null);
  const reducedMotion = useMedia("(prefers-reduced-motion: reduce)", false);
  const wide = useMedia("(min-width: 861px)", true);
  const live = webgl && ready;
  const ids = records.map((r) => r.id);

  useEffect(() => {
    const fromHash = () => {
      const id = window.location.hash.slice(1);
      return records.some((r) => r.id === id) ? id : null;
    };
    // Feature detection and the initial hash need the browser.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWebgl(hasWebGL());
    setSelected(fromHash());
    const onHash = () => {
      setSelected(fromHash());
      setSide("a");
    };
    window.addEventListener("hashchange", onHash);
    const observer = new IntersectionObserver(([entry]) => setRunning(entry.isIntersecting));
    if (root.current) observer.observe(root.current);
    return () => {
      window.removeEventListener("hashchange", onHash);
      observer.disconnect();
    };
  }, [records]);

  const play = useCallback(
    (id: string | null) => {
      if (!live) return;
      if (document.activeElement instanceof HTMLElement) lastTrigger.current = document.activeElement;
      window.history.pushState(null, "", id ? `#${id}` : window.location.pathname);
      setSelected(id);
      setSide("a");
    },
    [live],
  );

  useEffect(() => {
    if (!live) return;
    if (selected) notesRef.current?.querySelector<HTMLElement>(`#${selected}-title`)?.focus({ preventScroll: true });
    else lastTrigger.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selected) play(null);
      // With nothing playing, Escape lets go of the picked record: the crate settles back.
      else if (e.key === "Escape") setBrowsed(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, live, play]);

  const index = selected ? ids.indexOf(selected) : -1;
  const step = (delta: number) => play(ids[(index + delta + ids.length) % ids.length]);

  // Turn the procession one record at a time (wheel, drag, arrow keys); the record
  // that comes to the centre is pulled up in the crate.
  const move = useCallback(
    (delta: number) => {
      const next = (((center + delta) % ids.length) + ids.length) % ids.length;
      setCenter(next);
      setBrowsed(ids[next]);
    },
    // ids is derived from records on every render; records is the real dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [center, records],
  );
  // Pointing at a record in the 3D crate brings it round to the centre of the procession.
  const browseFromScene = useCallback(
    (id: string) => {
      setBrowsed(id);
      setCenter(ids.indexOf(id));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [records],
  );

  useEffect(() => {
    const el = stage.current;
    if (!live || selected || !el) return;
    let pending = 0;
    let last = 0;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      pending += e.deltaY;
      const now = performance.now();
      // One record per notch, and not faster than the eye can follow on a trackpad.
      if (Math.abs(pending) < 40 || now - last < 110) return;
      move(pending > 0 ? 1 : -1);
      pending = 0;
      last = now;
    };
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("input, textarea, [role=tablist]")) return;
      if (e.key === "ArrowDown" || e.key === "ArrowRight") move(1);
      else if (e.key === "ArrowUp" || e.key === "ArrowLeft") move(-1);
      // On a link or button, Enter already does that element's job.
      else if (e.key === "Enter" && browsed && !target.closest("a, button")) play(browsed);
      else return;
      e.preventDefault();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    return () => {
      el.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
    };
  }, [live, selected, browsed, move, play]);

  return (
    <div ref={root} className="shelf" data-live={live || undefined} data-open={selected ?? undefined}>
      <div
        ref={stage}
        className="shelf-stage"
        onClick={(e) => {
          // A click on nothing in particular lets go of the picked record, as if you had
          // dropped it back: the crate settles to rest (the procession stays where it is).
          // Controls, links and the canvas (handled by the scene) keep their own clicks.
          const target = e.target as HTMLElement;
          if (selected || target.closest("a, button, canvas, .procession, .liner, .crate")) return;
          setBrowsed(null);
        }}
      >
        {webgl && (
          <ShelfScene
            records={records}
            selected={live ? selected : null}
            side={side}
            reducedMotion={reducedMotion}
            labels={{ sideA: labels.sideA, sideB: labels.sideB }}
            panel={wide ? { side: "right", share: 0.44 } : { side: "bottom", share: 0.6 }}
            running={running}
            browsed={browsed}
            onBrowse={browseFromScene}
            onSelect={(id) => play(id === selected ? null : id)}
            onReady={() => setReady(true)}
            onMiss={() => {
              if (!selected) setBrowsed(null);
            }}
          />
        )}

        <div className="shelf-side">
          <div className="shelf-intro" aria-hidden={live && selected ? true : undefined}>
            {intro}
            {live && (
              <p className="shelf-hint">
                <span className="hint-pointer">{labels.hint}</span>
                <span className="hint-touch">{labels.hintTouch}</span>
              </p>
            )}
          </div>
          {live && wide && (
            <Procession
              records={records}
              center={center}
              browsed={browsed}
              hidden={selected !== null}
              labels={{
                shelf: labels.shelf,
                play: labels.play,
                hint: labels.explore,
                previous: labels.previous,
                next: labels.next,
              }}
              onMove={move}
              onGo={(i) => {
                setCenter(i);
                setBrowsed(ids[i]);
              }}
              onPlay={(id) => play(id)}
            />
          )}
        </div>

        <div className="shelf-credits">{credits}</div>

        {/* Every record is also a plain link: keyboard, screen readers and no-WebGL visitors use these. */}
        <nav className="crate" aria-label={labels.shelf}>
          <ul>
            {records.map((record) => {
              const colors = SLEEVES[record.sleeve];
              return (
                <li key={record.id}>
                  <a
                    href={`#${record.id}`}
                    className="crate-sleeve"
                    style={{ "--sleeve": colors.sleeve, "--sleeve-ink": colors.ink } as React.CSSProperties}
                    aria-current={selected === record.id ? "true" : undefined}
                    onFocus={() => live && setBrowsed(record.id)}
                    onClick={(e) => {
                      if (!live) return;
                      e.preventDefault();
                      play(selected === record.id ? null : record.id);
                    }}
                  >
                    <span className="crate-catalog">{record.catalog}</span>
                    <span className="crate-title">{record.title}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      <div ref={notesRef} className="liner">
        {records.map((record) => {
          const open = selected === record.id;
          return (
            <article
              key={record.id}
              id={live ? undefined : record.id}
              className="liner-notes"
              style={{ "--sleeve": SLEEVES[record.sleeve].sleeve } as React.CSSProperties}
              hidden={live && !open ? true : undefined}
              aria-labelledby={`${record.id}-title`}
            >
              {live && (
                <div className="liner-bar">
                  <button type="button" className="liner-back" onClick={() => play(null)}>
                    {labels.back}
                  </button>
                  <span className="liner-steps">
                    {switcher}
                    <button type="button" onClick={() => step(-1)} aria-label={labels.previous}>
                      <svg className="chevron" viewBox="0 0 16 16" fill="none" aria-hidden>
                        <path d="M10 3 5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" />
                      </svg>
                    </button>
                    <button type="button" onClick={() => step(1)} aria-label={labels.next}>
                      <svg className="chevron" viewBox="0 0 16 16" fill="none" aria-hidden>
                        <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" />
                      </svg>
                    </button>
                  </span>
                </div>
              )}
              <header className="liner-head">
                <p className="liner-catalog">{record.catalog}</p>
                <h2 id={`${record.id}-title`} className="liner-title" tabIndex={-1}>
                  {record.title}
                </h2>
                <p className="liner-subtitle">{record.subtitle}</p>
              </header>
              {live ? (
                <>
                  <div className="sides" role="tablist" aria-label={record.title}>
                    {(["a", "b"] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        role="tab"
                        id={`${record.id}-tab-${s}`}
                        aria-selected={side === s}
                        aria-controls={`${record.id}-side-${s}`}
                        onClick={() => setSide(s)}
                      >
                        {s === "a" ? labels.sideA : labels.sideB}
                      </button>
                    ))}
                  </div>
                  {(["a", "b"] as const).map((s) => (
                    <section
                      key={s}
                      id={`${record.id}-side-${s}`}
                      role="tabpanel"
                      aria-labelledby={`${record.id}-tab-${s}`}
                      hidden={side !== s}
                      className="side"
                    >
                      {notes[record.id]?.[s]}
                    </section>
                  ))}
                </>
              ) : (
                (["a", "b"] as const).map((s) => (
                  <section key={s} className="side" aria-label={s === "a" ? labels.sideA : labels.sideB}>
                    <h3 className="side-label">{s === "a" ? labels.sideA : labels.sideB}</h3>
                    {notes[record.id]?.[s]}
                  </section>
                ))
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
