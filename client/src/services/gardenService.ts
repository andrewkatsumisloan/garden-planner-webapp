import { API_BASE_URL } from '../config';
import {
  SavedGarden,
  GardenSummary,
  CanvasElement,
  CanvasState,
  SavedGardenElement,
  Plant,
  GardenNote,
  StructureShape
} from '../types/garden';

class GardenService {
  private getTokenCallback: (() => Promise<string | null>) | null = null;

  setTokenCallback(callback: () => Promise<string | null>) {
    this.getTokenCallback = callback;
  }

  private async getAuthHeaders(): Promise<Headers> {
    const headers = new Headers({
      'Content-Type': 'application/json',
    });
    
    if (this.getTokenCallback) {
      const token = await this.getTokenCallback();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    }
    
    return headers;
  }

  async listGardens(): Promise<GardenSummary[]> {
    const response = await fetch(`${API_BASE_URL}/api/v1/garden/gardens`, {
      headers: await this.getAuthHeaders(),
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication required. Please sign in.');
      }
      throw new Error(`Failed to fetch gardens: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }

  async createGarden(gardenData: {
    name: string;
    description?: string;
    zip_code: string;
    view_box_x?: number;
    view_box_y?: number;
    view_box_width?: number;
    view_box_height?: number;
    zoom?: number;
    grid_size?: number;
  }): Promise<SavedGarden> {
    const response = await fetch(`${API_BASE_URL}/api/v1/garden/gardens`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(gardenData),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create garden');
    }
    
    return response.json();
  }

  async getGarden(gardenId: number): Promise<SavedGarden> {
    const response = await fetch(`${API_BASE_URL}/api/v1/garden/gardens/${gardenId}`, {
      headers: await this.getAuthHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch garden');
    }
    
    return response.json();
  }

  async updateGarden(gardenId: number, updates: Partial<SavedGarden>): Promise<SavedGarden> {
    const response = await fetch(`${API_BASE_URL}/api/v1/garden/gardens/${gardenId}`, {
      method: 'PUT',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update garden');
    }
    
    return response.json();
  }

  async deleteGarden(gardenId: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/v1/garden/gardens/${gardenId}`, {
      method: 'DELETE',
      headers: await this.getAuthHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete garden');
    }
  }

  async getGardenRecommendations(
    gardenId: number
  ): Promise<import('../types/garden').PlantRecommendations> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/garden/gardens/${gardenId}/recommendations`,
      {
        headers: await this.getAuthHeaders(),
      }
    );
    if (!response.ok) {
      throw new Error('Failed to fetch recommendations');
    }
    const json = await response.json();
    return json.data.recommendedPlants;
  }

  async generateGardenRecommendations(
    gardenId: number,
    forceRefresh = false
  ): Promise<import('../types/garden').PlantRecommendations> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/garden/gardens/${gardenId}/recommendations`,
      {
        method: 'POST',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify({ force_refresh: forceRefresh }),
      }
    );
    if (!response.ok) {
      throw new Error('Failed to generate recommendations');
    }
    const json = await response.json();
    return json.data.recommendedPlants;
  }

