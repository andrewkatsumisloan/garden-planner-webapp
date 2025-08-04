### **1.0 High-Level Concept**

**The Intelligent Garden Layout Planner is a web-based application that allows users to create technical drawings and layouts of their garden space. It combines a free-form, grid-based drawing canvas (similar to Figma or a CAD tool) with an intelligent recommendation engine powered by a Large Language Model (Gemini Flash).**

**Users input their location (via zip code), and the application leverages this to provide a curated palette of plants (trees, shrubs, vegetables, etc.) that are well-suited for their specific climate. Users can then design their garden by drawing structures and dragging these recommended plants onto the canvas, with the app providing visual guidance on spacing and layout.**

### **2.0 Core User Experience & Interface**

**The interface is composed of three main parts: the central ** **Canvas** **, a top ** **Toolbar** **, and a contextual ****Side Panel** that switches between Properties and Recommendations.

**2.1 The Canvas**

* **Grid System:** An infinite canvas displaying a visible grid (e.g., light gray lines). The grid helps with alignment and scale. Each major grid square could represent 1 foot.
* **Snapping:** All drawing and object placement should "snap" to the grid lines for easy alignment.
* **Panning & Zooming:** The user can pan around the canvas (e.g., by holding the spacebar and dragging) and zoom in and out (e.g., with a mouse wheel or trackpad pinch).

**2.2 The Toolbar**
A simple, fixed toolbar at the top of the screen contains the primary tools:

* **Select Tool (V):** The default tool. Used to select, move, and resize objects on the canvas.
* **Structure Tool (R):** Activates drawing mode. The user clicks and drags on the canvas to draw a rectangle, representing a physical structure.
* **Text Tool (T):** Allows the user to click anywhere on the canvas and add a text label.

**2.3 The Side Panel (Contextual)**
This panel on the right-hand side changes based on the user's current action.

* **Default View (Recommendations):** When no object is selected, this panel shows the LLM-generated plant recommendations.
* **Properties View:** When an object (like a structure or a plant) is selected on the canvas, this panel switches to show its properties, allowing the user to make adjustments.

### **3.0 Garden Objects & Elements**

**These are the items the user can place on the canvas.**

**3.1 Structures (User-Drawn)**

* **Representation:** Simple, solid-color rectangles.
* **Creation:** Created using the  **Structure Tool** **.**
* **Properties (Visible in Side Panel when selected):**
  * `<span class="selected">Label</span>`: A user-editable text field (e.g., "Raised Bed 1", "Fence", "Shed").
  * `<span class="selected">Dimensions</span>`: Read-only fields showing width and height (e.g., "8 ft x 4 ft"). Resizing the object on the canvas updates these values.
  * `<span class="selected">Color</span>`: A color picker to change the fill color of the rectangle.

**3.2 Plants (LLM-Generated & User-Placed)**

