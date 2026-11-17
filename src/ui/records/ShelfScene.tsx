"use client";

import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Bloom, EffectComposer, Outline, Select, Selection, Vignette } from "@react-three/postprocessing";
import { SLEEVES, type RecordSpec } from "./catalog";
import { backTexture, coverTexture, labelTexture, woodTexture } from "./textures";

/*
 * A listening corner at night. World units: one sleeve is 1 × 1 (a real LP is
 * 31.5 cm), the tabletop is y = 0. The scanned crate stands on the left with
 * our records at its front; the turntable stands on the right.
 *
 * Models (both CC BY 4.0, credited on the page):
 *  - "Scan of Vinyl records in box crate" by Ellipsoid
 *  - "Vinyl Recorder with 'Until i Found You' disc" by ImSiyue
 */

const SLEEVE = { w: 1, h: 1, d: 0.017 };
const DISC_RADIUS = 0.47;
/** The crate is turned toward the deck (yaw, radians) so the sleeves face the room at an angle. */
const CRATE = { x: -0.95, width: 1.32, wall: 0.07, yaw: 0.36 };
const DECK = { x: 0.82, z: 0.05 };
const BG = "#0e0c13";

/** Filled in once the models load: where the crate's front is, where a record plays. */
const stage = {
  crateFront: 0.4,
  crateTop: 0.45,
  platter: new THREE.Vector3(DECK.x, 0.3, DECK.z),
  /** The turntable's bounds in the scene, for the overhead "now playing" view. */
  deck: new THREE.Box3(
    new THREE.Vector3(DECK.x - 0.7, 0, DECK.z - 0.5),
    new THREE.Vector3(DECK.x + 0.7, 0.3, DECK.z + 0.5),
  ),
};

/**
 * Turntable speed, rad/s. Slower than a real 33⅓ rpm (3.5 rad/s): about 16 rpm,
 * so it still reads as turning but the label stays readable.
 */
const SPIN = 1.7;

/** When the vinyl has landed and spins (the play timeline's last phase ends at 2.3s). */
const SPINNING_AFTER = 2.5;

const FLAT = new THREE.Quaternion();
const FLIPPED = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI, 0, 0));
const UPRIGHT = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));

/** The crate's frame: crate-local poses (x = CRATE.x at its centre, z = 0 at its middle) turned by its yaw. */
const CRATE_PIVOT = new THREE.Vector3(CRATE.x, 0, 0);
const CRATE_Q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, CRATE.yaw, 0));
function inCrate(local: THREE.Vector3, euler = new THREE.Euler()) {
  return {
    position: local.clone().sub(CRATE_PIVOT).applyQuaternion(CRATE_Q).add(CRATE_PIVOT),
    quaternion: CRATE_Q.clone().multiply(new THREE.Quaternion().setFromEuler(euler)),
  };
}

export interface SceneLabels {
  sideA: string;
  sideB: string;
}

interface SceneProps {
  records: RecordSpec[];
  selected: string | null;
  side: "a" | "b";
  reducedMotion: boolean;
  labels: SceneLabels;
  panel: { side: "right" | "bottom"; share: number };
  /** The record pulled up for a look (from the pointer, the index, the wheel or the keys). */
  browsed: string | null;
  onBrowse: (id: string) => void;
  onSelect: (id: string) => void;
}

/**
 * The scene renders on demand, so after an idle stretch the first frame's delta can be
 * seconds long. Every step clamps it, so nothing jumps when the loop wakes up.
 */
const step = (delta: number) => Math.min(delta, 1 / 30);
const damp = (delta: number, speed: number) => 1 - Math.exp(-step(delta) * speed);
/** Still moving? Used to keep the on-demand loop running until things settle. */
const EPS = 1e-4;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
/** Progress of a phase that runs from `start` to `end` seconds. */
const phase = (t: number, start: number, end: number) => clamp01((t - start) / (end - start));

/** A texture drawn off the render loop, made only while `enabled`. */
function useTexture<T extends THREE.Texture>(make: () => T | Promise<T>, deps: unknown[], enabled = true): T | null {
  const [texture, setTexture] = useState<T | null>(null);
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    if (texture) invalidate();
  }, [texture, invalidate]);
  useEffect(() => {
    if (!enabled) return;
    const pending = make();
    let alive = true;
    let made: T | null = null;
    Promise.resolve(pending).then((t) => {
      made = t;
      if (alive) setTexture(t);
      else t.dispose();
    });
    return () => {
      alive = false;
      made?.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled]);
  return enabled ? texture : null;
}

/**
 * One sleeve shape for every record, with its six box faces folded into three draw
 * groups: the four edges (0), the cover (1) and the back (2). Six materials per sleeve
 * meant six draw calls, twice over with shadows.
 */
const SLEEVE_GEOMETRY = (() => {
  // Edges rounded by a hair (5 mm on a 31.5 cm sleeve, scaled), like worn board.
  const g = new RoundedBoxGeometry(SLEEVE.w, SLEEVE.h, SLEEVE.d, 2, 0.005);
  // It keeps BoxGeometry's face order (+x, -x, +y, -y, +z, -z), equal vertex counts each.
  const face = g.getAttribute("position").count / 6;
  g.clearGroups();
  g.addGroup(0, face * 4, 0);
  g.addGroup(face * 4, face, 1);
  g.addGroup(face * 5, face, 2);
  return g;
})();

