// ===== File: client/src/components/garden/GardenCanvas.tsx =====
import React, { useRef, useState, useCallback, useEffect } from "react";
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

      // Check if clicking on an element for dragging
      const target = e.target as SVGElement;
      const elementId = target
        .closest("[data-element-id]")
        ?.getAttribute("data-element-id");

      if (activeTool === "select" && elementId) {
        const element = elements.find(el => el.id === elementId);
        if (element) {
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

      if (activeTool === "structure") {
        interactionState.current.isDrawing = true;
        interactionState.current.drawStart = snapToGrid(startPos);
        e.preventDefault();
      }
    },
    [activeTool, screenToSVG, snapToGrid, elements, onSelectionChange]
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
            color: "#a16207",
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
    <div className="w-full h-full bg-gray-50 overflow-hidden">
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
              return (
                <g
                  key={el.id}
                  data-element-id={el.id}
                  className={activeTool === "select" ? "cursor-move" : "cursor-pointer"}
                >
                  <rect
                    x={el.position.x}
                    y={el.position.y}
                    width={el.size.width}
                    height={el.size.height}
                    fill={el.color}
                    stroke={isSelected ? selectionStroke : "transparent"}
                    strokeWidth={
                      isSelected ? 2 * Math.sqrt(viewBox.width / 1000) : 0
                    }
                  />
                  <text
                    x={el.position.x + el.size.width / 2}
                    y={el.position.y + el.size.height / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="white"
                    fontSize={14 * Math.sqrt(viewBox.width / 1000)}
                    className="pointer-events-none font-semibold"
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
            fill="rgba(161, 98, 7, 0.3)"
            stroke="#a16207"
            strokeWidth={1.5 * Math.sqrt(viewBox.width / 1000)}
            strokeDasharray="6,6"
          />
        )}
      </svg>
    </div>
  );
}
