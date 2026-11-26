'use client';

import { useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { DoubleSide, PerspectiveCamera } from 'three';
import type { BodyName, PlanetPosition } from './SolarSystem';
import {
  displayPosition, displayRadius, ORBIT_AU, PLANET_COLORS, PLANET_NAMES, PLANET_RADII,
} from './SolarSystem2D';
import styles from './SolarSystem.module.css';

type Props = {
  positions: PlanetPosition[];
  comparisonPositions?: PlanetPosition[];
  selected: BodyName;
  onSelect: (name: BodyName) => void;
  lang: 'en' | 'fr';
  view: 'perspective' | 'overhead';
  active: boolean;
  reducedMotion: boolean;
  onContextLost: () => void;
};

function CameraRig({ view }: { view: Props['view'] }) {
  const { camera, size, invalidate } = useThree();

  useEffect(() => {
    const aspect = size.width / Math.max(size.height, 1);
    const factor = Math.max(1, 1.35 / aspect);
    if (view === 'overhead') camera.position.set(0, 44 * factor, 0.01);
    else camera.position.set(0, 27 * factor, 38 * factor);
    camera.lookAt(0, 0, 0);
    if (camera instanceof PerspectiveCamera) camera.updateProjectionMatrix();
    invalidate();
  }, [camera, size.width, size.height, view, invalidate]);

  return null;
}

function Planet({ planet, selected, onSelect }: {
  planet: PlanetPosition;
  selected: boolean;
  onSelect: Props['onSelect'];
}) {
  const radius = PLANET_RADII[planet.name];
  const color = PLANET_COLORS[planet.name];
  const position = displayPosition(planet);

  return (
    <group position={position} onClick={(event) => { event.stopPropagation(); onSelect(planet.name); }}>
      {selected && (
        <mesh>
          <sphereGeometry args={[radius * 1.43, 20, 12]} />
          <meshBasicMaterial color="#f4dfae" transparent opacity={0.18} depthWrite={false} />
        </mesh>
      )}
      {planet.name === 'Saturn' && (
        <mesh rotation={[-Math.PI / 2.7, 0.15, 0]}>
          <ringGeometry args={[radius * 1.55, radius * 2.45, 80]} />
          <meshStandardMaterial color="#d9c7a3" side={DoubleSide} transparent opacity={0.72} roughness={1} />
        </mesh>
      )}
      <mesh>
        <sphereGeometry args={[radius, 28, 18]} />
        <meshStandardMaterial color={color} roughness={0.9} metalness={0.02} />
      </mesh>
    </group>
  );
}

function SolarBodies({ positions, comparisonPositions, selected, onSelect }: Pick<Props, 'positions' | 'comparisonPositions' | 'selected' | 'onSelect'>) {
  const byName = new Map(positions.map((planet) => [planet.name, planet]));
  const comparisonByName = new Map(comparisonPositions?.map((planet) => [planet.name, planet]) ?? []);

  return (
    <>
      <ambientLight intensity={1.35} />
      <pointLight position={[0, 0, 0]} intensity={85} distance={36} decay={2} color="#ffe3b0" />
      {PLANET_NAMES.map((name) => {
        const radius = displayRadius(ORBIT_AU[name]);
        return (
          <mesh key={`orbit-${name}`} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[radius - 0.011, radius + 0.011, 192]} />
            <meshBasicMaterial color="#6483a5" side={DoubleSide} transparent opacity={0.34} depthWrite={false} />
          </mesh>
        );
      })}
      <mesh onClick={(event) => { event.stopPropagation(); onSelect('Sun'); }}>
        <sphereGeometry args={[0.96, 40, 28]} />
        <meshBasicMaterial color="#f4c675" />
      </mesh>
      {selected === 'Sun' && (
        <mesh scale={1.34}>
          <sphereGeometry args={[0.96, 32, 20]} />
          <meshBasicMaterial color="#fbe9bc" transparent opacity={0.16} depthWrite={false} />
        </mesh>
      )}
      <mesh scale={1.24}>
        <sphereGeometry args={[0.96, 32, 20]} />
        <meshBasicMaterial color="#e6a655" transparent opacity={0.095} depthWrite={false} />
      </mesh>
      {PLANET_NAMES.map((name) => {
        const planet = byName.get(name);
        const comparison = comparisonByName.get(name);
        if (!planet) return null;
        return (
          <group key={name}>
            {comparison && (
              <group position={displayPosition(comparison)}>
                <mesh rotation={[-Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[PLANET_RADII[name] * 1.3, PLANET_RADII[name] * 1.7, 40]} />
                  <meshBasicMaterial color={PLANET_COLORS[name]} side={DoubleSide} transparent opacity={0.8} depthWrite={false} />
                </mesh>
                <mesh>
                  <sphereGeometry args={[PLANET_RADII[name] * 0.48, 12, 8]} />
                  <meshBasicMaterial color={PLANET_COLORS[name]} transparent opacity={0.45} depthWrite={false} />
                </mesh>
              </group>
            )}
            <Planet planet={planet} selected={selected === name} onSelect={onSelect} />
          </group>
        );
      })}
    </>
  );
}

export default function SolarSystemScene({ positions, comparisonPositions, selected, onSelect, view, active, reducedMotion, onContextLost }: Props) {
  return (
    <Canvas
      className={styles.canvas}
      dpr={[1, 1.7]}
      frameloop={active ? 'demand' : 'never'}
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      camera={{ position: [0, 27, 38], fov: 47, near: 0.1, far: 260 }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener('webglcontextlost', onContextLost, { once: true });
      }}
    >
      <CameraRig view={view} />
      <SolarBodies positions={positions} comparisonPositions={comparisonPositions} selected={selected} onSelect={onSelect} />
      <OrbitControls
        key={view}
        makeDefault
        target={[0, 0, 0]}
        enableRotate={view === 'perspective'}
        enableZoom
        enablePan
        enableDamping={!reducedMotion}
        dampingFactor={0.08}
        minDistance={6}
        maxDistance={145}
        minPolarAngle={0.02}
        maxPolarAngle={Math.PI / 2 - 0.025}
      />
    </Canvas>
  );
}