/**
 * Our vinyl is the turntable model's own record: its grooved mesh and material, centred
 * and scaled to DISC_RADIUS, filled in by <Deck> once the model loads. Our paper labels
 * cover its label (43% of the radius, a 7" single's proportions) on both faces.
 */
const vinyl: { geometry: THREE.BufferGeometry | null; material: THREE.Material | null; half: number } = {
  geometry: null,
  material: null,
  half: 0.006,
};
const LABEL_RADIUS = DISC_RADIUS * 0.44;
const LABEL_GEOMETRY = new THREE.CircleGeometry(LABEL_RADIUS, 64);
/** The vinyl rides just behind the sleeve's back, so the sleeve hides it until it slides out. */
const BEHIND_SLEEVE = new THREE.Vector3(0, 0, -(SLEEVE.d / 2 + 0.012));
/** How far it slides sideways to clear the sleeve: half a sleeve plus a radius, and a hair. */
const SLIDE_OUT = new THREE.Vector3(SLEEVE.w / 2 + DISC_RADIUS + 0.04, 0, 0);

/**
 * The vinyl itself. It exists only while its record is out of the crate: mounted
 * when the record is played, unmounted once it is back in its sleeve.
 */
function Disc({
  record,
  font,
  labels,
  discRef,
  spinnerRef,
}: {
  record: RecordSpec;
  font: string;
  labels: SceneLabels;
  discRef: React.RefObject<THREE.Group | null>;
  spinnerRef: React.RefObject<THREE.Group | null>;
}) {
  const labelA = useTexture(() => labelTexture(record, font, labels.sideA), [record, font, labels.sideA]);
  const labelB = useTexture(() => labelTexture(record, font, labels.sideB), [record, font, labels.sideB]);
  return (
    <group ref={discRef} visible={false}>
      <group ref={spinnerRef}>
        {vinyl.geometry && vinyl.material && <mesh geometry={vinyl.geometry} material={vinyl.material} castShadow />}
        {/* Paper labels on both faces, over the model's own: side A up, side B down. */}
        <mesh geometry={LABEL_GEOMETRY} position={[0, vinyl.half + 0.0008, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <meshStandardMaterial key={labelA ? "a" : "a0"} map={labelA} color="#cfcac2" roughness={0.85} />
        </mesh>
        <mesh geometry={LABEL_GEOMETRY} position={[0, -vinyl.half - 0.0008, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <meshStandardMaterial key={labelB ? "b" : "b0"} map={labelB} color="#cfcac2" roughness={0.85} />
        </mesh>
      </group>
    </group>
  );
}

/** Raycasting off: a hit area that ignores the pointer. */
const NO_RAYCAST = () => null;

/** How far a record leans back at rest: further back in the crate, a touch more. */
const restLean = (slot: number) => -0.2 - slot * 0.014;

/**
 * Crate digging, after risq's cratedigger: once a record is picked out, the ones in
 * front of it tip forward, the ones behind lean further back, and it stands up a little
 * raised in the gap. Every record pivots on its own bottom edge.
 */
const DIG = { forward: 0.3, back: -0.14, shown: -0.02, lift: 0.3 };
export type Dig = "rest" | "front" | "shown" | "back";

/** Where a record's bottom edge sits on the crate floor (crate-local). */
function slotBottom(slot: number) {
  // Standing back from the front wall leaves room for the front records to tip forward
  // without passing through it. Each one further back sits a hair higher, so from above
  // the top strip of every sleeve shows. A little right of centre: a scanned sleeve leans
  // against the crate's left wall.
  return new THREE.Vector3(CRATE.x + 0.045, 0.06 + slot * 0.036, stage.crateFront - CRATE.wall - 0.12 - slot * 0.062);
}

/** A record leaning at `lean` (about x) on its bottom edge, slid `lift` up along itself. */
function slotPose(slot: number, lean: number, lift = 0) {
  const up = new THREE.Vector3(0, Math.cos(lean), Math.sin(lean));
  return inCrate(slotBottom(slot).add(up.multiplyScalar(SLEEVE.h / 2 + lift)), new THREE.Euler(lean, 0, 0));
}

/** A record's resting place: low in the crate, leaning back, one behind the other. */
function restPose(slot: number) {
  return slotPose(slot, restLean(slot));
}

function Record({
  record,
  slot,
  font,
  playing,
  withDisc,
  interactive,
  dig,
  side,
  labels,
  reducedMotion,
  onHover,
  onSelect,
  onSettled,
}: {
  record: RecordSpec;
  /** 0 is the front of the crate. */
  slot: number;
  font: string;
  playing: boolean;
  /** Whether its vinyl (and back cover) exist: from the moment it plays until it is home. */
  withDisc: boolean;
  /** Pointing at it browses it: only once the crate has been clicked open. */
  interactive: boolean;
  /** Its place in the dig: at rest, tipped forward, shown (picked out) or leaning back. */
  dig: Dig;
  side: "a" | "b";
  labels: SceneLabels;
  reducedMotion: boolean;
  onHover: (id: string) => void;
  onSelect: (id: string) => void;
  /** Called once the vinyl is back in its sleeve and the sleeve in its slot. */
  onSettled: (id: string) => void;
}) {
  const sleeve = useRef<THREE.Group>(null);
  const disc = useRef<THREE.Group>(null);
  const spinner = useRef<THREE.Group>(null);
  const startedAt = useRef<number | null>(null);
  const cover = useTexture(() => coverTexture(record, font), [record, font]);
  // The back (track list) only shows once the record is out of the crate.
  const back = useTexture(
    () => backTexture(record, font, { a: labels.sideA, b: labels.sideB }),
    [record, font, labels],
    withDisc,
  );
  const colors = SLEEVES[record.sleeve];
  const edge = useMemo(() => new THREE.Color(colors.sleeve).multiplyScalar(0.5), [colors.sleeve]);
  const rest = useMemo(() => restPose(slot), [slot]);

  const poses = useMemo(() => {
    const restQ = rest.quaternion;
    // 1. Pulled up out of the crate and in front of it, facing the room.
    const liftedPos = inCrate(new THREE.Vector3(CRATE.x, stage.crateTop + 0.62, stage.crateFront + 0.28)).position;
    const liftedQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.05, 0.18, 0));
    // 4. Afterwards it settles back into the front of the crate, standing tall
    //    above the others: the "now playing" sleeve.
    const display = inCrate(
      new THREE.Vector3(CRATE.x, 0.05 + SLEEVE.h / 2 + 0.6, stage.crateFront - CRATE.wall - 0.02),
      new THREE.Euler(-0.12, 0, 0),
    );
    // 2. The vinyl starts inside, just behind the sleeve's back, and slides out of its
    //    open side toward the deck, staying in the sleeve's plane.
    const inPos = liftedPos.clone().add(BEHIND_SLEEVE.clone().applyQuaternion(liftedQ));
    const outPos = inPos.clone().add(SLIDE_OUT.clone().applyQuaternion(liftedQ));
    const discInLiftedQ = liftedQ.clone().multiply(UPRIGHT);
    // On the way back the sleeve comes down straight into its own slot.
    const aboveRest = rest.position.clone().add(new THREE.Vector3(0, 0.78, 0));
    // The dig: where it sits while another record (or itself) is picked out.
    const digPoses: Record<Dig, { position: THREE.Vector3; quaternion: THREE.Quaternion }> = {
      rest,
      front: slotPose(slot, DIG.forward),
      shown: slotPose(slot, DIG.shown, DIG.lift),
      back: slotPose(slot, restLean(slot) + DIG.back),
    };
    return {
      restQ,
      liftedPos,
      liftedQ,
      displayPos: display.position,
      displayQ: display.quaternion,
      inPos,
      outPos,
      discInLiftedQ,
      aboveRest,
      digPoses,
    };
  }, [rest, slot]);
  const scratch = useMemo(() => ({ v: new THREE.Vector3(), q: new THREE.Quaternion() }), []);
  /** How far the last play got (seconds), and when the record started its way back. */
  const playedFor = useRef(0);
  const returnAt = useRef<number | null>(null);

  useFrame((frame, delta) => {
    const s = sleeve.current;
    const d = disc.current;
    if (!s) return;

    if (!playing && startedAt.current !== null) {
      // It was playing: start the way back, unless it never got to the platter.
      startedAt.current = null;
      returnAt.current = playedFor.current > 1.3 && !reducedMotion ? frame.clock.elapsedTime : null;
    }

    if (!playing && returnAt.current !== null) {
      const t = frame.clock.elapsedTime - returnAt.current;
      // Sleeve: up from its "now playing" spot to where the disc can slide in…
      const r1 = easeInOut(phase(t, 0, 0.6));
      // …disc: off the platter in an arc, upright beside the sleeve's open side…
      const r2 = easeInOut(phase(t, 0, 0.85));
      // …then slid back in behind the cover, out of sight…
      const r3 = easeInOut(phase(t, 0.85, 1.4));
      // …and the sleeve goes over its slot and drops straight down into it.
      const r4 = easeInOut(phase(t, 1.35, 1.85));
      const r5 = easeOut(phase(t, 1.8, 2.3));

      s.position.lerpVectors(poses.displayPos, poses.liftedPos, r1);
      s.quaternion.slerpQuaternions(poses.displayQ, poses.liftedQ, r1);
      if (r4 > 0) {
        s.position.lerpVectors(poses.liftedPos, poses.aboveRest, r4).lerp(poses.digPoses[dig].position, r5);
        s.quaternion.slerpQuaternions(poses.liftedQ, poses.digPoses[dig].quaternion, r4);
      }

      if (d) {
        d.position.lerpVectors(stage.platter, poses.outPos, r2).lerp(poses.inPos, r3);
        d.position.y += Math.sin(r2 * Math.PI) * 0.35;
        d.quaternion.slerpQuaternions(side === "b" ? FLIPPED : FLAT, poses.discInLiftedQ, r2);
        d.visible = r3 < 1;
      }
      if (t > 2.3) {
        returnAt.current = null;
        // Home: hidden behind the sleeve; the resting branch keeps it there.
        if (d) d.visible = false;
      }
      frame.invalidate();
      return;
    }

    if (!playing) {
      // In the crate, in its place in the dig.
      const goal = poses.digPoses[dig];
      const k = reducedMotion ? 1 : damp(delta, dig === "shown" ? 8 : 6);
      s.position.lerp(goal.position, k);
      s.quaternion.slerp(goal.quaternion, k);
      let moving = s.position.distanceTo(goal.position) > EPS || s.quaternion.angleTo(goal.quaternion) > EPS;
      if (d) {
        // The vinyl's place is just behind the sleeve's back, hidden by it.
        scratch.q.copy(s.quaternion);
        scratch.v.copy(BEHIND_SLEEVE).applyQuaternion(scratch.q).add(s.position);
        scratch.q.multiply(UPRIGHT);
        if (d.visible && !reducedMotion) {
          // Put back before it ever landed (play cancelled mid-flight): it eases home, then hides.
          const kd = damp(delta, 9);
          d.position.lerp(scratch.v, kd);
          d.quaternion.slerp(scratch.q, kd);
          d.visible = d.position.distanceTo(scratch.v) > 0.03;
          moving ||= d.visible;
        } else {
          // Already home: it rides along with the sleeve, out of sight, so lifting the
          // sleeve to browse never drags a lagging vinyl through its cover.
          d.position.copy(scratch.v);
          d.quaternion.copy(scratch.q);
          d.visible = false;
        }
      }
      if (moving) frame.invalidate();
      else if (withDisc) onSettled(record.id);
      return;
    }

    if (startedAt.current === null) startedAt.current = frame.clock.elapsedTime;
    const t = reducedMotion ? 10 : frame.clock.elapsedTime - startedAt.current;
    playedFor.current = t;
    returnAt.current = null;
    const p1 = easeInOut(phase(t, 0, 0.6));
    const p2 = easeInOut(phase(t, 0.6, 1.25));
    const p3 = easeInOut(phase(t, 1.25, 2.3));
    const p4 = easeInOut(phase(t, 1.4, 2.2));

    s.position.lerpVectors(rest.position, poses.liftedPos, p1).lerp(poses.displayPos, p4);
    s.quaternion.slerpQuaternions(poses.restQ, poses.liftedQ, p1).slerp(poses.displayQ, p4);

    if (d) {
      if (t < 0.6) {
        // Inside the sleeve while it comes up: just behind its back, hidden by it.
        d.quaternion.copy(s.quaternion);
        d.position.copy(BEHIND_SLEEVE).applyQuaternion(d.quaternion).add(s.position);
        d.quaternion.multiply(UPRIGHT);
      } else {
        // Slid out of the open side, then an arc down onto the platter, face up.
        d.position.lerpVectors(poses.inPos, poses.outPos, p2).lerp(stage.platter, p3);
        d.position.y += Math.sin(p3 * Math.PI) * 0.45;
        d.quaternion.slerpQuaternions(poses.discInLiftedQ, side === "b" ? FLIPPED : FLAT, p3);
      }
      d.visible = t > 0.5;
    }
    if (spinner.current && p3 >= 1 && !reducedMotion) spinner.current.rotation.y -= step(delta) * SPIN;
    // A playing record keeps turning, so the loop runs while it plays (and stops when it is put away).
    if (!reducedMotion || t < 0.1) frame.invalidate();
  });

  return (
    <>
      {/* A still hit area where the record rests, so hovering doesn't chase a moving sleeve.
          While it is pulled up the area grows to cover the raised cover too, so a click on
          what you see lands on this record and not on the one behind it. */}
      <mesh
        // Fixed where the record rests, whatever the dig is doing: moving the pointer up and
        // down the strips scrubs through the crate, and moving records never steal the pointer.
        position={[rest.position.x, rest.position.y + 0.08, rest.position.z]}
        // Invisible: three.js still raycasts it, but it costs no draw call.
        visible={false}
        raycast={interactive ? THREE.Mesh.prototype.raycast : NO_RAYCAST}
        quaternion={rest.quaternion}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(record.id);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          // The record stays up: it is the one you are looking at until you pick another.
          document.body.style.cursor = "";
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (e.delta > 8) return;
          onSelect(record.id);
        }}
      >
        <boxGeometry args={[SLEEVE.w, SLEEVE.h + 0.16, 0.045]} />
        <meshBasicMaterial />
      </mesh>

      <group ref={sleeve} position={rest.position} quaternion={rest.quaternion}>
        <mesh geometry={SLEEVE_GEOMETRY} castShadow receiveShadow>
          {/* Groups: edges, cover, back. */}
          <meshStandardMaterial attach="material-0" color={edge} roughness={0.9} />
          <meshStandardMaterial
            key={cover ? "cover" : "cover-blank"}
            attach="material-1"
            map={cover}
            color={cover ? "#fff" : colors.sleeve}
            roughness={0.62}
          />
          <meshStandardMaterial
            key={back ? "back" : "back-blank"}
            attach="material-2"
            map={back}
            color={back ? "#fff" : colors.sleeve}
            roughness={0.62}
          />
        </mesh>
      </group>

      {withDisc && <Disc record={record} font={font} labels={labels} discRef={disc} spinnerRef={spinner} />}
    </>
  );
}

