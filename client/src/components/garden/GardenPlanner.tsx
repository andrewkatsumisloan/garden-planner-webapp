// ===== File: client/src/components/garden/GardenPlanner.tsx =====
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useUser, useAuth } from "@clerk/clerk-react";
import { GardenCanvas } from "./GardenCanvas";
import { GardenCanvas3D } from "./GardenCanvas3D";
import { Toolbar } from "./Toolbar";
import { RecommendationsPanel } from "./RecommendationsPanel";
import { PropertiesPanel } from "./PropertiesPanel";
import { GardenManagementPanel } from "./GardenManagementPanel";
import { GardenNotesPanel } from "./GardenNotesPanel";
import {
  AppState,
  CanvasElement,
  CanvasState,
  PlantInstance,
  Tool,
  Position,
  StructureShape,
} from "../../types/garden";
import type { Plant } from "../../types/garden";
import { gardenService } from "../../services/gardenService";

const initialCanvasState = {
  elements: [],
  selectedElementId: null,
  viewBox: { x: -500, y: -500, width: 1000, height: 1000 },
  zoom: 1,
  gridSize: 50,
};

const initialAppState: AppState = {
  canvas: initialCanvasState,
  activeTool: "select",
  structureShape: "rectangle",
  plantRecommendations: null,
  userZipCode: null,
  isLoadingRecommendations: false,
  sidePanel: "recommendations",
  currentGarden: null,
  notes: [],
  isSaving: false,
  lastSaved: null,
  isLoadingGardens: false,
  availableGardens: [],
  showPlantSpacing: false,
  is3DMode: false,
};

