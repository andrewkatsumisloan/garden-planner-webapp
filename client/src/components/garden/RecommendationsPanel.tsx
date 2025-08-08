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
  onRequestMore?: () => void;
  onAskQuestion?: (question: string) => Promise<string>;
  onPlantDragStart?: (plant: Plant) => void;
  onPlantDragEnd?: () => void;
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
  onRequestMore,
  onAskQuestion,
  onPlantDragStart,
  onPlantDragEnd,
}: RecommendationsPanelProps) {
  const [inputZipCode, setInputZipCode] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(["vegetables", "herbs"])
  );
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [isAsking, setIsAsking] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);

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

    // Notify parent so canvas can render a precise SVG ghost
    onPlantDragStart?.(plant);

    // Provide a minimal custom drag image (small green dot with faint radius)
    try {
      const size = 80;
      const radius = 8;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const cx = size / 2;
        const cy = size / 2;
        // Spacing halo
        ctx.beginPath();
        ctx.arc(cx, cy, size * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(16, 185, 129, 0.08)"; // emerald-500 faint
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = "rgba(16, 185, 129, 0.5)";
        ctx.stroke();
        // Center dot
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = "#16a34a"; // emerald-600
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = "#15803d"; // emerald-700
        ctx.stroke();
      }
      e.dataTransfer.setDragImage(canvas, size / 2, size / 2);
    } catch {
      // Ignore drag image errors in environments that don't support it
    }
  };
  const handleDragEnd = () => {
    onPlantDragEnd?.();
  };

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAskQuestion || !question.trim()) return;
    setIsAsking(true);
    setAskError(null);
    setAnswer(null);
    try {
      const resp = await onAskQuestion(question.trim());
      setAnswer(resp);
      setQuestion("");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to get answer";
      setAskError(message);
    } finally {
      setIsAsking(false);
    }
  };

  if (!zipCode && !isLoading) {
    return (
      <div className="p-4 space-y-3">
        <h3 className="text-base font-semibold">Plant Recommendations</h3>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            type="text"
            placeholder="Zip code (e.g. 90210)"
            value={inputZipCode}
            onChange={(e) => setInputZipCode(e.target.value)}
            maxLength={5}
            pattern="\d{5}"
            className="flex-1 h-9"
          />
          <Button type="submit" size="sm" disabled={inputZipCode.length !== 5}>
            Get
          </Button>
        </form>
        <p className="text-xs text-gray-500">
          Enter your 5‑digit zip to see plants for your area.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        <h3 className="text-base font-semibold">Plant Recommendations</h3>
        <div className="flex items-center justify-center py-6 text-sm text-gray-600">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          Getting recommendations{zipCode ? ` for ${zipCode}` : ""}...
        </div>
      </div>
    );
  }

  // Neutral empty state: avoid scary error on initial render before fetch begins
  if (!recommendations) {
    return (
      <div className="p-4 space-y-3">
        <h3 className="text-base font-semibold">Plant Recommendations</h3>
        <div className="text-sm text-gray-600">No recommendations yet.</div>
        <div className="flex items-center gap-2">
          <Button onClick={() => onZipCodeSubmit(zipCode || "")} size="sm">
            {zipCode ? "Refresh" : "Get"}
          </Button>
          <Button
            onClick={() => onZipCodeSubmit("")}
            variant="outline"
            size="sm"
          >
            Change location
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold leading-none">
          Recommendations
        </h3>
        <div className="flex items-center gap-2">
          {onRequestMore && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-3"
              onClick={() => onRequestMore()}
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> More
                </span>
              ) : (
                "More"
              )}
            </Button>
          )}
          <Button
            onClick={() => onZipCodeSubmit("")}
            variant="outline"
            size="sm"
            className="h-8 px-3"
          >
            Change
          </Button>
        </div>
      </div>

      <p className="text-sm text-gray-600">
        Zip code: <strong>{zipCode}</strong>
      </p>
      <p className="text-xs text-gray-500">Drag a plant into your garden.</p>

      {onAskQuestion && (
        <div className="border rounded-md p-3 bg-gray-50">
          <div className="text-sm font-medium mb-2">
            Ask the Garden Assistant
          </div>
          <form onSubmit={handleAsk} className="flex gap-2">
            <Input
              type="text"
              placeholder="e.g. What should I plant along the north fence?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="flex-1 h-9"
            />
            <Button
              type="submit"
              size="sm"
              disabled={isAsking || !question.trim()}
            >
              {isAsking ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Ask
                </span>
              ) : (
                "Ask"
              )}
            </Button>
          </form>
          {askError && (
            <div className="text-xs text-red-600 mt-2">{askError}</div>
          )}
          {answer && (
            <div className="text-sm mt-3 p-3 bg-white border rounded-md">
              {answer}
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        {Object.entries(recommendations).map(([categoryKey, plants]) => {
          if (!plants || plants.length === 0) return null;
          const categoryLabel =
            categoryLabels[categoryKey as keyof typeof categoryLabels];
          const isExpanded = expandedCategories.has(categoryKey);

          return (
            <div
              key={categoryKey}
              className="border rounded-md overflow-hidden"
            >
              <button
                onClick={() => toggleCategory(categoryKey)}
                className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors"
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
                <div className="p-2 space-y-1.5 max-h-64 overflow-y-auto">
                  {plants.map((plant: Plant, index: number) => (
                    <div
                      key={`${plant.commonName}_${index}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, plant)}
                      onDragEnd={handleDragEnd}
                      className="px-3 py-2 bg-white border rounded-md cursor-grab active:cursor-grabbing hover:bg-blue-50 hover:border-blue-200 transition-colors"
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