const withMeshopt = (loader: GLTFLoader) => {
  loader.setMeshoptDecoder(MeshoptDecoder);
};

/**
 * Bounds that ignore stray points: a photogrammetry scan carries specks far
 * from the object, so take the 1st–99th percentile of its vertices per axis.
 */
function robustBox(root: THREE.Object3D): THREE.Box3 {
  const xs: number[] = [];
  const ys: number[] = [];
  const zs: number[] = [];
  const v = new THREE.Vector3();
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const pos = mesh.geometry.getAttribute("position");
    const step = Math.max(1, Math.floor(pos.count / 4000));
    for (let i = 0; i < pos.count; i += step) {
      v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
      xs.push(v.x);
      ys.push(v.y);
      zs.push(v.z);
    }
  });
  const at = (a: number[], q: number) => a.sort((m, n) => m - n)[Math.floor((a.length - 1) * q)];
  return new THREE.Box3(
    new THREE.Vector3(at(xs, 0.01), at(ys, 0.005), at(zs, 0.01)),
    new THREE.Vector3(at(xs, 0.99), at(ys, 0.995), at(zs, 0.99)),
  );
}

function shadowed(root: THREE.Object3D) {
  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
}

/** The scanned crate, scaled to hold our sleeves, standing on the table. */
/**
 * The scanned crate. Closed, pointing at it outlines it and a click opens it; open,
 * pointing at its records pulls them up (see Record). Escape or a click elsewhere closes it.
 */
