import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { CanvasElement, Structure, PlantInstance, StructureShape } from '../../types/garden';

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

  const handleShapeChange = (newShape: StructureShape) => {
    if (selectedElement.type === 'structure') {
      onElementUpdate({
        ...selectedElement,
        shape: newShape
      });
    }
  };

  const materialPresets = [
    { name: 'Wood Deck', label: 'wood deck', color: '#8b4513' },
    { name: 'Wood Fence', label: 'wood fence', color: '#a0522d' },
    { name: 'Concrete Patio', label: 'concrete patio', color: '#d3d3d3' },
    { name: 'Metal Gate', label: 'metal gate', color: '#909090' },
    { name: 'Raised Bed', label: 'raised bed', color: '#2d5a27' },
    { name: 'Wood Shed', label: 'wood shed', color: '#654321' },
    { name: 'Concrete Wall', label: 'concrete wall', color: '#c0c0c0' },
    { name: 'Custom', label: '', color: '' }
  ];

  const handleMaterialChange = (material: typeof materialPresets[0]) => {
    if (selectedElement.type === 'structure' && material.name !== 'Custom') {
      onElementUpdate({
        ...selectedElement,
        label: material.label,
        color: material.color
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
            <label className="block text-sm font-medium mb-1">Material Preset</label>
            <select
              className="w-full p-2 border rounded-md bg-white"
              onChange={(e) => {
                const material = materialPresets.find(m => m.name === e.target.value);
                if (material) handleMaterialChange(material);
              }}
              value="Custom"
            >
              {materialPresets.map((material) => (
                <option key={material.name} value={material.name}>
                  {material.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Choose a preset or use Custom for manual settings
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Label</label>
            <Input
              value={structureElement.label}
              onChange={(e) => handleLabelChange(e.target.value)}
              placeholder="Structure name"
            />
            <p className="text-xs text-gray-500 mt-1">
              Include material keywords (wood, concrete, metal) for automatic textures
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Dimensions</label>
            <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
              {Math.round(structureElement.size.width)} ft × {Math.round(structureElement.size.height)} ft
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Shape</label>
            <select
              className="w-full p-2 border rounded-md bg-white"
              value={structureElement.shape}
              onChange={(e) =>
                handleShapeChange(e.target.value as StructureShape)
              }
            >
              <option value="rectangle">Rectangle</option>
              <option value="ellipse">Ellipse</option>
            </select>
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