* **Representation:** A simple circle with a text label (the plant's name) in the center.
* **Creation:** Dragged from the **Recommendation Side Panel** onto the canvas.
* **Visual Intelligence (The Spacing Rule):** When a plant is placed or selected, the application must draw a semi-transparent "spacing" circle around it. The radius of this circle is determined by the `<span class="selected">spacing</span>` property from the LLM's output. This visually shows the user how much room the plant needs to grow, preventing them from placing other plants too close.
* **Properties (Visible in Side Panel when selected):**
  * **All properties from the LLM's JSON output (see section 4.3) should be displayed as read-only text (e.g., Common Name, Sunlight Needs, Water Needs, etc.). This gives the user instant access to the plant's data.**

### **4.0 The Intelligence Layer: Gemini-Powered Recommendations**

**This is the core logic that makes the app "intelligent."**

**4.1 User Input & Direct LLM Processing**

1. **Initial State:** On first load, the Recommendation Side Panel is empty, prompting the user: "Enter your 5-digit zip code to get plant recommendations."
2. **User Action:** The user enters a zip code and clicks "Go."
3. **Backend Process (Simplified):**
   * **The application sends the zip code directly to the Gemini LLM, which will use its knowledge to determine appropriate plants for that location's climate.**
   * **A loading indicator should be displayed in the side panel while the LLM is processing.**

**4.2 The LLM Prompt (for Gemini Flash)**
The backend will construct and send the following prompt to the Gemini API:

```
You are an expert horticulturalist and garden planner. Based on the user's location, your task is to recommend a variety of plants that will thrive in that specific climate and growing conditions.

**User's Location:**
- Zip Code: {user_zip_code}

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

Return your response as a single, valid JSON object that strictly follows the schema provided. Do not include any introductory text or explanations outside of the JSON structure.

```

**4.3 The Structured Output (JSON Schema)**
The Gemini API call must specify `<span class="selected">responseMimeType: "application/json"</span>` and include the following schema to ensure a predictable, structured output.

```
{
  "type": "OBJECT",
  "properties": {
    "recommendedPlants": {
      "type": "OBJECT",
      "properties": {
        "shadeTrees": {
          "type": "ARRAY",
          "items": { "$ref": "#/definitions/Plant" }
        },
        "fruitTrees": {
          "type": "ARRAY",
          "items": { "$ref": "#/definitions/Plant" }
        },
        "floweringShrubs": {
          "type": "ARRAY",
          "items": { "$ref": "#/definitions/Plant" }
        },
        "vegetables": {
          "type": "ARRAY",
          "items": { "$ref": "#/definitions/Plant" }
        },
        "herbs": {
          "type": "ARRAY",
          "items": { "$ref": "#/definitions/Plant" }
        }
      }
    }
  },
  "definitions": {
    "Plant": {
      "type": "OBJECT",
      "properties": {
        "commonName": { "type": "STRING" },
        "botanicalName": { "type": "STRING" },
        "plantType": { "type": "STRING" },
        "sunlightNeeds": { "type": "STRING" },
        "waterNeeds": { "type": "STRING" },
        "matureSize": { "type": "STRING" },
        "spacing": { "type": "NUMBER" }
      },
      "required": ["commonName", "botanicalName", "plantType", "sunlightNeeds", "waterNeeds", "matureSize", "spacing"]
    }
  }
}

```

**4.4 UI Integration**

* **Upon receiving the valid JSON from the LLM, the ****Recommendation Side Panel** is populated.
* **The UI should use the category keys (**`<span class="selected">shadeTrees</span>`, `<span class="selected">fruitTrees</span>`, etc.) to create collapsible sections.
* **Within each section, the **`<span class="selected">commonName</span>` of each plant is listed. These are the draggable elements.

### **5.0 End-to-End User Workflow**

1. **Landing:** User arrives at the app. They see a blank grid canvas and a prompt in the side panel to enter their zip code.
2. **Personalization:** User enters `<span class="selected">90210</span>`, clicks "Go." The app sends the zip code directly to Gemini, which uses its knowledge to recommend climate-appropriate plants. A loader appears.
3. **Recommendations Load:** The side panel populates with collapsible lists: "Shade Trees," "Fruit Trees," etc.
4. **Layout Design (Structures):** The user selects the  **Structure Tool** **. They draw an 8x4 rectangle on the grid. They select it, and in the Properties panel, they label it "Veggie Bed" and color it brown.**
5. **Layout Design (Plants):** The user expands the "Vegetables" list in the recommendations. They drag "Tomato" from the list and drop it inside their "Veggie Bed" rectangle on the canvas.
6. **Intelligent Feedback:** A "Tomato" circle appears on the canvas where they dropped it. A larger, semi-transparent circle with a 2-foot radius (based on the `<span class="selected">spacing: 2</span>` property from the LLM) is drawn around it.
7. **Refinement:** The user drags a "Basil" plant from the "Herbs" list and places it next to the tomato, ensuring its spacing circle doesn't significantly overlap the tomato's.
8. **Review:** The user selects the "Tomato" plant. The side panel switches to Properties view, showing all the data for tomatoes: "Full Sun," "Consistent moisture," etc., allowing them to plan accordingly.