function Crate({
  open,
  hover,
  setHover,
  onOpen,
}: {
  open: boolean;
  hover: boolean;
  setHover: (hover: boolean) => void;
  onOpen: () => void;
}) {
  // The outline changes with no prop on a three object changing, so ask for a frame.
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    invalidate();
  }, [hover, open, invalidate]);
  const gltf = useLoader(GLTFLoader, "/models/crate.glb", withMeshopt);
  const placed = useMemo(() => {
    const scene = gltf.scene.clone(true);
    shadowed(scene);
    const box = robustBox(scene);
    const size = box.getSize(new THREE.Vector3());
    const scale = CRATE.width / size.x;
    const center = box.getCenter(new THREE.Vector3());
    return {
      scene,
      scale,
      position: new THREE.Vector3(CRATE.x - center.x * scale, -box.min.y * scale, -center.z * scale),
      front: (box.max.z - center.z) * scale,
      top: size.y * scale * 0.62,
    };
  }, [gltf]);
  // Share the measurements with the records before they mount (they wait for both models).
  useLayoutEffect(() => {
    stage.crateFront = placed.front;
    stage.crateTop = placed.top;
  }, [placed]);
  return (
    <group position={CRATE_PIVOT} quaternion={CRATE_Q}>
      <Select enabled={open || hover}>
        <primitive object={placed.scene} position={placed.position.clone().sub(CRATE_PIVOT)} scale={placed.scale} />
      </Select>
      {/* The crate's volume, records included, as one invisible target. */}
      <mesh
        visible={false}
        position={[0, 0.62, 0]}
        onPointerOver={() => {
          if (open) return;
          setHover(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHover(false);
          if (!open) document.body.style.cursor = "";
        }}
        onClick={(e) => {
          if (open || e.delta > 8) return;
          e.stopPropagation();
          setHover(false);
          onOpen();
        }}
      >
        <boxGeometry args={[CRATE.width + 0.08, 1.3, placed.front * 2 + 0.08]} />
        <meshBasicMaterial />
      </mesh>
    </group>
  );
}

