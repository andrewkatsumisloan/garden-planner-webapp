import React, { useState } from 'react';
import { Plus, Calendar, MapPin, Layers, Trash2, Edit3 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { GardenSummary } from '../../types/garden';

interface GardenManagementPanelProps {
  availableGardens: GardenSummary[];
  isLoading: boolean;
  currentGardenId?: number;
  onCreateGarden: (name: string, zipCode: string) => void;
  onLoadGarden: (gardenId: number) => void;
  onDeleteGarden: (gardenId: number) => void;
  onRefreshGardens: () => void;
}

export function GardenManagementPanel({
  availableGardens,
  isLoading,
  currentGardenId,
  onCreateGarden,
  onLoadGarden,
  onDeleteGarden,
  onRefreshGardens
}: GardenManagementPanelProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newGardenName, setNewGardenName] = useState('');
  const [newGardenZipCode, setNewGardenZipCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateGarden = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGardenName.trim() || !newGardenZipCode.trim()) return;

    setIsCreating(true);
    try {
      await onCreateGarden(newGardenName.trim(), newGardenZipCode.trim());
      setNewGardenName('');
      setNewGardenZipCode('');
      setShowCreateForm(false);
    } finally {
      setIsCreating(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">My Gardens</h2>
        <Button
          onClick={() => setShowCreateForm(true)}
          size="sm"
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New Garden
        </Button>
      </div>

      {showCreateForm && (
        <div className="bg-gray-50 p-4 rounded-lg space-y-3">
          <h3 className="font-medium">Create New Garden</h3>
          <form onSubmit={handleCreateGarden} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Garden Name
              </label>
              <Input
                type="text"
                value={newGardenName}
                onChange={(e) => setNewGardenName(e.target.value)}
                placeholder="e.g., Backyard Vegetable Garden"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Zip Code
              </label>
              <Input
                type="text"
                value={newGardenZipCode}
                onChange={(e) => setNewGardenZipCode(e.target.value)}
                placeholder="e.g., 90210"
                maxLength={5}
                pattern="[0-9]{5}"
                required
              />
            </div>
            <div className="flex gap-2">
              <Button 
                type="submit" 
                size="sm" 
                disabled={isCreating}
              >
                {isCreating ? 'Creating...' : 'Create Garden'}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setShowCreateForm(false);
                  setNewGardenName('');
                  setNewGardenZipCode('');
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8 text-gray-500">
          Loading your gardens...
        </div>
      ) : availableGardens.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="mb-4">
            <Layers className="h-12 w-12 mx-auto text-gray-300" />
          </div>
          <p className="text-sm">No gardens yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Create your first garden to get started
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {availableGardens.map((garden) => (
            <div
              key={garden.id}
              className={`border rounded-lg p-3 hover:bg-gray-50 transition-colors ${
                currentGardenId === garden.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm truncate">
                    {garden.name}
                  </h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {garden.zip_code}
                    </div>
                    <div className="flex items-center gap-1">
                      <Layers className="h-3 w-3" />
                      {garden.element_count} elements
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                    <Calendar className="h-3 w-3" />
                    Created {formatDate(garden.created_at)}
                  </div>
                  {garden.description && (
                    <p className="text-xs text-gray-600 mt-1 truncate">
                      {garden.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 ml-2">
                  {currentGardenId !== garden.id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onLoadGarden(garden.id)}
                      className="text-xs h-7 px-2"
                    >
                      Load
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDeleteGarden(garden.id)}
                    className="text-xs h-7 px-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="pt-4 border-t border-gray-200">
        <Button
          variant="outline"
          size="sm"
          onClick={onRefreshGardens}
          className="w-full text-sm"
          disabled={isLoading}
        >
          Refresh Gardens
        </Button>
      </div>
    </div>
  );
}