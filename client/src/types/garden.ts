export interface Plant {
  commonName: string;
  botanicalName: string;
  plantType: 'Shade Trees' | 'Fruit Trees' | 'Flowering Shrubs' | 'Vegetables' | 'Herbs';
  sunlightNeeds: string;
  waterNeeds: string;
  matureSize: string;
  spacing: number;
}

export interface PlantRecommendations {
  shadeTrees: Plant[];
  fruitTrees: Plant[];
  floweringShrubs: Plant[];
  vegetables: Plant[];
  herbs: Plant[];
}

export interface GeminiResponse {
  recommendedPlants: PlantRecommendations;
}

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface CanvasObject {
  id: string;
  position: Position;
  type: 'structure' | 'plant' | 'text';
}

export type StructureShape = 'rectangle' | 'ellipse';

export interface Structure extends CanvasObject {
  type: 'structure';
  size: Size;
  label: string;
  color: string;
  shape: StructureShape;
  // Vertical height in feet for 3D mode extrusion
  zHeight?: number;
}

export interface PlantInstance extends CanvasObject {
  type: 'plant';
  plant: Plant;
  showSpacing: boolean;
}

export interface TextLabel extends CanvasObject {
  type: 'text';
  text: string;
  fontSize: number;
  color: string;
}

export type CanvasElement = Structure | PlantInstance | TextLabel;

export interface CanvasState {
  elements: CanvasElement[];
  selectedElementId: string | null;
  viewBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  zoom: number;
  gridSize: number;
}

export type Tool = 'select' | 'structure' | 'text';

export interface GardenNote {
  id: number;
  garden_id: number;
  content: string;
  created_at: string;
}

// Garden persistence types
export interface SavedGarden {
  id: number;
  name: string;
  description?: string;
  zip_code: string;
  user_id: string;
  view_box_x: number;
  view_box_y: number;
  view_box_width: number;
  view_box_height: number;
  zoom: number;
  grid_size: number;
  created_at: string;
  updated_at?: string;
  elements: SavedGardenElement[];
}

export interface SavedGardenElement {
  id: number;
  element_id: string;
  garden_id: number;
  element_type: string;
  position_x: number;
  position_y: number;
  width?: number;
  height?: number;
  z_height?: number;
  label?: string;
  color?: string;
   shape?: string;
  common_name?: string;
  botanical_name?: string;
  plant_type?: string;
  sunlight_needs?: string;
  water_needs?: string;
  mature_size?: string;
  spacing?: number;
  show_spacing?: boolean;
  text_content?: string;
  font_size?: number;
  text_color?: string;
  created_at: string;
  updated_at?: string;
}

export interface GardenSummary {
  id: number;
  name: string;
  description?: string;
  zip_code: string;
  created_at: string;
  updated_at?: string;
  element_count: number;
}

export interface AppState {
  canvas: CanvasState;
  activeTool: Tool;
  structureShape: StructureShape;
  plantRecommendations: PlantRecommendations | null;
  userZipCode: string | null;
  isLoadingRecommendations: boolean;
  sidePanel: 'recommendations' | 'properties' | 'gardens' | 'notes';
  currentGarden: SavedGarden | null;
  notes: GardenNote[];
  isSaving: boolean;
  lastSaved: Date | null;
  isLoadingGardens: boolean;
  availableGardens: GardenSummary[];
  showPlantSpacing: boolean;
  // Whether to render in 3D mode
  is3DMode: boolean;
}