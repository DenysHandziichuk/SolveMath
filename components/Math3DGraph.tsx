"use client";

import React, { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Grid, Center } from '@react-three/drei';
import * as THREE from 'three';

interface Math3DGraphProps {
  type?: 'pyramid' | 'box' | 'vectors';
  data?: unknown;
}

function Pyramid({ height = 3, width = 3 }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Create a pyramid geometry
  const geometry = new THREE.ConeGeometry(width, height, 4);
  
  return (
    <mesh ref={meshRef} rotation={[0, Math.PI / 4, 0]}>
      <primitive object={geometry} attach="geometry" />
      <meshStandardMaterial color="#6366f1" wireframe />
    </mesh>
  );
}

function Scene({ type = 'pyramid' }: { type?: string }) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      <Grid infiniteGrid fadeDistance={50} cellColor="#333" sectionColor="#666" />
      <Center top>
        {type === 'pyramid' && <Pyramid />}
        {type === 'box' && (
          <mesh>
            <boxGeometry args={[3, 2, 4]} />
            <meshStandardMaterial color="#6366f1" wireframe />
          </mesh>
        )}
      </Center>
      <OrbitControls makeDefault />
    </>
  );
}

export function Math3DGraph({ type = 'pyramid' }: Math3DGraphProps) {
  return (
    <div className="w-full h-full min-h-[400px] bg-zinc-950 rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl">
      <Canvas>
        <PerspectiveCamera makeDefault position={[5, 5, 5]} />
        <Scene type={type} />
      </Canvas>
      <div className="absolute bottom-6 right-6 pointer-events-none">
        <div className="bg-zinc-900/80 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
          3D Perspective View • Drag to Rotate
        </div>
      </div>
    </div>
  );
}