export function GardenPlanner() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [appState, setAppState] = useState<AppState>(initialAppState);
  const [draggingPlant, setDraggingPlant] = useState<Plant | null>(null);

  const undoStack = useRef<CanvasState[]>([]);
  const redoStack = useRef<CanvasState[]>([]);
  const clipboard = useRef<CanvasElement | null>(null);

  const pushHistory = useCallback((canvas: CanvasState) => {
    undoStack.current.push(JSON.parse(JSON.stringify(canvas)));
    if (undoStack.current.length > 100) {
      undoStack.current.shift();
    }
    redoStack.current = [];
  }, []);

  // Set up garden service with token callback
  useEffect(() => {
    gardenService.setTokenCallback(getToken);
  }, [getToken]);

  // Auto-save functionality
  useEffect(() => {
    if (!appState.currentGarden || appState.isSaving) return;

    const saveTimeout = setTimeout(async () => {
      try {
        setAppState((prev) => ({ ...prev, isSaving: true }));

        await gardenService.saveGardenSnapshot(
          appState.currentGarden!.id,
          appState.canvas
        );

        setAppState((prev) => ({
          ...prev,
          isSaving: false,
          lastSaved: new Date(),
        }));
      } catch (error) {
        console.error("Auto-save failed:", error);
        setAppState((prev) => ({ ...prev, isSaving: false }));
      }
    }, 2000); // Auto-save after 2 seconds of inactivity

    return () => clearTimeout(saveTimeout);
  }, [
    appState.canvas,
    appState.currentGarden,
    appState.currentGarden?.id,
    appState.isSaving,
  ]);

  // Create initial garden when user enters zip code
  const createInitialGarden = useCallback(
    async (zipCode: string) => {
      if (!user) return;

      try {
        const garden = await gardenService.createGarden({
          name: `My Garden - ${zipCode}`,
          description: "Created automatically",
          zip_code: zipCode,
          view_box_x: initialCanvasState.viewBox.x,
          view_box_y: initialCanvasState.viewBox.y,
          view_box_width: initialCanvasState.viewBox.width,
          view_box_height: initialCanvasState.viewBox.height,
          zoom: initialCanvasState.zoom,
          grid_size: initialCanvasState.gridSize,
        });

        setAppState((prev) => ({
          ...prev,
          currentGarden: garden,
          userZipCode: zipCode,
          notes: [],
        }));

        return garden;
      } catch (error) {
        console.error("Failed to create garden:", error);
        throw error;
      }
    },
    [user]
  );

  const fetchPlantRecommendations = useCallback(
    async (zipCode: string, skipGardenCheck = false) => {
      if (!user) return;

      setAppState((prev) => ({
        ...prev,
        isLoadingRecommendations: true,
        userZipCode: zipCode,
        plantRecommendations: null,
      }));

      if (!zipCode) {
        setAppState((prev) => ({ ...prev, isLoadingRecommendations: false }));
        return;
      }

      try {
        let targetGardenId = appState.currentGarden?.id || null;
        // Check if we need to create or switch to a garden for this zip code (unless we're being called from handleLoadGarden)
        if (
          !skipGardenCheck &&
          (!appState.currentGarden ||
            appState.currentGarden.zip_code !== zipCode)
        ) {
          // First, check if we already have a garden for this zip code
          const existingGarden = appState.availableGardens.find(
            (g) => g.zip_code === zipCode
          );

          if (existingGarden) {
            // Load the existing garden and get recommendations
            const garden = await gardenService.getGarden(existingGarden.id);
            const canvasState = gardenService.savedGardenToCanvasState(garden);

            setAppState((prev) => ({
              ...prev,
              currentGarden: garden,
              userZipCode: garden.zip_code,
              canvas: canvasState,
              sidePanel: "recommendations",
            }));
            targetGardenId = garden.id;
            // Continue to fetch recommendations below
          } else {
            // Create a new garden for this zip code
            const garden = await createInitialGarden(zipCode);
            if (!garden) {
              throw new Error("Failed to create garden");
            }
            targetGardenId = garden.id;
          }
        }

        const gardenId = targetGardenId || appState.currentGarden?.id;
        if (!gardenId) throw new Error("Garden not set");
        let recs;
        try {
          recs = await gardenService.getGardenRecommendations(gardenId);
        } catch {
          recs = await gardenService.generateGardenRecommendations(
            gardenId,
            false
          );
        }
        setAppState((prev) => ({
          ...prev,
          plantRecommendations: recs,
          isLoadingRecommendations: false,
        }));
      } catch (error) {
        console.error("Error fetching plant recommendations:", error);
        setAppState((prev) => ({
          ...prev,
          isLoadingRecommendations: false,
          plantRecommendations: null,
        }));
      }
    },
    [
      user,
      appState.currentGarden,
      appState.availableGardens,
      createInitialGarden,
    ]
  );

  const handleRequestMore = useCallback(async () => {
    if (!appState.currentGarden || !appState.plantRecommendations) return;
    setAppState((prev) => ({ ...prev, isLoadingRecommendations: true }));
    try {
      const categories = [
        "shadeTrees",
        "fruitTrees",
        "floweringShrubs",
        "vegetables",
        "herbs",
      ] as const;
      const exclude = categories
        .flatMap((cat) => appState.plantRecommendations?.[cat] || [])
        .map((p) => p.botanicalName)
        .filter(Boolean) as string[];

      const recs = await gardenService.requestMoreRecommendations(
        appState.currentGarden.id,
        exclude,
        3
      );
      setAppState((prev) => ({
        ...prev,
        plantRecommendations: recs,
        isLoadingRecommendations: false,
      }));
    } catch (error) {
      console.error("Failed to request more recommendations:", error);
      setAppState((prev) => ({ ...prev, isLoadingRecommendations: false }));
    }
  }, [appState.currentGarden, appState.plantRecommendations]);

  // Load available gardens
  const loadAvailableGardens = useCallback(async () => {
    if (!user) return;

    setAppState((prev) => ({ ...prev, isLoadingGardens: true }));
    try {
      const gardens = await gardenService.listGardens();
      setAppState((prev) => ({
        ...prev,
        availableGardens: gardens,
        isLoadingGardens: false,
      }));
    } catch (error) {
      console.error("Failed to load gardens:", error);
      setAppState((prev) => ({ ...prev, isLoadingGardens: false }));

      // Show authentication error to user
      if (
        error instanceof Error &&
        error.message.includes("Authentication required")
      ) {
        // This will be handled by the UI to show a sign-in prompt
        console.log("User needs to sign in to access gardens");
      }
    }
  }, [user]);

  // Load available gardens and auto-load most recent when component mounts
  useEffect(() => {
    if (user) {
      loadAvailableGardens();
    }
  }, [user, loadAvailableGardens]);

  // Load an existing garden
  const handleLoadGarden = useCallback(
    async (gardenId: number) => {
      try {
        const garden = await gardenService.getGarden(gardenId);
        const canvasState = gardenService.savedGardenToCanvasState(garden);
        const notes = await gardenService.listNotes(gardenId);

        setAppState((prev) => ({
          ...prev,
          currentGarden: garden,
          userZipCode: garden.zip_code,
          canvas: canvasState,
          notes,
          sidePanel: "recommendations",
          plantRecommendations: null, // Clear previous recommendations
        }));

        // Get plant recommendations for this garden's zip code
        if (garden.zip_code) {
          await fetchPlantRecommendations(garden.zip_code, true);
        }
      } catch (error) {
        console.error("Failed to load garden:", error);
      }
    },
    [fetchPlantRecommendations]
  );

  // Auto-load most recent garden after gardens list is loaded
  useEffect(() => {
    if (
      user &&
      appState.availableGardens.length > 0 &&
      !appState.currentGarden &&
      !appState.isLoadingGardens
    ) {
      // Sort gardens by updated_at (most recent first), fallback to created_at
      const sortedGardens = [...appState.availableGardens].sort((a, b) => {
        const aDate = new Date(a.updated_at || a.created_at).getTime();
        const bDate = new Date(b.updated_at || b.created_at).getTime();
        return bDate - aDate;
      });

      if (sortedGardens.length > 0) {
        handleLoadGarden(sortedGardens[0].id);
      }
    }
  }, [
    user,
    appState.availableGardens,
    appState.currentGarden,
    appState.isLoadingGardens,
    handleLoadGarden,
  ]);

  // Create a new garden
  const handleCreateGarden = useCallback(
    async (name: string, zipCode: string) => {
      try {
        const garden = await gardenService.createGarden({
          name,
          description: "Created from garden planner",
          zip_code: zipCode,
          view_box_x: initialCanvasState.viewBox.x,
          view_box_y: initialCanvasState.viewBox.y,
          view_box_width: initialCanvasState.viewBox.width,
          view_box_height: initialCanvasState.viewBox.height,
          zoom: initialCanvasState.zoom,
          grid_size: initialCanvasState.gridSize,
        });

        setAppState((prev) => ({
          ...prev,
          currentGarden: garden,
          userZipCode: zipCode,
          canvas: initialCanvasState,
          sidePanel: "recommendations",
          notes: [],
        }));

        // Refresh the gardens list
        await loadAvailableGardens();

        // Get plant recommendations for the new garden
        await fetchPlantRecommendations(zipCode);
      } catch (error) {
        console.error("Failed to create garden:", error);
        throw error;
      }
    },
    [loadAvailableGardens, fetchPlantRecommendations]
  );

  // Delete a garden
  const handleDeleteGarden = useCallback(
    async (gardenId: number) => {
      if (
        !window.confirm(
          "Are you sure you want to delete this garden? This action cannot be undone."
        )
      ) {
        return;
      }

      try {
        await gardenService.deleteGarden(gardenId);

        // If we're deleting the current garden, reset the state
        if (appState.currentGarden?.id === gardenId) {
          setAppState((prev) => ({
            ...initialAppState,
            availableGardens: prev.availableGardens.filter(
              (g) => g.id !== gardenId
            ),
          }));
        } else {
          // Just refresh the gardens list
          await loadAvailableGardens();
        }
      } catch (error) {
        console.error("Failed to delete garden:", error);
      }
    },
    [appState.currentGarden?.id, loadAvailableGardens]
  );

  const handleAddNote = useCallback(
    async (content: string) => {
      if (!appState.currentGarden) return;
      try {
        const note = await gardenService.addNote(
          appState.currentGarden.id,
          content
        );
        setAppState((prev) => ({ ...prev, notes: [...prev.notes, note] }));
      } catch (error) {
        console.error("Failed to add note:", error);
      }
    },
    [appState.currentGarden]
  );

  // Show gardens panel
  const handleShowGardens = useCallback(() => {
    setAppState((prev) => ({
      ...prev,
      sidePanel: "gardens",
      canvas: { ...prev.canvas, selectedElementId: null },
    }));
  }, []);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case "v":
          e.preventDefault();
          setAppState((prev) => ({ ...prev, activeTool: "select" }));
          break;
        case "r":
          e.preventDefault();
          setAppState((prev) => ({ ...prev, activeTool: "structure" }));
          break;
        // Remove text tool shortcut for now
        case "escape":
          e.preventDefault();
          setAppState((prev) => ({
            ...prev,
            canvas: { ...prev.canvas, selectedElementId: null },
            sidePanel: "recommendations",
          }));
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, []);

  const handleToolChange = useCallback((tool: Tool) => {
    setAppState((prev) => ({ ...prev, activeTool: tool }));
  }, []);

  const handleStructureShapeChange = useCallback((shape: StructureShape) => {
    setAppState((prev) => ({ ...prev, structureShape: shape }));
  }, []);

  const handleShowNotes = useCallback(() => {
    setAppState((prev) => ({ ...prev, sidePanel: "notes" }));
  }, []);

  const handleElementAdd = useCallback(
    (element: CanvasElement) => {
      setAppState((prev) => {
        pushHistory(prev.canvas);
        return {
          ...prev,
          canvas: {
            ...prev.canvas,
            elements: [...prev.canvas.elements, element],
          },
        };
      });
    },
    [pushHistory]
  );

  const handleElementUpdate = useCallback((updatedElement: CanvasElement) => {
    setAppState((prev) => ({
      ...prev,
      canvas: {
        ...prev.canvas,
        elements: prev.canvas.elements.map((element) =>
          element.id === updatedElement.id ? updatedElement : element
        ),
      },
    }));
  }, []);

  const handleSelectionChange = useCallback((elementId: string | null) => {
    setAppState((prev) => ({
      ...prev,
      activeTool: elementId ? prev.activeTool : "select",
      canvas: { ...prev.canvas, selectedElementId: elementId },
      sidePanel: elementId ? "properties" : "recommendations",
    }));
  }, []);

  const handleViewBoxChange = useCallback(
    (viewBox: typeof initialCanvasState.viewBox) => {
      setAppState((prev) => ({
        ...prev,
        canvas: { ...prev.canvas, viewBox },
      }));
    },
    []
  );

  const handleElementDelete = useCallback(
    (elementId: string) => {
      setAppState((prev) => {
        pushHistory(prev.canvas);
        return {
          ...prev,
          canvas: {
            ...prev.canvas,
            elements: prev.canvas.elements.filter(
              (element) => element.id !== elementId
            ),
            selectedElementId: null,
          },
          sidePanel: "recommendations",
        };
      });
    },
    [pushHistory]
  );

  const handleUndo = useCallback(() => {
    setAppState((prev) => {
      if (undoStack.current.length === 0) return prev;
      const previous = undoStack.current.pop()!;
      redoStack.current.push(JSON.parse(JSON.stringify(prev.canvas)));
      return { ...prev, canvas: previous };
    });
  }, []);

  const handleRedo = useCallback(() => {
    setAppState((prev) => {
      if (redoStack.current.length === 0) return prev;
      const next = redoStack.current.pop()!;
      undoStack.current.push(JSON.parse(JSON.stringify(prev.canvas)));
      return { ...prev, canvas: next };
    });
  }, []);

  const handleHistorySnapshot = useCallback(() => {
    pushHistory(appState.canvas);
  }, [pushHistory, appState.canvas]);

  useEffect(() => {
    const handleShortcuts = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        handleRedo();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
        e.preventDefault();
        const selected = appState.canvas.elements.find(
          (el) => el.id === appState.canvas.selectedElementId
        );
        if (selected) {
          clipboard.current = JSON.parse(JSON.stringify(selected));
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "x") {
        e.preventDefault();
        const selected = appState.canvas.elements.find(
          (el) => el.id === appState.canvas.selectedElementId
        );
        if (selected) {
          clipboard.current = JSON.parse(JSON.stringify(selected));
          handleElementDelete(selected.id);
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
        e.preventDefault();
        if (clipboard.current) {
          const newElement = {
            ...JSON.parse(JSON.stringify(clipboard.current)),
            id: `${clipboard.current.type}_${Date.now()}`,
            position: {
              x: clipboard.current.position.x + appState.canvas.gridSize,
              y: clipboard.current.position.y + appState.canvas.gridSize,
            },
          } as CanvasElement;
          handleElementAdd(newElement);
          handleSelectionChange(newElement.id);
        }
        return;
      }

      if (
        (e.key === "Backspace" || e.key === "Delete") &&
        appState.canvas.selectedElementId
      ) {
        e.preventDefault();
        handleElementDelete(appState.canvas.selectedElementId);
      }
    };

    window.addEventListener("keydown", handleShortcuts);
    return () => window.removeEventListener("keydown", handleShortcuts);
  }, [
    appState.canvas.elements,
    appState.canvas.gridSize,
    appState.canvas.selectedElementId,
    handleElementAdd,
    handleElementDelete,
    handleSelectionChange,
    handleUndo,
    handleRedo,
  ]);

  const handleCanvasDrop = useCallback(
    (e: React.DragEvent, position: Position) => {
      e.preventDefault();

      try {
        const plantData = JSON.parse(
          e.dataTransfer.getData("application/json")
        );

        const newPlant: PlantInstance = {
          id: `plant_${Date.now()}`,
          type: "plant",
          position,
          plant: plantData,
          showSpacing: false,
        };

        handleElementAdd(newPlant);
      } catch (error) {
        console.error("Error handling plant drop:", error);
      } finally {
        // Always clear drag ghost after drop
        setDraggingPlant(null);
      }
    },
    [handleElementAdd]
  );

  const selectedElement =
    appState.canvas.elements.find(
      (element) => element.id === appState.canvas.selectedElementId
    ) || null;

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <Toolbar
        activeTool={appState.activeTool}
        onToolChange={handleToolChange}
        structureShape={appState.structureShape}
        onStructureShapeChange={handleStructureShapeChange}
        isSaving={appState.isSaving}
        lastSaved={appState.lastSaved}
        gardenName={appState.currentGarden?.name}
        onShowGardens={handleShowGardens}
        onShowNotes={handleShowNotes}
        showPlantSpacing={appState.showPlantSpacing}
        onTogglePlantSpacing={() =>
          setAppState((prev) => ({
            ...prev,
            showPlantSpacing: !prev.showPlantSpacing,
          }))
        }
        is3DMode={appState.is3DMode}
        onToggle3DMode={() =>
          setAppState((prev) => ({
            ...prev,
            is3DMode: !prev.is3DMode,
          }))
        }
      />

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative">
          {appState.is3DMode ? (
            <GardenCanvas3D
              canvasState={appState.canvas}
              selectedElementId={appState.canvas.selectedElementId}
              onSelectionChange={handleSelectionChange}
            />
          ) : (
            <GardenCanvas
              canvasState={appState.canvas}
              activeTool={appState.activeTool}
              structureShape={appState.structureShape}
              selectedElementId={appState.canvas.selectedElementId}
              onSelectionChange={handleSelectionChange}
              onViewBoxChange={handleViewBoxChange}
              onElementAdd={handleElementAdd}
              onElementUpdate={handleElementUpdate}
              onCanvasDrop={handleCanvasDrop}
              onHistorySnapshot={handleHistorySnapshot}
              showPlantSpacing={appState.showPlantSpacing}
              draggingPlant={draggingPlant}
              is3DMode={false}
            />
          )}

          {!appState.is3DMode && (
            // Overlay zoom controls as sibling to avoid clipping/stacking
            <div className="pointer-events-none absolute inset-0">
              <div className="pointer-events-auto fixed bottom-6 left-6 z-50 flex flex-col space-y-2">
                <button
                  className="w-9 h-9 rounded-full bg-white shadow flex items-center justify-center border"
                  onClick={() => {
                    const { viewBox } = appState.canvas;
                    const clampedWidth = Math.max(
                      200,
                      Math.min(5000, viewBox.width * 0.97)
                    );
                    const scale = clampedWidth / viewBox.width;
                    const newHeight = viewBox.height * scale;
                    const centerX = viewBox.x + viewBox.width / 2;
                    const centerY = viewBox.y + viewBox.height / 2;
                    handleViewBoxChange({
                      x: centerX - clampedWidth / 2,
                      y: centerY - newHeight / 2,
                      width: clampedWidth,
                      height: newHeight,
                    });
                  }}
                  aria-label="Zoom in"
                  title="Zoom in"
                >
                  +
                </button>
                <button
                  className="w-9 h-9 rounded-full bg-white shadow flex items-center justify-center border"
                  onClick={() => {
                    const { viewBox } = appState.canvas;
                    const clampedWidth = Math.max(
                      200,
                      Math.min(5000, viewBox.width * 1.03)
                    );
                    const scale = clampedWidth / viewBox.width;
                    const newHeight = viewBox.height * scale;
                    const centerX = viewBox.x + viewBox.width / 2;
                    const centerY = viewBox.y + viewBox.height / 2;
                    handleViewBoxChange({
                      x: centerX - clampedWidth / 2,
                      y: centerY - newHeight / 2,
                      width: clampedWidth,
                      height: newHeight,
                    });
                  }}
                  aria-label="Zoom out"
                  title="Zoom out"
                >
                  −
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="w-80 bg-white border-l border-gray-200 flex-shrink-0 overflow-y-auto">
          {appState.sidePanel === "recommendations" ? (
            <RecommendationsPanel
              zipCode={appState.userZipCode}
              recommendations={appState.plantRecommendations}
              isLoading={appState.isLoadingRecommendations}
              onZipCodeSubmit={fetchPlantRecommendations}
              onRequestMore={handleRequestMore}
              onAskQuestion={async (q: string) => {
                if (!appState.currentGarden) throw new Error("Garden not set");
                return gardenService.askGardenQuestion(
                  appState.currentGarden.id,
                  q
                );
              }}
              onPlantDragStart={(p) => setDraggingPlant(p)}
              onPlantDragEnd={() => setDraggingPlant(null)}
            />
          ) : appState.sidePanel === "properties" ? (
            <PropertiesPanel
              selectedElement={selectedElement}
              onElementUpdate={handleElementUpdate}
              onElementDelete={handleElementDelete}
            />
          ) : appState.sidePanel === "notes" ? (
            <GardenNotesPanel
              notes={appState.notes}
              onAddNote={handleAddNote}
            />
          ) : (
            <GardenManagementPanel
              availableGardens={appState.availableGardens}
              isLoading={appState.isLoadingGardens}
              currentGardenId={appState.currentGarden?.id}
              onCreateGarden={handleCreateGarden}
              onLoadGarden={handleLoadGarden}
              onDeleteGarden={handleDeleteGarden}
              onRefreshGardens={loadAvailableGardens}
            />
          )}
        </div>
      </div>
    </div>
  );
}
