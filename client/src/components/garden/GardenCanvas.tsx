// ===== File: client/src/components/garden/GardenCanvas.tsx =====
import React, { useRef, useState, useCallback, useEffect } from "react";
import { Plus, Minus } from "lucide-react";
import {
  CanvasState,
  CanvasElement,
  Position,
  Tool,
  Structure,
  PlantInstance,
} from "../../types/garden";

interface GardenCanvasProps {
  canvasState: CanvasState;
  activeTool: Tool;
  selectedElementId: string | null;
  onSelectionChange: (elementId: string | null) => void;
  onViewBoxChange: (viewBox: CanvasState["viewBox"]) => void;
  onElementAdd: (element: CanvasElement) => void;
  onElementUpdate: (element: CanvasElement) => void;
  onCanvasDrop: (e: React.DragEvent, position: Position) => void;
  onHistorySnapshot: () => void;
}

export function GardenCanvas({
  canvasState,
  activeTool,
  selectedElementId,
  onSelectionChange,
  onViewBoxChange,
  onElementAdd,
  onElementUpdate,
  onCanvasDrop,
  onHistorySnapshot,
}: GardenCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const interactionState = useRef({
    isPanning: false,
    isDrawing: false,
    isDragging: false,
    panStart: { x: 0, y: 0 },
    drawStart: { x: 0, y: 0 },
    dragElementId: null as string | null,
    dragOffset: { x: 0, y: 0 },
    didMove: false,
  });
  const [currentMousePos, setCurrentMousePos] = useState<Position>({
    x: 0,
    y: 0,
  });

  const { viewBox, gridSize, elements } = canvasState;

  const getStructureMaterial = useCallback((label: string, color: string) => {
    const lowerLabel = label.toLowerCase();
    
    // Determine material based on label keywords
    if (lowerLabel.includes('wood') || lowerLabel.includes('deck') || lowerLabel.includes('fence') || 
        lowerLabel.includes('pergola') || lowerLabel.includes('shed')) {
      return { fill: 'url(#woodTexture)', textColor: '#ffffff', shadow: true };
    } else if (lowerLabel.includes('concrete') || lowerLabel.includes('patio') || lowerLabel.includes('foundation') || 
               lowerLabel.includes('wall') || lowerLabel.includes('path')) {
      return { fill: 'url(#concreteTexture)', textColor: '#333333', shadow: true };
    } else if (lowerLabel.includes('metal') || lowerLabel.includes('steel') || lowerLabel.includes('aluminum') || 
               lowerLabel.includes('gate') || lowerLabel.includes('trellis')) {
      return { fill: 'url(#metalTexture)', textColor: '#ffffff', shadow: true };
    } else if (lowerLabel.includes('raised bed') || lowerLabel.includes('planter') || lowerLabel.includes('container')) {
      return { fill: 'url(#plasticGradient)', textColor: '#ffffff', shadow: true };
    } else {
      // Default to enhanced gradient based on original color
      return { fill: color, textColor: '#ffffff', shadow: true, customGradient: true };
    }
  }, []);

  const screenToSVG = useCallback(
    (clientX: number, clientY: number): Position => {
      if (!svgRef.current) return { x: 0, y: 0 };
      const pt = svgRef.current.createSVGPoint();
      pt.x = clientX;
      pt.y = clientY;
      const svgPoint = pt.matrixTransform(
        svgRef.current.getScreenCTM()?.inverse()
      );
      return { x: svgPoint.x, y: svgPoint.y };
    },
    []
  );

  const snapToGrid = useCallback(
    (pos: Position): Position => {
      return {
        x: Math.round(pos.x / gridSize) * gridSize,
        y: Math.round(pos.y / gridSize) * gridSize,
      };
    },
    [gridSize]
  );

  const handleZoom = useCallback(
    (factor: number) => {
      const newWidth = viewBox.width * factor;
      const newHeight = viewBox.height * factor;
      const centerX = viewBox.x + viewBox.width / 2;
      const centerY = viewBox.y + viewBox.height / 2;
      const newX = centerX - newWidth / 2;
      const newY = centerY - newHeight / 2;
      onViewBoxChange({ x: newX, y: newY, width: newWidth, height: newHeight });
    },
    [viewBox, onViewBoxChange]
  );

    const handleMouseDown = useCallback(
      (e: React.MouseEvent) => {
        interactionState.current.didMove = false;
        const startPos = screenToSVG(e.clientX, e.clientY);

        if (e.button === 1 || e.metaKey || e.ctrlKey) {
          interactionState.current.isPanning = true;
          interactionState.current.panStart = { x: e.clientX, y: e.clientY };
          if (svgRef.current) svgRef.current.style.cursor = "grabbing";
          e.preventDefault();
          return;
        }

        if (e.button !== 0) return;

        const target = e.target as SVGElement;
        const elementId = target
          .closest("[data-element-id]")
          ?.getAttribute("data-element-id");

        if (elementId) {
          const element = elements.find((el) => el.id === elementId);
          if (element) {
            onHistorySnapshot();
            interactionState.current.isDragging = true;
            interactionState.current.dragElementId = elementId;
            interactionState.current.dragOffset = {
              x: startPos.x - element.position.x,
              y: startPos.y - element.position.y,
            };
            onSelectionChange(elementId);
            e.preventDefault();
            return;
          }
        }

        if (activeTool === "select") {
          interactionState.current.isPanning = true;
          interactionState.current.panStart = { x: e.clientX, y: e.clientY };
          if (svgRef.current) svgRef.current.style.cursor = "grabbing";
          e.preventDefault();
          return;
        }

        if (activeTool === "structure") {
          interactionState.current.isDrawing = true;
          interactionState.current.drawStart = snapToGrid(startPos);
          e.preventDefault();
        }
      },
      [
        activeTool,
        screenToSVG,
        snapToGrid,
        elements,
        onSelectionChange,
        onHistorySnapshot,
      ]
    );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      interactionState.current.didMove = true;
      const { isPanning, panStart, isDragging, dragElementId, dragOffset } = interactionState.current;

      if (isPanning) {
        const dx = e.clientX - panStart.x;
        const dy = e.clientY - panStart.y;
        const scale =
          viewBox.width / svgRef.current!.getBoundingClientRect().width;
        onViewBoxChange({
          ...viewBox,
          x: viewBox.x - dx * scale,
          y: viewBox.y - dy * scale,
        });
        interactionState.current.panStart = { x: e.clientX, y: e.clientY };
      }

      if (isDragging && dragElementId) {
        const currentPos = screenToSVG(e.clientX, e.clientY);
        const newPosition = snapToGrid({
          x: currentPos.x - dragOffset.x,
          y: currentPos.y - dragOffset.y,
        });
        
        const element = elements.find(el => el.id === dragElementId);
        if (element) {
          const updatedElement = {
            ...element,
            position: newPosition,
          };
          onElementUpdate(updatedElement);
        }
      }

      const currentPos = screenToSVG(e.clientX, e.clientY);
      setCurrentMousePos(snapToGrid(currentPos));
    },
    [onViewBoxChange, screenToSVG, snapToGrid, viewBox, elements, onElementUpdate]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      const { isDrawing, drawStart, didMove, isDragging } = interactionState.current;

      if (interactionState.current.isPanning) {
        interactionState.current.isPanning = false;
        if (svgRef.current) svgRef.current.style.cursor = "default";
      }

      if (isDragging) {
        interactionState.current.isDragging = false;
        interactionState.current.dragElementId = null;
        interactionState.current.dragOffset = { x: 0, y: 0 };
      }

      if (isDrawing && activeTool === "structure") {
        const endPos = snapToGrid(screenToSVG(e.clientX, e.clientY));
        const width = Math.abs(endPos.x - drawStart.x);
        const height = Math.abs(endPos.y - drawStart.y);

        if (width > gridSize / 2 && height > gridSize / 2) {
          const newStructure: Structure = {
            id: `structure_${Date.now()}`,
            type: "structure",
            position: {
              x: Math.min(drawStart.x, endPos.x),
              y: Math.min(drawStart.y, endPos.y),
            },
            size: { width, height },
            label: "New Structure",
            color: "#8b4513",
          };
          onElementAdd(newStructure);
          onSelectionChange(newStructure.id);
        }
        interactionState.current.isDrawing = false;
      } else if (activeTool === "select" && !didMove && !isDragging) {
        const target = e.target as SVGElement;
        const elementId = target
          .closest("[data-element-id]")
          ?.getAttribute("data-element-id");
        onSelectionChange(elementId || null);
      }
    },
    [
      activeTool,
      gridSize,
      onElementAdd,
      onSelectionChange,
      screenToSVG,
      snapToGrid,
    ]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const pos = screenToSVG(e.clientX, e.clientY);
      const snappedPos = snapToGrid(pos);
      onCanvasDrop(e, snappedPos);
    },
    [screenToSVG, snapToGrid, onCanvasDrop]
  );

  useEffect(() => {
    const svgElement = svgRef.current;
    if (!svgElement) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
      const newWidth = viewBox.width * zoomFactor;
      const newHeight = viewBox.height * zoomFactor;
      const mousePos = screenToSVG(e.clientX, e.clientY);
      const newX = mousePos.x - (mousePos.x - viewBox.x) * zoomFactor;
      const newY = mousePos.y - (mousePos.y - viewBox.y) * zoomFactor;
      onViewBoxChange({ x: newX, y: newY, width: newWidth, height: newHeight });
    };

    svgElement.addEventListener("wheel", handleWheel, { passive: false });
    return () => svgElement.removeEventListener("wheel", handleWheel);
  }, [onViewBoxChange, screenToSVG, viewBox]);

  return (
    <div className="relative w-full h-full bg-gray-50 overflow-hidden">
      <svg
        ref={svgRef}
        className="w-full h-full"
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onMouseLeave={() => {
          interactionState.current.isDrawing = false;
          interactionState.current.isPanning = false;
          interactionState.current.isDragging = false;
          interactionState.current.dragElementId = null;
        }}
      >
        <defs>
          <pattern
            id="grid"
            width={gridSize}
            height={gridSize}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`}
              fill="none"
              stroke="#e0e0e0"
              strokeWidth="0.5"
            />
          </pattern>
          
          {/* Structure gradients and patterns */}
          <linearGradient id="woodGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#d2691e" />
            <stop offset="30%" stopColor="#8b4513" />
            <stop offset="70%" stopColor="#a0522d" />
            <stop offset="100%" stopColor="#654321" />
          </linearGradient>
          
          <linearGradient id="concreteGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f5f5f5" />
            <stop offset="30%" stopColor="#d3d3d3" />
            <stop offset="70%" stopColor="#c0c0c0" />
            <stop offset="100%" stopColor="#a9a9a9" />
          </linearGradient>
          
          <linearGradient id="metalGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e8e8e8" />
            <stop offset="25%" stopColor="#c0c0c0" />
            <stop offset="50%" stopColor="#a8a8a8" />
            <stop offset="75%" stopColor="#909090" />
            <stop offset="100%" stopColor="#787878" />
          </linearGradient>
          
          <linearGradient id="plasticGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2d5a27" />
            <stop offset="30%" stopColor="#1e3a20" />
            <stop offset="70%" stopColor="#0f2419" />
            <stop offset="100%" stopColor="#0a1a0f" />
          </linearGradient>
          
          {/* Shadow filter */}
          <filter id="structureShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="3" dy="3" stdDeviation="2" floodColor="rgba(0,0,0,0.3)" />
          </filter>
          
          {/* Wood texture pattern */}
          <pattern id="woodTexture" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="20" height="20" fill="url(#woodGradient)" />
            <path d="M0,5 Q10,3 20,5 M0,10 Q10,8 20,10 M0,15 Q10,13 20,15" 
                  stroke="rgba(101,67,33,0.3)" strokeWidth="0.5" fill="none" />
          </pattern>
          
          {/* Concrete texture pattern */}
          <pattern id="concreteTexture" x="0" y="0" width="15" height="15" patternUnits="userSpaceOnUse">
            <rect width="15" height="15" fill="url(#concreteGradient)" />
            <circle cx="3" cy="3" r="0.5" fill="rgba(128,128,128,0.4)" />
            <circle cx="8" cy="7" r="0.3" fill="rgba(128,128,128,0.3)" />
            <circle cx="12" cy="4" r="0.4" fill="rgba(128,128,128,0.3)" />
            <circle cx="6" cy="11" r="0.3" fill="rgba(128,128,128,0.4)" />
          </pattern>
          
          {/* Metal texture pattern */}
          <pattern id="metalTexture" x="0" y="0" width="25" height="25" patternUnits="userSpaceOnUse">
            <rect width="25" height="25" fill="url(#metalGradient)" />
            <line x1="0" y1="5" x2="25" y2="5" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
            <line x1="0" y1="10" x2="25" y2="10" stroke="rgba(0,0,0,0.1)" strokeWidth="0.5" />
            <line x1="0" y1="15" x2="25" y2="15" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
            <line x1="0" y1="20" x2="25" y2="20" stroke="rgba(0,0,0,0.1)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="url(#grid)"
          x={viewBox.x}
          y={viewBox.y}
        />

        <g className="elements">
          {elements.map((element) => {
            const isSelected = selectedElementId === element.id;
            const selectionStroke = "#2563eb";

            if (element.type === "structure") {
              const el = element as Structure;
              const material = getStructureMaterial(el.label, el.color);
              const cornerRadius = Math.min(el.size.width, el.size.height) * 0.05; // 5% of smallest dimension
              const fontSize = 14 * Math.sqrt(viewBox.width / 1000);
              
              return (
                <g
                  key={el.id}
                  data-element-id={el.id}
                  className={activeTool === "select" ? "cursor-move" : "cursor-pointer"}
                >
                  {/* Main structure with rounded corners and texture */}
                  <rect
                    x={el.position.x}
                    y={el.position.y}
                    width={el.size.width}
                    height={el.size.height}
                    rx={cornerRadius}
                    ry={cornerRadius}
                    fill={material.fill}
                    filter={material.shadow ? "url(#structureShadow)" : undefined}
                    stroke={isSelected ? selectionStroke : "rgba(0,0,0,0.1)"}
                    strokeWidth={
                      isSelected ? 3 * Math.sqrt(viewBox.width / 1000) : 1 * Math.sqrt(viewBox.width / 1000)
                    }
                  />
                  
                  {/* Subtle highlight along top edge for depth */}
                  <rect
                    x={el.position.x + 2}
                    y={el.position.y + 2}
                    width={el.size.width - 4}
                    height={Math.max(4, el.size.height * 0.1)}
                    rx={cornerRadius * 0.8}
                    ry={cornerRadius * 0.8}
                    fill="rgba(255,255,255,0.15)"
                    className="pointer-events-none"
                  />
                  
                  {/* Text with better styling */}
                  <text
                    x={el.position.x + el.size.width / 2}
                    y={el.position.y + el.size.height / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={material.textColor}
                    fontSize={fontSize}
                    className="pointer-events-none font-semibold"
                    style={{
                      textShadow: material.textColor === '#ffffff' ? '1px 1px 2px rgba(0,0,0,0.7)' : '1px 1px 2px rgba(255,255,255,0.7)',
                      filter: 'drop-shadow(1px 1px 1px rgba(0,0,0,0.3))'
                    }}
                  >
                    {el.label}
                  </text>
                </g>
              );
            } else if (element.type === "plant") {
              const el = element as PlantInstance;
              const radius = 10 * Math.sqrt(viewBox.width / 1000);
              const spacingRadius = (el.plant.spacing * gridSize) / 2;

              return (
                <g
                  key={el.id}
                  data-element-id={el.id}
                  className={activeTool === "select" ? "cursor-move" : "cursor-pointer"}
                >
                  {isSelected && (
                    <circle
                      cx={el.position.x}
                      cy={el.position.y}
                      r={spacingRadius}
                      fill="rgba(37, 99, 235, 0.1)"
                      stroke="rgba(37, 99, 235, 0.4)"
                      strokeWidth={1 * Math.sqrt(viewBox.width / 1000)}
                      strokeDasharray="4,4"
                    />
                  )}
                  <circle
                    cx={el.position.x}
                    cy={el.position.y}
                    r={radius}
                    fill="#16a34a"
                    stroke={isSelected ? selectionStroke : "#15803d"}
                    strokeWidth={
                      isSelected
                        ? 3 * Math.sqrt(viewBox.width / 1000)
                        : 1.5 * Math.sqrt(viewBox.width / 1000)
                    }
                  />
                  {viewBox.width < 3000 && (
                    <text
                      x={el.position.x}
                      y={
                        el.position.y +
                        radius +
                        12 * Math.sqrt(viewBox.width / 1000)
                      }
                      textAnchor="middle"
                      fill="#333"
                      fontSize={12 * Math.sqrt(viewBox.width / 1000)}
                      className="pointer-events-none font-medium"
                    >
                      {el.plant.commonName}
                    </text>
                  )}
                </g>
              );
            }
            return null;
          })}
        </g>

        {interactionState.current.isDrawing && activeTool === "structure" && (
          <rect
            x={Math.min(
              interactionState.current.drawStart.x,
              currentMousePos.x
            )}
            y={Math.min(
              interactionState.current.drawStart.y,
              currentMousePos.y
            )}
            width={Math.abs(
              currentMousePos.x - interactionState.current.drawStart.x
            )}
            height={Math.abs(
              currentMousePos.y - interactionState.current.drawStart.y
            )}
            rx={Math.min(
              Math.abs(currentMousePos.x - interactionState.current.drawStart.x),
              Math.abs(currentMousePos.y - interactionState.current.drawStart.y)
            ) * 0.05}
            ry={Math.min(
              Math.abs(currentMousePos.x - interactionState.current.drawStart.x),
              Math.abs(currentMousePos.y - interactionState.current.drawStart.y)
            ) * 0.05}
            fill="rgba(210, 105, 30, 0.2)"
            stroke="#d2691e"
            strokeWidth={2 * Math.sqrt(viewBox.width / 1000)}
            strokeDasharray="8,4"
            filter="url(#structureShadow)"
          />
        )}
      </svg>

      <div className="absolute bottom-4 right-4 flex flex-col space-y-2">
        <button
          className="w-8 h-8 rounded-full bg-white shadow flex items-center justify-center"
          onClick={() => handleZoom(0.9)}
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          className="w-8 h-8 rounded-full bg-white shadow flex items-center justify-center"
          onClick={() => handleZoom(1.1)}
        >
          <Minus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
