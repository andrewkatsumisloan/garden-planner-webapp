// ===== File: client/src/components/garden/GardenPlanner.tsx =====
import React, { useState, useEffect, useCallback } from "react";
import { useUser, useAuth } from "@clerk/clerk-react";
import { GardenCanvas } from "./GardenCanvas";
import { Toolbar } from "./Toolbar";
import { RecommendationsPanel } from "./RecommendationsPanel";
import { PropertiesPanel } from "./PropertiesPanel";
import { GardenManagementPanel } from "./GardenManagementPanel";
import {
  AppState,
  CanvasElement,
  PlantInstance,
  Tool,
  Position,
} from "../../types/garden";
import { API_BASE_URL } from "../../config";
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
  plantRecommendations: null,
  userZipCode: null,
  isLoadingRecommendations: false,
  sidePanel: "recommendations",
  currentGarden: null,
  isSaving: false,
  lastSaved: null,
  isLoadingGardens: false,
  availableGardens: [],
};

export function GardenPlanner() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [appState, setAppState] = useState<AppState>(initialAppState);

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
  }, [appState.canvas, appState.currentGarden?.id, appState.isSaving]);

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
        // Check if we need to create or switch to a garden for this zip code (unless we're being called from handleLoadGarden)
        if (!skipGardenCheck && (!appState.currentGarden || appState.currentGarden.zip_code !== zipCode)) {
          // First, check if we already have a garden for this zip code
          const existingGarden = appState.availableGardens.find(g => g.zip_code === zipCode);
          
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
            
            // Continue to fetch recommendations below
          } else {
            // Create a new garden for this zip code
            const garden = await createInitialGarden(zipCode);
            if (!garden) {
              throw new Error("Failed to create garden");
            }
          }
        }

        const token = await getToken();

        const response = await fetch(
          `${API_BASE_URL}/api/v1/garden/plant-recommendations`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ zip_code: zipCode }),
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        setAppState((prev) => ({
          ...prev,
          plantRecommendations: data.recommendations.recommendedPlants,
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
    [user, getToken, appState.currentGarden, appState.availableGardens, createInitialGarden]
  );

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

        setAppState((prev) => ({
          ...prev,
          currentGarden: garden,
          userZipCode: garden.zip_code,
          canvas: canvasState,
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
        case "t":
          e.preventDefault();
          setAppState((prev) => ({ ...prev, activeTool: "text" }));
          break;
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

  const handleElementAdd = useCallback((element: CanvasElement) => {
    setAppState((prev) => ({
      ...prev,
      canvas: {
        ...prev.canvas,
        elements: [...prev.canvas.elements, element],
      },
    }));
  }, []);

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

  const handleElementDelete = useCallback((elementId: string) => {
    setAppState((prev) => ({
      ...prev,
      canvas: {
        ...prev.canvas,
        elements: prev.canvas.elements.filter(
          (element) => element.id !== elementId
        ),
        selectedElementId: null,
      },
      sidePanel: "recommendations",
    }));
  }, []);

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
        isSaving={appState.isSaving}
        lastSaved={appState.lastSaved}
        gardenName={appState.currentGarden?.name}
        onShowGardens={handleShowGardens}
      />

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative">
          <GardenCanvas
            canvasState={appState.canvas}
            activeTool={appState.activeTool}
            selectedElementId={appState.canvas.selectedElementId}
            onSelectionChange={handleSelectionChange}
            onViewBoxChange={handleViewBoxChange}
            onElementAdd={handleElementAdd}
            onElementUpdate={handleElementUpdate}
            onCanvasDrop={handleCanvasDrop}
          />
        </div>

        <div className="w-80 bg-white border-l border-gray-200 flex-shrink-0 overflow-y-auto">
          {appState.sidePanel === "recommendations" ? (
            <RecommendationsPanel
              zipCode={appState.userZipCode}
              recommendations={appState.plantRecommendations}
              isLoading={appState.isLoadingRecommendations}
              onZipCodeSubmit={fetchPlantRecommendations}
            />
          ) : appState.sidePanel === "properties" ? (
            <PropertiesPanel
              selectedElement={selectedElement}
              onElementUpdate={handleElementUpdate}
              onElementDelete={handleElementDelete}
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
