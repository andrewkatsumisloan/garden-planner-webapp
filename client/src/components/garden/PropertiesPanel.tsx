import React from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { CanvasElement, Structure, PlantInstance } from '../../types/garden';

interface PropertiesPanelProps {
  selectedElement: CanvasElement | null;
  onElementUpdate: (element: CanvasElement) => void;
  onElementDelete: (elementId: string) => void;
}

export function PropertiesPanel({
  selectedElement,
  onElementUpdate,
  onElementDelete
}: PropertiesPanelProps) {
  if (!selectedElement) {
    return (
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-4">Properties</h3>
        <p className="text-gray-600">
          Select an element on the canvas to view and edit its properties.
        </p>
      </div>
    );
  }

  const handleLabelChange = (newLabel: string) => {
    if (selectedElement.type === 'structure') {
      onElementUpdate({
        ...selectedElement,
        label: newLabel
      });
    }
  };

  const handleColorChange = (newColor: string) => {
    if (selectedElement.type === 'structure') {
      onElementUpdate({
        ...selectedElement,
        color: newColor
      });
    }
  };

  const handleDelete = () => {
    onElementDelete(selectedElement.id);
  };

  if (selectedElement.type === 'structure') {
    const structureElement = selectedElement as Structure;
    return (
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-4">Structure Properties</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Label</label>
            <Input
              value={structureElement.label}
              onChange={(e) => handleLabelChange(e.target.value)}
              placeholder="Structure name"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Dimensions</label>
            <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
              {Math.round(structureElement.size.width)} ft × {Math.round(structureElement.size.height)} ft
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={structureElement.color}
                onChange={(e) => handleColorChange(e.target.value)}
                className="w-12 h-8 rounded border cursor-pointer"
              />
              <Input
                value={structureElement.color}
                onChange={(e) => handleColorChange(e.target.value)}
                placeholder="#8B4513"
                className="flex-1"
              />
            </div>
          </div>
          
          <div className="pt-4 border-t">
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="w-full"
            >
              Delete Structure
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (selectedElement.type === 'plant') {
    const plantElement = selectedElement as PlantInstance;
    const plant = plantElement.plant;
    
    return (
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-4">Plant Properties</h3>
        
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-green-700">{plant.commonName}</h4>
            <p className="text-sm text-gray-600 italic">{plant.botanicalName}</p>
          </div>
          
          <div className="grid grid-cols-1 gap-3 text-sm">
            <div>
              <span className="font-medium">Type:</span>
              <span className="ml-2 text-gray-600">{plant.plantType}</span>
            </div>
            
            <div>
              <span className="font-medium">Sunlight:</span>
              <span className="ml-2 text-gray-600">{plant.sunlightNeeds}</span>
            </div>
            
            <div>
              <span className="font-medium">Water:</span>
              <span className="ml-2 text-gray-600">{plant.waterNeeds}</span>
            </div>
            
            <div>
              <span className="font-medium">Mature Size:</span>
              <span className="ml-2 text-gray-600">{plant.matureSize}</span>
            </div>
            
            <div>
              <span className="font-medium">Spacing:</span>
              <span className="ml-2 text-gray-600">{plant.spacing} feet</span>
            </div>
          </div>
          
          <div className="pt-4 border-t">
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="w-full"
            >
              Remove Plant
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-4">Properties</h3>
      <p className="text-gray-600">
        Properties for this element type are not yet implemented.
      </p>
    </div>
  );
}