import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import {
  CanvasState,
  CanvasElement,
  Structure,
  PlantInstance,
} from "../../types/garden";

interface GardenCanvas3DProps {
  canvasState: CanvasState;
  selectedElementId: string | null;
  onSelectionChange: (elementId: string | null) => void;
}

// Map 2D canvas space (x,y in feet) to 3D world (x,z in feet). y maps to z.
function toWorldPosition(x: number, y: number): [number, number, number] {
  return [x, 0, y];
}

function StructureMesh({
  el,
  isSelected,
  onSelect,
}: {
  el: Structure;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  const width = el.size.width || 0.001;
  const depth = el.size.height || 0.001;
  const height = el.zHeight ?? 1;

  const [x, , z] = toWorldPosition(
    el.position.x + width / 2,
    el.position.y + depth / 2
  );

  // For ellipse, approximate with a scaled cylinder; for rectangle, a box
  if (el.shape === "ellipse") {
    const radius = 0.5; // unit cylinder scaled below
    return (
      <group
        position={[x, height / 2, z]}
        onPointerDown={(e) => {
          e.stopPropagation();
          onSelect(el.id);
        }}
      >
        <mesh scale={[width, height, depth]} castShadow receiveShadow>
          <cylinderGeometry args={[radius, radius, 1, 32]} />
          <meshStandardMaterial
            color={el.color || "#8b4513"}
            metalness={0.05}
            roughness={0.8}
          />
        </mesh>
        {isSelected && (
          <mesh
            position={[0, height / 2 + 0.1, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <ringGeometry
              args={[
                Math.max(width, depth) * 0.55,
                Math.max(width, depth) * 0.6,
                32,
              ]}
            />
            <meshBasicMaterial color="#2563eb" transparent opacity={0.7} />
          </mesh>
        )}
      </group>
    );
  }

  return (
    <group
      position={[x, height / 2, z]}
      onPointerDown={(e) => {
        e.stopPropagation();
        onSelect(el.id);
      }}
    >
      <mesh castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial
          color={el.color || "#8b4513"}
          metalness={0.05}
          roughness={0.8}
        />
      </mesh>
      {isSelected && (
        <mesh
          position={[0, height / 2 + 0.1, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry
            args={[
              Math.max(width, depth) * 0.55,
              Math.max(width, depth) * 0.6,
              32,
            ]}
          />
          <meshBasicMaterial color="#2563eb" transparent opacity={0.7} />
        </mesh>
      )}
    </group>
  );
}

function PlantMesh({
  el,
  isSelected,
  onSelect,
}: {
  el: PlantInstance;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  const radius = 0.5; // ~1 ft diameter
  const height = 1; // ~1 ft tall placeholder
  const [x, , z] = toWorldPosition(el.position.x, el.position.y);

  return (
    <group
      position={[x, height / 2, z]}
      onPointerDown={(e) => {
        e.stopPropagation();
        onSelect(el.id);
      }}
    >
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[radius, radius, height, 16]} />
        <meshStandardMaterial color="#16a34a" />
      </mesh>
      {isSelected && (
        <mesh
          position={[0, height / 2 + 0.05, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[radius * 1.2, radius * 1.4, 16]} />
          <meshBasicMaterial color="#2563eb" transparent opacity={0.7} />
        </mesh>
      )}
    </group>
  );
}

export function GardenCanvas3D({
  canvasState,
  selectedElementId,
  onSelectionChange,
}: GardenCanvas3DProps) {
  const { elements, viewBox } = canvasState;

  // Compute scene bounds from elements, fallback to viewBox
  const { center, groundSize } = useMemo(() => {
    if (!elements || elements.length === 0) {
      return {
        center: {
          x: viewBox.x + viewBox.width / 2,
          z: viewBox.y + viewBox.height / 2,
        },
        groundSize: Math.max(viewBox.width, viewBox.height),
      };
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;

    for (const el of elements) {
      if (el.type === "structure") {
        const w = el.size.width || 0;
        const d = el.size.height || 0;
        const x1 = el.position.x;
        const x2 = el.position.x + w;
        const z1 = el.position.y;
        const z2 = el.position.y + d;
        minX = Math.min(minX, x1, x2);
        maxX = Math.max(maxX, x1, x2);
        minZ = Math.min(minZ, z1, z2);
        maxZ = Math.max(maxZ, z1, z2);
      } else if (el.type === "plant") {
        const r = 0.5; // ~1 ft radius placeholder
        const x = el.position.x;
        const z = el.position.y;
        minX = Math.min(minX, x - r);
        maxX = Math.max(maxX, x + r);
        minZ = Math.min(minZ, z - r);
        maxZ = Math.max(maxZ, z + r);
      }
    }

    // Pad bounds slightly
    const pad = Math.max(10, (Math.max(maxX - minX, maxZ - minZ) || 100) * 0.1);
    minX -= pad;
    maxX += pad;
    minZ -= pad;
    maxZ += pad;

    const cX = (minX + maxX) / 2;
    const cZ = (minZ + maxZ) / 2;
    const size = Math.max(maxX - minX, maxZ - minZ);
    return { center: { x: cX, z: cZ }, groundSize: Math.max(size, 50) };
  }, [elements, viewBox]);

  return (
    <div className="absolute inset-0">
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true, logarithmicDepthBuffer: true }}
        camera={{
          position: [
            center.x + groundSize * 0.9,
            Math.max(groundSize * 0.7, 30),
            center.z + groundSize * 0.9,
          ],
          fov: 50,
          near: 0.1,
          far: groundSize * 10,
        }}
        onPointerMissed={() => onSelectionChange(null)}
      >
        {/* Lights */}
        <ambientLight intensity={0.35} />
        <directionalLight
          position={[groundSize, groundSize * 1.5, groundSize]}
          intensity={0.9}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-left={-groundSize}
          shadow-camera-right={groundSize}
          shadow-camera-top={groundSize}
          shadow-camera-bottom={-groundSize}
          shadow-camera-near={0.5}
          shadow-camera-far={groundSize * 4}
        />
        <hemisphereLight intensity={0.15} groundColor={"#cbd5e1"} />

        {/* Ground */}
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
          position={[center.x, 0, center.z]}
        >
          <planeGeometry args={[groundSize * 2, groundSize * 2, 1, 1]} />
          <meshStandardMaterial color="#f3f4f6" />
        </mesh>

        {/* Grid helper */}
        <gridHelper
          args={[groundSize * 2, Math.max(10, Math.floor(groundSize / 10))]}
          position={[center.x, 0.05, center.z]}
        />

        {/* Elements */}
        {elements.map((el: CanvasElement) => {
          if (el.type === "structure") {
            return (
              <StructureMesh
                key={el.id}
                el={el as Structure}
                isSelected={selectedElementId === el.id}
                onSelect={onSelectionChange}
              />
            );
          }
          if (el.type === "plant") {
            return (
              <PlantMesh
                key={el.id}
                el={el as PlantInstance}
                isSelected={selectedElementId === el.id}
                onSelect={onSelectionChange}
              />
            );
          }
          return null;
        })}

        {/* Controls */}
        <OrbitControls
          makeDefault
          target={[center.x, 0, center.z]}
          enableDamping
          dampingFactor={0.1}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={(5 * Math.PI) / 6 - 0.2}
          minDistance={Math.max(groundSize * 0.15, 5)}
          maxDistance={groundSize * 3}
        />
      </Canvas>
    </div>
  );
}

export default GardenCanvas3D;