/**
 * A copy of a geometry with float positions and normals. The models are quantized
 * (16-bit normalized positions), and transforming those in place clamps them to ±1.
 */
function floatGeometry(source: THREE.BufferGeometry): THREE.BufferGeometry {
  const g = source.clone();
  for (const name of ["position", "normal"]) {
    const a = g.getAttribute(name);
    if (!a || a.array instanceof Float32Array) continue;
    const out = new Float32Array(a.count * a.itemSize);
    for (let i = 0; i < a.count; i++)
      for (let k = 0; k < a.itemSize; k++) out[i * a.itemSize + k] = a.getComponent(i, k);
    g.setAttribute(name, new THREE.BufferAttribute(out, a.itemSize));
  }
  return g;
}

/** The turntable, turned to face the room, with its tone arm on a pivot of our own. */
function Deck({ playing, reducedMotion }: { playing: boolean; reducedMotion: boolean }) {
  const gltf = useLoader(GLTFLoader, "/models/deck.glb", withMeshopt);
  const angle = useRef(0);
  const deck = useMemo(() => {
    const scene = gltf.scene.clone(true);
    shadowed(scene);
    scene.updateMatrixWorld(true);
    const byMaterial = (name: string) => {
      const found: THREE.Mesh[] = [];
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.isMesh && (mesh.material as THREE.Material).name === name) found.push(mesh);
      });
      return found;
    };
    // Its own record ("Until I Found You") gives the platter's centre and size, and
    // becomes the template for our vinyl. The deck itself starts empty.
    const record = byMaterial("cd.002")[0];
    const recordBox = new THREE.Box3().setFromObject(record);
    const recordCenter = recordBox.getCenter(new THREE.Vector3());
    const scale = DISC_RADIUS / ((recordBox.max.x - recordBox.min.x) / 2);
    const box = new THREE.Box3().setFromObject(scene);
    const vinylGeometry = floatGeometry(record.geometry)
      .applyMatrix4(record.matrixWorld)
      .translate(-recordCenter.x, -recordCenter.y, -recordCenter.z)
      .scale(scale, scale, scale);
    const vinylHalf = ((recordBox.max.y - recordBox.min.y) / 2) * scale;
    record.removeFromParent();
    // Under the record the model has a flat pure-black disc that, with the platter empty,
    // reads as a hole or a shadow. Make it a felt mat: dark, matte, a little lighter.
    for (const mat of byMaterial("black_plane.circle"))
      mat.material = new THREE.MeshStandardMaterial({ color: "#36343c", roughness: 0.95, metalness: 0 });

    // Tone arm: shaft and head shell swing around the far end of the shaft.
    const shaft = byMaterial("tone_arm")[0];
    const armBox = new THREE.Box3().setFromObject(shaft);
    const pivot = new THREE.Group();
    pivot.position.set((armBox.min.x + armBox.max.x) / 2, armBox.min.y, armBox.max.z);
    scene.add(pivot);
    for (const part of [...byMaterial("tone_arm"), ...byMaterial("head_shell")]) pivot.attach(part);

    // Turned 180° about y so its controls face the room: the record's centre
    // (x, z) lands at (-x, -z), so offset by +x, +z to put it at DECK.
    const position = new THREE.Vector3(
      DECK.x + recordCenter.x * scale,
      -box.min.y * scale,
      DECK.z + recordCenter.z * scale,
    );
    // Our record's centre sits where the model's record sat.
    const platterY = (recordCenter.y - box.min.y) * scale;
    return { scene, scale, position, pivot, platterY, vinylGeometry, vinylMaterial: record.material, vinylHalf };
  }, [gltf]);
  const parts = useRef<{ pivot: THREE.Object3D } | null>(null);
  useLayoutEffect(() => {
    parts.current = { pivot: deck.pivot };
    stage.platter.set(DECK.x, deck.platterY, DECK.z);
    deck.scene.updateWorldMatrix(true, true);
    stage.deck.setFromObject(deck.scene);
    vinyl.geometry = deck.vinylGeometry;
    vinyl.material = deck.vinylMaterial as THREE.Material;
    vinyl.half = deck.vinylHalf;
  }, [deck]);

  useFrame(({ invalidate }, delta) => {
    const p = parts.current;
    if (!p) return;
    const target = playing ? 0 : 0.42;
    angle.current += (target - angle.current) * (reducedMotion ? 1 : damp(delta, playing ? 1.4 : 3));
    p.pivot.rotation.y = angle.current;
    if (Math.abs(target - angle.current) > EPS) invalidate();
  });

  return (
    <>
      <primitive object={deck.scene} position={deck.position} rotation={[0, Math.PI, 0]} scale={deck.scale} />
      <PilotLight playing={playing} />
    </>
  );
}

