"use client";

import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
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

const SLEEVE = { w: 1, h: 1, d: 0.014 };
const DISC_RADIUS = 0.47;
const CRATE = { x: -0.95, width: 1.32, wall: 0.07 };
const DECK = { x: 0.82, z: 0.05 };
const BG = "#0e0c13";

/** Filled in once the models load: where the crate's front is, where a record plays. */
const stage = {
  crateFront: 0.4,
  crateTop: 0.45,
  platter: new THREE.Vector3(DECK.x, 0.3, DECK.z),
};

const FLAT = new THREE.Quaternion();
const FLIPPED = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI, 0, 0));
const UPRIGHT = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));

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
  onSelect: (id: string) => void;
}

const damp = (delta: number, speed: number) => 1 - Math.exp(-delta * speed);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
/** Progress of a phase that runs from `start` to `end` seconds. */
const phase = (t: number, start: number, end: number) => clamp01((t - start) / (end - start));

function useTexture<T extends THREE.Texture>(make: () => T | Promise<T>, deps: unknown[]): T | null {
  const [texture, setTexture] = useState<T | null>(null);
  useEffect(() => {
    let alive = true;
    let made: T | null = null;
    Promise.resolve(make()).then((t) => {
      made = t;
      if (alive) setTexture(t);
      else t.dispose();
    });
    return () => {
      alive = false;
      made?.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return texture;
}

/** A record's resting place: at the front of the crate, leaning back, one behind the other. */
function restPose(slot: number) {
  // Each record further back leans a touch more and stands a little higher (on
  // the ones packed under it), so the top of every sleeve shows, like in a crate.
  const lean = -0.18 - slot * 0.012;
  const z = stage.crateFront - CRATE.wall - 0.09 - slot * 0.05;
  return {
    position: new THREE.Vector3(CRATE.x, 0.06 + slot * 0.068 + (SLEEVE.h / 2) * Math.cos(lean), z),
    rotation: new THREE.Euler(lean, 0, 0),
  };
}

function Record({
  record,
  slot,
  font,
  playing,
  hovered,
  side,
  labels,
  reducedMotion,
  onHover,
  onSelect,
}: {
  record: RecordSpec;
  /** 0 is the front of the crate. */
  slot: number;
  font: string;
  playing: boolean;
  hovered: boolean;
  side: "a" | "b";
  labels: SceneLabels;
  reducedMotion: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}) {
  const sleeve = useRef<THREE.Group>(null);
  const disc = useRef<THREE.Group>(null);
  const spinner = useRef<THREE.Group>(null);
  const startedAt = useRef<number | null>(null);
  const cover = useTexture(() => coverTexture(record, font), [record, font]);
  const back = useTexture(
    () => backTexture(record, font, { a: labels.sideA, b: labels.sideB }),
    [record, font, labels],
  );
  const labelA = useTexture(() => labelTexture(record, font, labels.sideA), [record, font, labels.sideA]);
  const labelB = useTexture(() => labelTexture(record, font, labels.sideB), [record, font, labels.sideB]);
  const colors = SLEEVES[record.sleeve];
  const rest = useMemo(() => restPose(slot), [slot]);

  const poses = useMemo(() => {
    const restQ = new THREE.Quaternion().setFromEuler(rest.rotation);
    // 1. Pulled up out of the crate, turned a little toward the room.
    const liftedPos = new THREE.Vector3(CRATE.x, stage.crateTop + 0.62, stage.crateFront + 0.28);
    const liftedQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.05, 0.12, 0));
    // 4. Afterwards it settles back into the front of the crate, standing tall
    //    above the others: the "now playing" sleeve.
    const displayPos = new THREE.Vector3(CRATE.x, rest.position.y + 0.62, stage.crateFront - CRATE.wall - 0.02);
    const displayQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.12, 0, 0));
    // 2. The vinyl slides out of the sleeve's open side, toward the deck.
    const outPos = liftedPos.clone().add(new THREE.Vector3(0.78, 0.02, 0.03));
    const discInLiftedQ = liftedQ.clone().multiply(UPRIGHT);
    return { restQ, liftedPos, liftedQ, displayPos, displayQ, outPos, discInLiftedQ };
  }, [rest]);
  const scratch = useMemo(() => ({ v: new THREE.Vector3(), q: new THREE.Quaternion() }), []);

  useFrame((frame, delta) => {
    const s = sleeve.current;
    const d = disc.current;
    if (!s || !d) return;

    if (!playing) {
      startedAt.current = null;
      // Back in the crate; a hovered record is pulled half out so its cover shows.
      scratch.v.copy(rest.position);
      if (hovered) scratch.v.add(new THREE.Vector3(0, 0.34, 0.05));
      const k = reducedMotion ? 1 : damp(delta, hovered ? 12 : 7);
      s.position.lerp(scratch.v, k);
      s.quaternion.slerp(poses.restQ, k);
      // The vinyl slips back into its sleeve before it disappears.
      const kd = reducedMotion ? 1 : damp(delta, 9);
      d.position.lerp(s.position, kd);
      d.quaternion.slerp(scratch.q.copy(s.quaternion).multiply(UPRIGHT), kd);
      d.visible = d.position.distanceTo(s.position) > 0.03;
      return;
    }

    if (startedAt.current === null) startedAt.current = frame.clock.elapsedTime;
    const t = reducedMotion ? 10 : frame.clock.elapsedTime - startedAt.current;
    const p1 = easeInOut(phase(t, 0, 0.6));
    const p2 = easeOut(phase(t, 0.55, 1.15));
    const p3 = easeInOut(phase(t, 1.15, 2.2));
    const p4 = easeInOut(phase(t, 1.3, 2.1));

    s.position.lerpVectors(rest.position, poses.liftedPos, p1).lerp(poses.displayPos, p4);
    s.quaternion.slerpQuaternions(poses.restQ, poses.liftedQ, p1).slerp(poses.displayQ, p4);

    if (t < 0.55) {
      d.position.copy(s.position);
      d.quaternion.copy(s.quaternion).multiply(UPRIGHT);
    } else {
      // Out of the sleeve, then an arc down onto the platter, face up.
      d.position.lerpVectors(poses.liftedPos, poses.outPos, p2).lerp(stage.platter, p3);
      d.position.y += Math.sin(p3 * Math.PI) * 0.45;
      d.quaternion.slerpQuaternions(poses.discInLiftedQ, side === "b" ? FLIPPED : FLAT, p3);
    }
    d.visible = t > 0.5;
    if (spinner.current && p3 >= 1 && !reducedMotion) spinner.current.rotation.y -= delta * 3.5; // 33⅓ rpm
  });

  return (
    <>
      {/* A still hit area where the record rests, so hovering doesn't chase a moving sleeve. */}
      <mesh
        position={[rest.position.x, rest.position.y + 0.08, rest.position.z]}
        rotation={rest.rotation}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(record.id);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          onHover(null);
          document.body.style.cursor = "";
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (e.delta > 8) return;
          onSelect(record.id);
        }}
      >
        <boxGeometry args={[SLEEVE.w, SLEEVE.h + 0.16, 0.045]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <group ref={sleeve} position={rest.position} rotation={rest.rotation}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[SLEEVE.w, SLEEVE.h, SLEEVE.d]} />
          {/* Box faces: +x, -x, +y, -y, +z cover, -z back. */}
          <meshStandardMaterial attach="material-0" color={colors.sleeve} roughness={0.75} />
          <meshStandardMaterial attach="material-1" color={colors.sleeve} roughness={0.75} />
          <meshStandardMaterial attach="material-2" color={colors.sleeve} roughness={0.75} />
          <meshStandardMaterial attach="material-3" color={colors.sleeve} roughness={0.75} />
          <meshStandardMaterial
            key={cover ? "cover" : "cover-blank"}
            attach="material-4"
            map={cover}
            color={cover ? "#fff" : colors.sleeve}
            roughness={0.62}
          />
          <meshStandardMaterial
            key={back ? "back" : "back-blank"}
            attach="material-5"
            map={back}
            color={back ? "#fff" : colors.sleeve}
            roughness={0.62}
          />
        </mesh>
      </group>

      <group ref={disc} visible={false}>
        <group ref={spinner}>
          <mesh castShadow>
            <cylinderGeometry args={[DISC_RADIUS, DISC_RADIUS, 0.01, 128]} />
            <meshPhysicalMaterial
              color="#0d0d10"
              roughness={0.28}
              metalness={0.2}
              clearcoat={0.8}
              clearcoatRoughness={0.25}
            />
          </mesh>
          {/* Paper labels on both faces: side A up, side B down. */}
          <mesh position={[0, 0.0055, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.16, 64]} />
            <meshStandardMaterial key={labelA ? "a" : "a0"} map={labelA} roughness={0.8} />
          </mesh>
          <mesh position={[0, -0.0055, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.16, 64]} />
            <meshStandardMaterial key={labelB ? "b" : "b0"} map={labelB} roughness={0.8} />
          </mesh>
        </group>
      </group>
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
function Crate() {
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
  return <primitive object={placed.scene} position={placed.position} scale={placed.scale} />;
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
    // Its own record ("Until I Found You") gives the platter's centre and size.
    const record = byMaterial("cd.002")[0];
    const recordBox = new THREE.Box3().setFromObject(record);
    const recordCenter = recordBox.getCenter(new THREE.Vector3());
    const scale = DISC_RADIUS / ((recordBox.max.x - recordBox.min.x) / 2);
    const box = new THREE.Box3().setFromObject(scene);

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
    const platterY = (recordBox.max.y - box.min.y) * scale + 0.004;
    return { scene, scale, position, record, pivot, platterY };
  }, [gltf]);
  const parts = useRef<{ record: THREE.Object3D; pivot: THREE.Object3D } | null>(null);
  useLayoutEffect(() => {
    parts.current = { record: deck.record, pivot: deck.pivot };
    stage.platter.set(DECK.x, deck.platterY, DECK.z);
  }, [deck]);

  useFrame((_, delta) => {
    const p = parts.current;
    if (!p) return;
    // The model's own record steps aside for ours.
    p.record.visible = !playing;
    const target = playing ? 0 : 0.42;
    angle.current += (target - angle.current) * (reducedMotion ? 1 : damp(delta, playing ? 1.4 : 3));
    p.pivot.rotation.y = angle.current;
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
  useFrame((_, delta) => {
    const k = damp(delta, 4);
    if (material.current)
      material.current.emissiveIntensity += ((playing ? 6 : 0.15) - material.current.emissiveIntensity) * k;
    if (glow.current) glow.current.intensity += ((playing ? 0.35 : 0) - glow.current.intensity) * k;
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
  useFrame((_, delta) => {
    const light = focus.current;
    if (!light) return;
    light.intensity += ((playing ? 9 : 0) - light.intensity) * damp(delta, 3);
    focusTarget.position.copy(stage.platter);
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
        shadow-mapSize={[2048, 2048]}
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
  const { camera, size } = useThree();
  const pointer = useRef({ x: 0, y: 0 });
  const look = useRef(new THREE.Vector3(0, 0.5, 0));
  const goalPos = useRef(new THREE.Vector3());
  const goalLook = useRef(new THREE.Vector3());

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.current = { x: (e.clientX / window.innerWidth) * 2 - 1, y: (e.clientY / window.innerHeight) * 2 - 1 };
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useFrame((frame, delta) => {
    const aspect = size.width / Math.max(size.height, 1);
    const tan = Math.tan(THREE.MathUtils.degToRad(32 / 2));
    const wide = aspect >= 1.2;
    const pos = goalPos.current;
    const target = goalLook.current;
    if (selected) {
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
      target.set(cx + dx, 0.6 + dy, 0);
      // Keep the eye above the table; looking down puts the scene in the free area.
      pos.set(cx + dx, Math.max(1.45 + dy, 1.3), z * 0.92);
    } else {
      const z = wide ? Math.max(4.9 / (2 * tan * aspect), 2.3 / (2 * tan)) : 3.3 / (2 * tan * aspect);
      const shift = wide ? -0.8 : 0.05;
      target.set(shift, wide ? 0.55 : 1.45, 0);
      pos.set(shift, wide ? 2.05 : 2.6, z);
      if (!reducedMotion) {
        pos.x += pointer.current.x * 0.12;
        pos.y -= pointer.current.y * 0.06;
      }
    }
    const k = reducedMotion ? 1 : damp(delta, 2.4);
    camera.position.lerp(pos, k);
    // Fog fades the room behind the stage, measured from wherever the camera is
    // (a phone frames the scene from much further back).
    const fog = frame.scene.fog;
    if (fog instanceof THREE.Fog) {
      const reach = camera.position.distanceTo(look.current);
      fog.near = reach + 0.6;
      fog.far = reach + 6.5;
    }
    look.current.lerp(target, k);
    camera.lookAt(look.current);
  });
  return null;
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
  onSelect,
  font,
}: SceneProps & { font: string }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [modelsReady, setModelsReady] = useState(false);
  return (
    <>
      <fog attach="fog" args={[BG, 4.5, 11]} />
      <Room />
      <Lights playing={selected !== null} />
      <Suspense fallback={null}>
        <Crate />
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
            hovered={hovered === record.id && !selected}
            side={side}
            labels={labels}
            reducedMotion={reducedMotion}
            onHover={setHovered}
            onSelect={onSelect}
          />
        ))}
      <CameraRig selected={selected} panel={panel} reducedMotion={reducedMotion} />
      <EffectComposer multisampling={4}>
        <Bloom intensity={0.55} luminanceThreshold={0.82} luminanceSmoothing={0.2} mipmapBlur />
        <Vignette offset={0.32} darkness={0.72} />
      </EffectComposer>
    </>
  );
}

export default function ShelfScene(props: SceneProps & { running: boolean; onReady: () => void }) {
  const { running, onReady, ...scene } = props;
  const [font, setFont] = useState<string | null>(null);
  useEffect(() => {
    document.fonts.ready.then(() => setFont(getComputedStyle(document.body).fontFamily));
  }, []);

  return (
    <Canvas
      className="shelf-canvas"
      shadows
      frameloop={running ? "always" : "never"}
      dpr={[1, 2]}
      camera={{ position: [0, 1.8, 6], fov: 32, near: 0.05, far: 40 }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      onCreated={() => onReady()}
      aria-hidden
    >
      <color attach="background" args={[BG]} />
      {font && <Scene {...scene} font={font} />}
    </Canvas>
  );
}
