import { useMemo, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Raycaster, Vector3, Vector2, Plane, Color } from "three";
import type { ThreeEvent } from "@react-three/fiber";
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
  onElementMove?: (
    elementId: string,
    newPosition: { x: number; y: number }
  ) => void;
}

type GroundTexture = "grass" | "dirt" | "concrete" | "wood" | "gravel";

// Component to handle 3D dragging
function DraggableObject({
  children,
  onDrag,
  onSelect,
  elementId,
}: {
  children: React.ReactNode;
  onDrag?: (newPosition: { x: number; y: number }) => void;
  onSelect: (id: string) => void;
  elementId: string;
}) {
  const { camera, gl } = useThree();
  const [isDragging, setIsDragging] = useState(false);
  const dragPlane = useMemo(() => new Plane(new Vector3(0, 1, 0), 0), []);
  const raycaster = useMemo(() => new Raycaster(), []);

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    onSelect(elementId);
    setIsDragging(true);

    // Disable orbit controls during drag
    const parent = gl.domElement.parentElement as
      | (HTMLElement & { __r3f?: { controls?: { enabled: boolean } } })
      | null;
    const controls = parent?.__r3f?.controls;
    if (controls) controls.enabled = false;
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!isDragging || !onDrag) return;

    // Convert mouse position to 3D world coordinates
    const rect = gl.domElement.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(new Vector2(x, y), camera);
    const intersection = new Vector3();
    const result = raycaster.ray.intersectPlane(dragPlane, intersection);

    if (result) {
      onDrag({ x: result.x, y: result.z });
    }
  };

  const handlePointerUp = () => {
    setIsDragging(false);

    // Re-enable orbit controls
    const parent = gl.domElement.parentElement as
      | (HTMLElement & { __r3f?: { controls?: { enabled: boolean } } })
      | null;
    const controls = parent?.__r3f?.controls;
    if (controls) controls.enabled = true;
  };

  return (
    <group
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {children}
    </group>
  );
}

function GroundMesh({
  groundSize,
  center,
  groundTexture,
}: {
  groundSize: number;
  center: { x: number; z: number };
  groundTexture: GroundTexture;
}) {
  const getGroundMaterial = () => {
    const baseProps = {
      roughness: 0.8,
      metalness: 0.1,
    };

    switch (groundTexture) {
      case "grass":
        return {
          ...baseProps,
          color: "#22c55e",
          roughness: 0.9,
          metalness: 0.05,
        };
      case "dirt":
        return {
          ...baseProps,
          color: "#92400e",
          roughness: 0.95,
          metalness: 0.02,
        };
      case "concrete":
        return {
          ...baseProps,
          color: "#9ca3af",
          roughness: 0.6,
          metalness: 0.1,
        };
      case "wood":
        return {
          ...baseProps,
          color: "#d97706",
          roughness: 0.85,
          metalness: 0.02,
        };
      case "gravel":
        return {
          ...baseProps,
          color: "#64748b",
          roughness: 0.9,
          metalness: 0.05,
        };
      default:
        return {
          ...baseProps,
          color: "#f3f4f6",
        };
    }
  };

  const materialProps = getGroundMaterial();

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
      position={[center.x, 0, center.z]}
    >
      <planeGeometry args={[groundSize * 2, groundSize * 2, 1, 1]} />
      <meshStandardMaterial {...materialProps} />
    </mesh>
  );
}

// Map 2D canvas space (x,y in feet) to 3D world (x,z in feet). y maps to z.
function toWorldPosition(x: number, y: number): [number, number, number] {
  return [x, 0, y];
}

function StructureMesh({
  el,
  isSelected,
  onSelect,
  onMove,
}: {
  el: Structure;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onMove?: (newPosition: { x: number; y: number }) => void;
}) {
  const width = el.size.width || 0.001;
  const depth = el.size.height || 0.001;
  const height = el.zHeight ?? 1;

  const [x, , z] = toWorldPosition(
    el.position.x + width / 2,
    el.position.y + depth / 2
  );

  const handleMove = (newPosition: { x: number; y: number }) => {
    if (onMove) {
      // Convert world position back to canvas position, accounting for structure origin
      onMove({
        x: newPosition.x - width / 2,
        y: newPosition.y - depth / 2,
      });
    }
  };

  // For ellipse, approximate with a scaled cylinder; for rectangle, a box
  if (el.shape === "ellipse") {
    const radius = 0.5; // unit cylinder scaled below
    return (
      <DraggableObject
        elementId={el.id}
        onSelect={onSelect}
        onDrag={handleMove}
      >
        <group position={[x, height / 2, z]}>
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
      </DraggableObject>
    );
  }

  return (
    <DraggableObject elementId={el.id} onSelect={onSelect} onDrag={handleMove}>
      <group position={[x, height / 2, z]}>
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
    </DraggableObject>
  );
}