/** The deck's pilot lamp: dark when idle, a warm glow (picked up by bloom) while it plays. */
function PilotLight({ playing }: { playing: boolean }) {
  const material = useRef<THREE.MeshStandardMaterial>(null);
  const glow = useRef<THREE.PointLight>(null);
  useFrame(({ invalidate }, delta) => {
    const k = damp(delta, 4);
    const goal = playing ? 6 : 0.15;
    if (material.current) material.current.emissiveIntensity += (goal - material.current.emissiveIntensity) * k;
    if (glow.current) glow.current.intensity += ((playing ? 0.35 : 0) - glow.current.intensity) * k;
    if (material.current && Math.abs(goal - material.current.emissiveIntensity) > 0.01) invalidate();
  });
  return (
    <group position={[stage.platter.x - 0.42, stage.platter.y - 0.07, stage.platter.z + 0.31]}>
      <mesh>
        <sphereGeometry args={[0.012, 16, 16]} />
        <meshStandardMaterial
          ref={material}
          color="#ff7a3c"
          emissive="#ff7a3c"
          emissiveIntensity={0.15}
          toneMapped={false}
        />
      </mesh>
      <pointLight ref={glow} color="#ff8a4c" intensity={0} distance={0.6} decay={2} />
    </group>
  );
}

