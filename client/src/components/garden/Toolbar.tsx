import { MousePointer, Square, Type, Save, Clock, FolderOpen, StickyNote } from 'lucide-react';
import { Button } from '../ui/button';
import { Tool, StructureShape } from '../../types/garden';

interface ToolbarProps {
  activeTool: Tool;
  onToolChange: (tool: Tool) => void;
  structureShape: StructureShape;
  onStructureShapeChange: (shape: StructureShape) => void;
  isSaving?: boolean;
  lastSaved?: Date | null;
  gardenName?: string;
  onShowGardens?: () => void;
  onShowNotes?: () => void;
}

export function Toolbar({
  activeTool,
  onToolChange,
  structureShape,
  onStructureShapeChange,
  isSaving = false,
  lastSaved,
  gardenName,
  onShowGardens,
  onShowNotes,
}: ToolbarProps) {
  return (
    <div className="flex items-center gap-2 p-4 bg-white border-b border-gray-200">
      <div className="flex items-center gap-1">
        <Button
          variant={activeTool === 'select' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onToolChange('select')}
          className="flex items-center gap-2"
        >
          <MousePointer className="h-4 w-4" />
          Select (V)
        </Button>
        
        <Button
          variant={activeTool === 'structure' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onToolChange('structure')}
          className="flex items-center gap-2"
        >
          <Square className="h-4 w-4" />
          Structure (R)
        </Button>

        {activeTool === 'structure' && (
          <select
            className="ml-2 border rounded p-1 text-sm"
            value={structureShape}
            onChange={(e) => onStructureShapeChange(e.target.value as StructureShape)}
          >
            <option value="rectangle">Rectangle</option>
            <option value="ellipse">Ellipse</option>
          </select>
        )}
        
        <Button
          variant={activeTool === 'text' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onToolChange('text')}
          className="flex items-center gap-2"
        >
          <Type className="h-4 w-4" />
          Text (T)
        </Button>
      </div>
      
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={onShowGardens}
          className="flex items-center gap-2"
        >
          <FolderOpen className="h-4 w-4" />
          Gardens
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onShowNotes}
          className="flex items-center gap-2"
        >
          <StickyNote className="h-4 w-4" />
          Notes
        </Button>
      </div>
      
      {gardenName && (
        <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-md">
          <span className="text-sm font-medium">{gardenName}</span>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            {isSaving ? (
              <>
                <Save className="h-3 w-3 animate-spin" />
                <span>Saving...</span>
              </>
            ) : lastSaved ? (
              <>
                <Clock className="h-3 w-3" />
                <span>Saved {lastSaved.toLocaleTimeString()}</span>
              </>
            ) : (
              <span>Auto-save enabled</span>
            )}
          </div>
        </div>
      )}
      
      <div className="ml-auto text-sm text-gray-500">
        Tip: Drag on empty space to pan, or use mouse wheel to zoom
      </div>
    </div>
  );
}