function PlantMesh({
  el,
  isSelected,
  onSelect,
  onMove,
}: {
  el: PlantInstance;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onMove?: (newPosition: { x: number; y: number }) => void;
}) {
  const [x, , z] = toWorldPosition(el.position.x, el.position.y);
  const plantType = el.plant.plantType;

  type TreeGeometry = {
    kind: "tree";
    trunkRadius: number;
    trunkHeight: number;
    canopyRadius: number;
    canopyHeight: number;
    color: string;
    trunkColor: string;
  };
  type SphereGeometry = {
    kind: "sphere";
    radius: number;
    height: number;
    color: string;
  };
  type BoxGeometry = {
    kind: "box";
    width: number;
    height: number;
    depth: number;
    color: string;
  };
  type CylinderGeometry = {
    kind: "cylinder";
    radius: number;
    height: number;
    color: string;
  };
  type PlantGeometry =
    | TreeGeometry
    | SphereGeometry
    | BoxGeometry
    | CylinderGeometry;

  // Different dimensions and shapes based on plant type
  const getPlantGeometry = (): PlantGeometry => {
    switch (plantType) {
      case "Shade Trees":
      case "Fruit Trees":
        return {
          kind: "tree",
          trunkRadius: 0.2,
          trunkHeight: 3,
          canopyRadius: 2,
          canopyHeight: 2.5,
          color: "#16a34a",
          trunkColor: "#92400e",
        };
      case "Flowering Shrubs":
        return {
          kind: "sphere",
          radius: 1,
          height: 1.5,
          color: "#dc2626",
        };
      case "Vegetables":
        // Render vegetables as shrubs (rounded bushes)
        return {
          kind: "sphere",
          radius: 0.8,
          height: 0.8,
          color: "#15803d",
        };
      case "Herbs":
        return {
          kind: "cylinder",
          radius: 0.4,
          height: 0.5,
          color: "#059669",
        };
      default:
        return {
          kind: "cylinder",
          radius: 0.5,
          height: 1,
          color: "#16a34a",
        };
    }
  };

  const geometry: PlantGeometry = getPlantGeometry();

  const renderPlant = () => {
    switch (geometry.kind) {
      case "tree":
        return (
          <>
            <mesh
              position={[
                0,
                -geometry.canopyHeight / 2 + geometry.trunkHeight / 2,
                0,
              ]}
              castShadow
            >
              <cylinderGeometry
                args={[
                  geometry.trunkRadius,
                  geometry.trunkRadius,
                  geometry.trunkHeight,
                  8,
                ]}
              />
              <meshStandardMaterial color={geometry.trunkColor} />
            </mesh>
            <mesh
              position={[0, geometry.trunkHeight / 2, 0]}
              castShadow
              receiveShadow
            >
              <sphereGeometry args={[geometry.canopyRadius, 16, 12]} />
              <meshStandardMaterial color={geometry.color} />
            </mesh>
          </>
        );
      case "sphere":
        return (
          <mesh castShadow receiveShadow>
            <sphereGeometry args={[geometry.radius, 16, 12]} />
            <meshStandardMaterial color={geometry.color} />
          </mesh>
        );
      case "box":
        return (
          <mesh castShadow receiveShadow>
            <boxGeometry
              args={[geometry.width, geometry.height, geometry.depth]}
            />
            <meshStandardMaterial color={geometry.color} />
          </mesh>
        );
      case "cylinder":
      default:
        return (
          <mesh castShadow receiveShadow>
            <cylinderGeometry
              args={[geometry.radius, geometry.radius, geometry.height, 16]}
            />
            <meshStandardMaterial color={geometry.color} />
          </mesh>
        );
    }
  };

  const getSelectionRingSize = () => {
    switch (geometry.kind) {
      case "tree":
        return geometry.canopyRadius * 1.2;
      case "box":
        return Math.max(geometry.width, geometry.depth) * 0.8;
      case "sphere":
      case "cylinder":
      default:
        return geometry.radius * 1.4;
    }
  };

  const getPlantHeight = () => {
    switch (geometry.kind) {
      case "tree":
        return geometry.trunkHeight + geometry.canopyHeight;
      case "box":
      case "sphere":
      case "cylinder":
      default:
        return geometry.height;
    }
  };

  const height = getPlantHeight();

  const handleMove = (newPosition: { x: number; y: number }) => {
    if (onMove) {
      onMove(newPosition);
    }
  };

  return (
    <DraggableObject elementId={el.id} onSelect={onSelect} onDrag={handleMove}>
      <group position={[x, height / 2, z]}>
        {renderPlant()}
        {isSelected && (
          <mesh
            position={[0, height / 2 + 0.1, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <ringGeometry
              args={[getSelectionRingSize() * 0.9, getSelectionRingSize(), 16]}
            />
            <meshBasicMaterial color="#2563eb" transparent opacity={0.7} />
          </mesh>
        )}
      </group>
    </DraggableObject>
  );
}

export function GardenCanvas3D({
  canvasState,
  selectedElementId,
  onSelectionChange,
  onElementMove,
}: GardenCanvas3DProps) {
  const { elements, viewBox } = canvasState;
  const [groundTexture, setGroundTexture] = useState<GroundTexture>("grass");

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
      {/* Ground Texture Controls */}
      <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Ground Material
        </label>
        <select
          value={groundTexture}
          onChange={(e) => setGroundTexture(e.target.value as GroundTexture)}
          className="block w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="grass">Grass</option>
          <option value="dirt">Dirt</option>
          <option value="concrete">Concrete</option>
          <option value="wood">Wood Deck</option>
          <option value="gravel">Gravel</option>
        </select>
      </div>
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
        onCreated={({ scene }) => {
          // Set sky background color
          scene.background = new Color("#87ceeb"); // Sky blue
        }}
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
        <GroundMesh
          groundSize={groundSize}
          center={center}
          groundTexture={groundTexture}
        />

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
                onMove={
                  onElementMove
                    ? (newPos) => onElementMove(el.id, newPos)
                    : undefined
                }
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
                onMove={
                  onElementMove
                    ? (newPos) => onElementMove(el.id, newPos)
                    : undefined
                }
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