function Room() {
  const wood = useMemo(() => {
    const t = woodTexture("#3b2a1f", "#140c08");
    t.repeat.set(4, 3.5);
    return t;
  }, []);
  useEffect(() => () => wood.dispose(), [wood]);
  return (
    <>
      {/* The tabletop, and a wall far behind it that the lamp barely reaches. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 2]} receiveShadow>
        <planeGeometry args={[14, 12]} />
        <meshStandardMaterial map={wood} roughness={0.55} />
      </mesh>
      <mesh position={[0, 2, -2.2]} receiveShadow>
        <planeGeometry args={[20, 8]} />
        <meshStandardMaterial color="#1a1622" roughness={1} />
      </mesh>
    </>
  );
}

/** Night light: a warm lamp over the table, a cool rim from behind, and a spot that finds what plays. */
function Lights({ playing }: { playing: boolean }) {
  const focus = useRef<THREE.SpotLight>(null);
  const focusTarget = useMemo(() => new THREE.Object3D(), []);
  useFrame(({ invalidate }, delta) => {
    const light = focus.current;
    if (!light) return;
    const goal = playing ? 9 : 0;
    light.intensity += (goal - light.intensity) * damp(delta, 3);
    focusTarget.position.copy(stage.platter);
    if (Math.abs(goal - light.intensity) > 0.01) invalidate();
  });
  return (
    <>
      <ambientLight intensity={0.35} color="#9a8fc4" />
      <hemisphereLight args={["#3a3355", "#1b130e", 0.6]} />
      {/* The lamp: warm, above and to the left, casting the shadows. */}
      <spotLight
        position={[-1.6, 3.2, 2.2]}
        angle={0.6}
        penumbra={0.9}
        decay={0}
        intensity={3.4}
        color="#ffcf9a"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0003}
      />
      {/* Cool light from behind outlines the crate and the deck. */}
      <directionalLight position={[2.5, 2, -3]} intensity={1.1} color="#7f8cff" />
      <primitive object={focusTarget} />
      <spotLight
        ref={focus}
        position={[DECK.x + 0.4, 2.6, 1.2]}
        angle={0.32}
        penumbra={0.8}
        decay={0}
        intensity={0}
        color="#fff1dc"
        target={focusTarget}
      />
    </>
  );
}

function CameraRig({
  selected,
  panel,
  reducedMotion,
}: {
  selected: string | null;
  panel: SceneProps["panel"];
  reducedMotion: boolean;
}) {
  const { camera, size, invalidate } = useThree();
  const pointer = useRef({ x: 0, y: 0 });
  const look = useRef(new THREE.Vector3(0, 0.5, 0));
  const goalPos = useRef(new THREE.Vector3());
  const goalLook = useRef(new THREE.Vector3());
  /** Which record the camera last saw chosen, and when: it waits for the vinyl to land. */
  const chosen = useRef<{ id: string | null; at: number }>({ id: null, at: 0 });

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.current = { x: (e.clientX / window.innerWidth) * 2 - 1, y: (e.clientY / window.innerHeight) * 2 - 1 };
      // The parallax follows the pointer, so a move wakes the on-demand loop.
      if (!reducedMotion) invalidate();
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [invalidate, reducedMotion]);

  useFrame((frame, delta) => {
    const aspect = size.width / Math.max(size.height, 1);
    const tan = Math.tan(THREE.MathUtils.degToRad(32 / 2));
    const wide = aspect >= 1.2;
    const pos = goalPos.current;
    const target = goalLook.current;
    if (selected !== chosen.current.id) chosen.current = { id: selected, at: frame.clock.elapsedTime };
    const spinning =
      selected !== null && (reducedMotion || frame.clock.elapsedTime - chosen.current.at > SPINNING_AFTER);
    let speed = 2.4;
    if (spinning) {
      // Once the record turns, rise over the turntable and look down on it, framed in the
      // part of the screen the notes leave free (left of the panel, or above the sheet).
      const c = stage.deck.getCenter(new THREE.Vector3());
      const s = stage.deck.getSize(new THREE.Vector3());
      const freeW = panel.side === "right" ? 1 - panel.share : 1;
      const freeH = panel.side === "bottom" ? 1 - panel.share : 1;
      const tilt = 0.3; // a little toward the room, so it reads as a turntable and not a plan
      const h = Math.max((s.x * 1.3) / (2 * tan * aspect * freeW), (s.z * 1.45) / (2 * tan * freeH));
      const dx = panel.side === "right" ? (2 * h * tan * aspect * panel.share) / 2 : 0;
      const dz = panel.side === "bottom" ? (2 * h * tan * panel.share) / 2 : 0;
      target.set(c.x + dx, c.y, c.z + dz);
      pos.set(c.x + dx, c.y + h, c.z + dz + h * tilt);
      speed = 1.7;
    } else if (selected) {
      // Frame the crate front and the deck in the part of the screen the notes leave free.
      const free = panel.side === "right" ? 1 - panel.share : 1;
      const z = Math.max(
        (panel.side === "bottom" ? 4.4 : 4) / (2 * tan * aspect * free),
        (panel.side === "bottom" ? 1.5 / (1 - panel.share) : 1.6) / (2 * tan),
      );
      const visibleW = 2 * z * tan * aspect;
      const visibleH = 2 * z * tan;
      const cx = (CRATE.x + DECK.x) / 2 - 0.2;
      const dx = panel.side === "right" ? (visibleW * panel.share) / 2 : 0;
      const dy = panel.side === "bottom" ? -(visibleH * panel.share) / 2 : 0;
      target.set(cx + dx, 0.5 + dy, 0);
      // Keep the eye above the table; looking down puts the scene in the free area.
      pos.set(cx + dx, Math.max(2.1 + dy, 1.9), z * 0.9);
    } else {
      const z = wide ? Math.max(4.9 / (2 * tan * aspect), 2.3 / (2 * tan)) : 3.3 / (2 * tan * aspect);
      // Pushed right a little: the left column holds the intro and the record procession.
      const shift = wide ? -0.92 : 0.05;
      // From above, so the eye looks down into the crate across the sleeves' top edges.
      target.set(shift, wide ? 0.4 : 1.2, 0);
      pos.set(shift, wide ? 3.3 : 3.8, z * 0.94);
      if (!reducedMotion) {
        pos.x += pointer.current.x * 0.12;
        pos.y -= pointer.current.y * 0.06;
      }
    }
    const k = reducedMotion ? 1 : damp(delta, speed);
    camera.position.lerp(pos, k);
    // Fog fades the room behind the stage, measured from wherever the camera is
    // (a phone frames the scene from much further back).
    const fog = frame.scene.fog;
    if (fog instanceof THREE.Fog) {
      const reach = camera.position.distanceTo(look.current);
      fog.near = reach + 0.6;
      fog.far = reach + 4.5;
    }
    look.current.lerp(target, k);
    camera.lookAt(look.current);
    const waiting = selected !== null && !spinning;
    if (waiting || camera.position.distanceTo(pos) > 2e-3 || look.current.distanceTo(target) > 2e-3) frame.invalidate();
  });
  return null;
}

/** A record's place in the dig, given the index of the record picked out (-1: none). */
function digOf(index: number, picked: number): Dig {
  if (picked < 0) return "rest";
  if (index === picked) return "shown";
  return index < picked ? "front" : "back";
}

/** Mounts after the models inside the same Suspense boundary: the stage measurements are then set. */
function Ready({ onReady }: { onReady: () => void }) {
  useEffect(() => onReady(), [onReady]);
  return null;
}

function Scene({
  records,
  selected,
  side,
  reducedMotion,
  labels,
  panel,
  browsed,
  onBrowse,
  onSelect,
  font,
  crateOpen,
  onCrateOpen,
}: SceneProps & { font: string; crateOpen: boolean; onCrateOpen: (open: boolean) => void }) {
  const [modelsReady, setModelsReady] = useState(false);
  const [crateHover, setCrateHover] = useState(false);
  // The crate is browsable by pointer only while open, and never while a record plays.
  const open = crateOpen && selected === null;
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCrateOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCrateOpen]);
  const invalidate = useThree((state) => state.invalidate);
  // Records whose vinyl is out: the playing one plus any still on their way home.
  // (Adjusted while rendering, React's pattern for state derived from a changing prop.)
  const [out, setOut] = useState<string[]>(selected ? [selected] : []);
  const [lastSelected, setLastSelected] = useState(selected);
  if (selected !== lastSelected) {
    setLastSelected(selected);
    if (selected && !out.includes(selected)) setOut([...out, selected]);
  }
  const settle = useCallback(
    (id: string) =>
      setOut((current) => (current.includes(id) && id !== selected ? current.filter((x) => x !== id) : current)),
    [selected],
  );
  useEffect(() => {
    invalidate();
  }, [invalidate, selected, browsed, side, panel, modelsReady, open]);
  return (
    <Selection>
      <fog attach="fog" args={[BG, 4.5, 11]} />
      <Room />
      <Lights playing={selected !== null} />
      <Suspense fallback={null}>
        <Crate open={open} hover={crateHover} setHover={setCrateHover} onOpen={() => onCrateOpen(true)} />
        <Deck playing={selected !== null} reducedMotion={reducedMotion} />
        <Ready onReady={() => setModelsReady(true)} />
      </Suspense>
      {modelsReady &&
        records.map((record, i) => (
          <Record
            key={record.id}
            record={record}
            // The first record in the catalogue stands at the front of the crate.
            slot={i}
            font={font}
            playing={selected === record.id}
            withDisc={out.includes(record.id)}
            interactive={open}
            dig={digOf(i, selected ? -1 : records.findIndex((r) => r.id === browsed))}
            side={side}
            labels={labels}
            reducedMotion={reducedMotion}
            onHover={onBrowse}
            onSelect={(id) => {
              onCrateOpen(false);
              onSelect(id);
            }}
            onSettled={settle}
          />
        ))}
      <CameraRig selected={selected} panel={panel} reducedMotion={reducedMotion} />
      <EffectComposer multisampling={4} autoClear={false}>
        {/* The crate's outline: soft ink while pointed at, lime once open. Mounted only
            then, because the pass costs extra draws on every frame it exists. */}
        {open || crateHover ? (
          <Outline
            visibleEdgeColor={open ? 0xe1ef4a : 0xf1ede4}
            hiddenEdgeColor={0x000000}
            edgeStrength={open ? 6 : 4}
            blur
            xRay={false}
          />
        ) : (
          <></>
        )}
        <Bloom intensity={0.55} luminanceThreshold={0.95} luminanceSmoothing={0.2} mipmapBlur />
        <Vignette offset={0.32} darkness={0.72} />
      </EffectComposer>
    </Selection>
  );
}

export default function ShelfScene(
  props: SceneProps & {
    running: boolean;
    onReady: () => void;
    /** A click on the scene that hit nothing. */
    onMiss: () => void;
  },
) {
  const { running, onReady, onMiss, ...scene } = props;
  const [font, setFont] = useState<string | null>(null);
  const [crateOpen, setCrateOpen] = useState(false);
  useEffect(() => {
    document.fonts.ready.then(() => setFont(getComputedStyle(document.body).fontFamily));
  }, []);

  return (
    <Canvas
      className="shelf-canvas"
      shadows
      // Draw only when something moves; a 1.5× cap keeps retina screens light.
      frameloop={running ? "demand" : "never"}
      dpr={[1, 1.5]}
      camera={{ position: [0, 1.8, 6], fov: 32, near: 0.05, far: 40 }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      onCreated={() => onReady()}
      onPointerMissed={() => {
        setCrateOpen(false);
        onMiss();
      }}
      aria-hidden
    >
      <color attach="background" args={[BG]} />
      {font && <Scene {...scene} font={font} crateOpen={crateOpen} onCrateOpen={setCrateOpen} />}
    </Canvas>
  );
}
