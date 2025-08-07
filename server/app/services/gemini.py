# ===== File: server/app/services/gemini.py =====
import google.generativeai as genai
import json
import logging
from typing import Dict, Any
from app.core.config import settings

logger = logging.getLogger(__name__)


class GeminiService:
    def __init__(self):
        if not settings.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY environment variable is required")
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self.model = genai.GenerativeModel("gemini-1.5-flash")

    async def get_plant_recommendations(self, zip_code: str) -> Dict[str, Any]:
        """
        Get plant recommendations from Gemini based on zip code
        """
        prompt = f"""You are an expert horticulturalist and garden planner. Based on the user's location, your task is to recommend a variety of plants that will thrive in that specific climate and growing conditions.

**User's Location:**
- Zip Code: {zip_code}

**Your Task:**
Using your knowledge of climate zones, growing conditions, and regional plant suitability for the provided zip code, provide a list of 5-7 plant recommendations for each of the following categories: "Shade Trees", "Fruit Trees", "Flowering Shrubs", "Vegetables", and "Herbs".

For each plant, you must provide the following details:
- commonName: The common, everyday name of the plant.
- botanicalName: The scientific or botanical name.
- plantType: The category you are placing it in (e.g., "Shade Tree").
- sunlightNeeds: A brief description (e.g., "Full Sun", "Partial Shade", "6-8 hours of sun").
- waterNeeds: A brief description (e.g., "Drought tolerant once established", "Consistent moisture").
- matureSize: The typical height and width at maturity (e.g., "15-20 ft tall, 10 ft wide").
- spacing: The recommended planting distance from other plants, in feet. This must be a single number.

Return your response as a single, valid JSON object that strictly follows the schema provided. Do not include any introductory text or explanations outside of the JSON structure."""

        # Define the Plant schema to be reused, as the Gemini API doesn't support $ref
        plant_schema = {
            "type": "OBJECT",
            "properties": {
                "commonName": {"type": "STRING"},
                "botanicalName": {"type": "STRING"},
                "plantType": {"type": "STRING"},
                "sunlightNeeds": {"type": "STRING"},
                "waterNeeds": {"type": "STRING"},
                "matureSize": {"type": "STRING"},
                "spacing": {"type": "NUMBER"},
            },
            "required": [
                "commonName",
                "botanicalName",
                "plantType",
                "sunlightNeeds",
                "waterNeeds",
                "matureSize",
                "spacing",
            ],
        }

        # Define the JSON schema for structured output, inlining the plant schema
        schema = {
            "type": "OBJECT",
            "properties": {
                "recommendedPlants": {
                    "type": "OBJECT",
                    "properties": {
                        "shadeTrees": {"type": "ARRAY", "items": plant_schema},
                        "fruitTrees": {"type": "ARRAY", "items": plant_schema},
                        "floweringShrubs": {"type": "ARRAY", "items": plant_schema},
                        "vegetables": {"type": "ARRAY", "items": plant_schema},
                        "herbs": {"type": "ARRAY", "items": plant_schema},
                    },
                }
            },
        }

        try:
            # Generate content with structured output
            response = self.model.generate_content(
                prompt,
                generation_config=genai.GenerationConfig(
                    response_mime_type="application/json", response_schema=schema
                ),
            )

            # Parse the JSON response
            result = json.loads(response.text)
            logger.info(
                f"Successfully generated plant recommendations for zip code: {zip_code}"
            )
            return result

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON response from Gemini: {e}")
            raw_response = "N/A"
            if hasattr(response, "text"):
                raw_response = response.text
            logger.error(f"Raw response: {raw_response}")
            raise ValueError("Invalid JSON response from Gemini API")
        except Exception as e:
            logger.error(f"Error calling Gemini API: {e}")
            raise ValueError(f"Failed to get plant recommendations: {str(e)}")

    async def ask_gardening_question(self, question: str) -> str:
        """Get a general gardening answer from Gemini"""
        try:
            response = self.model.generate_content(question)
            return response.text.strip()
        except Exception as e:
            logger.error(f"Error getting gardening advice from Gemini: {e}")
            raise ValueError("Failed to get gardening advice")


# Singleton instance
gemini_service = GeminiService()
