import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Text } from '@react-three/drei';
import * as THREE from 'three';

interface RocketModelProps {
  roll: number;
  pitch: number;
  yaw: number;
}

function RocketModel({ roll, pitch, yaw }: RocketModelProps) {
  const meshRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (meshRef.current) {
      // Apply orientation from degrees to radians
      // Adjust axes based on standard aerospace conventions if needed
      meshRef.current.rotation.set(
        THREE.MathUtils.degToRad(pitch),
        THREE.MathUtils.degToRad(yaw),
        THREE.MathUtils.degToRad(roll)
      );
    }
  });

  return (
    <group ref={meshRef}>
      {/* Rocket Body */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 2, 32]} />
        <meshStandardMaterial color="#eeeeee" />
      </mesh>
      
      {/* Nose Cone */}
      <mesh position={[0, 1.3, 0]}>
        <coneGeometry args={[0.2, 0.6, 32]} />
        <meshStandardMaterial color="#ef4444" />
      </mesh>
      
      {/* Fins */}
      <mesh position={[0.25, -0.7, 0]} rotation={[0, 0, -Math.PI / 8]}>
        <boxGeometry args={[0.4, 0.6, 0.05]} />
        <meshStandardMaterial color="#06b6d4" />
      </mesh>
      <mesh position={[-0.25, -0.7, 0]} rotation={[0, 0, Math.PI / 8]}>
        <boxGeometry args={[0.4, 0.6, 0.05]} />
        <meshStandardMaterial color="#06b6d4" />
      </mesh>
      <mesh position={[0, -0.7, 0.25]} rotation={[Math.PI / 8, 0, 0]}>
        <boxGeometry args={[0.05, 0.6, 0.4]} />
        <meshStandardMaterial color="#06b6d4" />
      </mesh>
      <mesh position={[0, -0.7, -0.25]} rotation={[-Math.PI / 8, 0, 0]}>
        <boxGeometry args={[0.05, 0.6, 0.4]} />
        <meshStandardMaterial color="#06b6d4" />
      </mesh>
    </group>
  );
}

interface Rocket3DProps {
  roll: number;
  pitch: number;
  yaw: number;
}

export function Rocket3D({ roll, pitch, yaw }: Rocket3DProps) {
  return (
    <div className="glass-panel flex flex-col h-full relative p-0 overflow-hidden min-h-[300px]">
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        <h3 className="text-xs font-mono text-gray-400 tracking-wider uppercase mb-2">Orientation (IMU)</h3>
        <div className="space-y-1">
          <div className="flex gap-2 text-xs font-mono"><span className="text-gray-500 w-10">ROLL</span> <span className="text-vyoma-primary">{roll.toFixed(1)}°</span></div>
          <div className="flex gap-2 text-xs font-mono"><span className="text-gray-500 w-10">PITCH</span> <span className="text-vyoma-primary">{pitch.toFixed(1)}°</span></div>
          <div className="flex gap-2 text-xs font-mono"><span className="text-gray-500 w-10">YAW</span> <span className="text-gray-400">{yaw.toFixed(1)}°</span></div>
        </div>
      </div>
      
      <div className="absolute top-4 right-4 z-10 pointer-events-none flex flex-col items-end">
        <div className="text-[10px] text-gray-500 font-mono tracking-widest">DIRECTION</div>
        <div className="text-sm font-bold text-white tracking-widest mt-1 mb-2">
          {pitch > 10 ? 'UP' : pitch < -10 ? 'DOWN' : 'LEVEL'} / {yaw > 10 ? 'RIGHT' : yaw < -10 ? 'LEFT' : 'CENTER'}
        </div>
        <div className="text-[10px] text-gray-500 font-mono">X / Y / Z AXIS</div>
        <div className="text-[10px] text-gray-500 font-mono mt-1">INTERACTIVE 3D</div>
      </div>

      <Canvas camera={{ position: [3, 2, 3], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1.5} />
        
        <RocketModel roll={roll} pitch={pitch} yaw={yaw} />
        
        <Grid infiniteGrid fadeDistance={20} sectionColor="#06b6d4" cellColor="#1f2937" />
        
        <axesHelper args={[2]} />
        
        <OrbitControls enablePan={false} enableZoom={true} maxPolarAngle={Math.PI} />
      </Canvas>
    </div>
  );
}