  async requestMoreRecommendations(
    gardenId: number,
    excludeBotanicalNames: string[],
    countPerCategory = 3
  ): Promise<import('../types/garden').PlantRecommendations> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/garden/gardens/${gardenId}/recommendations/more`,
      {
        method: 'POST',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify({
          exclude_botanical_names: excludeBotanicalNames,
          count_per_category: countPerCategory,
        }),
      }
    );
    if (!response.ok) {
      throw new Error('Failed to get more recommendations');
    }
    const json = await response.json();
    return json.data.recommendedPlants;
  }

  async askGardenQuestion(
    gardenId: number,
    question: string
  ): Promise<string> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/garden/gardens/${gardenId}/ask`,
      {
        method: 'POST',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify({ question }),
      }
    );
    if (!response.ok) {
      throw new Error('Failed to get answer');
    }
    const json = await response.json();
    return json.answer as string;
  }

  async listNotes(gardenId: number): Promise<GardenNote[]> {
    const response = await fetch(`${API_BASE_URL}/api/v1/garden/gardens/${gardenId}/notes`, {
      headers: await this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch notes');
    }

    return response.json();
  }

  async addNote(gardenId: number, content: string): Promise<GardenNote> {
    const response = await fetch(`${API_BASE_URL}/api/v1/garden/gardens/${gardenId}/notes`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify({ content }),
    });

    if (!response.ok) {
      throw new Error('Failed to add note');
    }

    return response.json();
  }

  async saveGardenSnapshot(
    gardenId: number, 
    canvasState: CanvasState, 
    gardenMetadata?: Partial<SavedGarden>
  ): Promise<void> {
    // Convert canvas elements to backend format
    const elements = canvasState.elements.map(this.canvasElementToSaved);
    
    const snapshot = {
      garden: gardenMetadata ? {
        name: gardenMetadata.name,
        description: gardenMetadata.description,
        zip_code: gardenMetadata.zip_code,
        view_box_x: canvasState.viewBox.x,
        view_box_y: canvasState.viewBox.y,
        view_box_width: canvasState.viewBox.width,
        view_box_height: canvasState.viewBox.height,
        zoom: canvasState.zoom,
        grid_size: canvasState.gridSize,
      } : {
        view_box_x: canvasState.viewBox.x,
        view_box_y: canvasState.viewBox.y,
        view_box_width: canvasState.viewBox.width,
        view_box_height: canvasState.viewBox.height,
        zoom: canvasState.zoom,
        grid_size: canvasState.gridSize,
      },
      elements
    };

    const response = await fetch(`${API_BASE_URL}/api/v1/garden/gardens/${gardenId}/save-snapshot`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(snapshot),
    });
    
    if (!response.ok) {
      throw new Error('Failed to save garden snapshot');
    }
  }

  private canvasElementToSaved(element: CanvasElement): Omit<SavedGardenElement, 'id' | 'garden_id' | 'created_at' | 'updated_at'> {
    const base = {
      element_id: element.id,
      element_type: element.type,
      position_x: element.position.x,
      position_y: element.position.y,
    };

    if (element.type === 'structure') {
      return {
        ...base,
        width: element.size.width,
        height: element.size.height,
        z_height: element.zHeight,
        label: element.label,
        color: element.color,
        shape: element.shape,
      };
    } else if (element.type === 'plant') {
      return {
        ...base,
        common_name: element.plant.commonName,
        botanical_name: element.plant.botanicalName,
        plant_type: element.plant.plantType,
        sunlight_needs: element.plant.sunlightNeeds,
        water_needs: element.plant.waterNeeds,
        mature_size: element.plant.matureSize,
        spacing: element.plant.spacing,
        show_spacing: element.showSpacing,
      };
    } else if (element.type === 'text') {
      return {
        ...base,
        text_content: element.text,
        font_size: element.fontSize,
        text_color: element.color,
      };
    }

    return base;
  }

  savedElementToCanvas(saved: SavedGardenElement): CanvasElement {
    const base = {
      id: saved.element_id,
      position: {
        x: saved.position_x,
        y: saved.position_y,
      },
    };

    if (saved.element_type === 'structure') {
      return {
        ...base,
        type: 'structure' as const,
        size: {
          width: saved.width || 0,
          height: saved.height || 0,
        },
        label: saved.label || '',
        color: saved.color || '#8B4513',
        shape: (saved.shape as StructureShape) || 'rectangle',
        zHeight: saved.z_height ?? 0,
      };
    } else if (saved.element_type === 'plant') {
      return {
        ...base,
        type: 'plant' as const,
        plant: {
          commonName: saved.common_name || '',
          botanicalName: saved.botanical_name || '',
          plantType: (saved.plant_type as Plant['plantType']) || 'Vegetables',
          sunlightNeeds: saved.sunlight_needs || '',
          waterNeeds: saved.water_needs || '',
          matureSize: saved.mature_size || '',
          spacing: saved.spacing || 2,
        },
        showSpacing: saved.show_spacing || false,
      };
    } else if (saved.element_type === 'text') {
      return {
        ...base,
        type: 'text' as const,
        text: saved.text_content || '',
        fontSize: saved.font_size || 12,
        color: saved.text_color || '#000000',
      };
    }

    // Fallback
    return {
      ...base,
      type: 'structure' as const,
      size: { width: 100, height: 100 },
      label: 'Unknown',
      color: '#8B4513',
      shape: 'rectangle',
    };
  }

  savedGardenToCanvasState(saved: SavedGarden): CanvasState {
    return {
      elements: saved.elements.map(el => this.savedElementToCanvas(el)),
      selectedElementId: null,
      viewBox: {
        x: saved.view_box_x,
        y: saved.view_box_y,
        width: saved.view_box_width,
        height: saved.view_box_height,
      },
      zoom: saved.zoom,
      gridSize: saved.grid_size,
    };
  }
}

export const gardenService = new GardenService();