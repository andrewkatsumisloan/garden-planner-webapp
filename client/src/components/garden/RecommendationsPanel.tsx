// ===== File: client/src/components/garden/RecommendationsPanel.tsx =====
import React, { useState } from "react";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Plant, PlantRecommendations } from "../../types/garden";

interface RecommendationsPanelProps {
  zipCode: string | null;
  recommendations: PlantRecommendations | null;
  isLoading: boolean;
  onZipCodeSubmit: (zipCode: string) => void;
}

const categoryLabels = {
  shadeTrees: "Shade Trees",
  fruitTrees: "Fruit Trees",
  floweringShrubs: "Flowering Shrubs",
  vegetables: "Vegetables",
  herbs: "Herbs",
};

export function RecommendationsPanel({
  zipCode,
  recommendations,
  isLoading,
  onZipCodeSubmit,
}: RecommendationsPanelProps) {
  const [inputZipCode, setInputZipCode] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(["vegetables", "herbs"])
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputZipCode.length === 5 && /^\d+$/.test(inputZipCode)) {
      onZipCodeSubmit(inputZipCode);
    }
  };

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const handleDragStart = (e: React.DragEvent, plant: Plant) => {
    e.dataTransfer.setData("application/json", JSON.stringify(plant));
    e.dataTransfer.effectAllowed = "copy";
  };

  if (!zipCode && !isLoading) {
    return (
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-4">Plant Recommendations</h3>
        <p className="text-gray-600 mb-4">
          Enter your 5-digit zip code to get plant recommendations for your
          area.
        </p>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            type="text"
            placeholder="e.g. 90210"
            value={inputZipCode}
            onChange={(e) => setInputZipCode(e.target.value)}
            maxLength={5}
            pattern="\d{5}"
            className="flex-1"
          />
          <Button type="submit" disabled={inputZipCode.length !== 5}>
            Go
          </Button>
        </form>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-4">Plant Recommendations</h3>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Getting recommendations for {zipCode}...</span>
        </div>
      </div>
    );
  }

  if (!recommendations) {
    return (
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-4">Plant Recommendations</h3>
        <p className="text-red-600">
          Failed to load recommendations. Please try again.
        </p>
        <Button
          onClick={() => onZipCodeSubmit("")}
          className="mt-2"
          variant="outline"
        >
          Change Location
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Recommendations</h3>
        <Button onClick={() => onZipCodeSubmit("")} variant="outline" size="sm">
          Change
        </Button>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Showing plants for zip code: <strong>{zipCode}</strong>
      </p>

      <p className="text-xs text-gray-500 mb-4">
        Drag plants from the list below onto your garden canvas.
      </p>

      <div className="space-y-2">
        {Object.entries(recommendations).map(([categoryKey, plants]) => {
          if (!plants || plants.length === 0) return null;
          const categoryLabel =
            categoryLabels[categoryKey as keyof typeof categoryLabels];
          const isExpanded = expandedCategories.has(categoryKey);

          return (
            <div
              key={categoryKey}
              className="border rounded-lg overflow-hidden"
            >
              <button
                onClick={() => toggleCategory(categoryKey)}
                className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <span className="font-medium">{categoryLabel}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">
                    {plants.length} plants
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="p-2 space-y-1 max-h-60 overflow-y-auto">
                  {plants.map((plant: Plant, index: number) => (
                    <div
                      key={`${plant.commonName}_${index}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, plant)}
                      className="p-2 bg-white border rounded cursor-grab active:cursor-grabbing hover:bg-blue-50 hover:border-blue-200 transition-colors"
                    >
                      <div className="font-medium text-sm">
                        {plant.commonName}
                      </div>
                      <div className="text-xs text-gray-500 italic">
                        {plant.botanicalName}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {plant.sunlightNeeds} • {plant.spacing}ft spacing
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
