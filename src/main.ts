import paper from "paper";
import { ToolSystem } from "./tool-system.js";
import { InputManager } from "./input-manager.js";
import { PaperManager } from "./paper-manager.js";
import { OverlayCanvas } from "./overlay-canvas.js";
import { potrace, init as initPotrace } from "esm-potrace-wasm";
import "./components/tool-selector.js";
import "./components/code-editor.js";
import "./components/generic-panel.js";
import "./components/paper-canvas.js";
import "./components/resizable-layout.js";
import "./components/outline-panel.js";
import "./components/color-panel.js";
import "./components/menu-bar.js";

// Set up Paper.js globals on window manually (avoiding paper.install issues)
window.paper = paper;

// Make OverlayCanvas available globally for tool templates
window.OverlayCanvas = OverlayCanvas;

// Initialize potrace and make it globally available
(async () => {
  await initPotrace();
  window.potrace = potrace;
  console.log("Potrace initialized and made globally available");
})();

// Initialize the Paper.js canvas and manager
window.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("paper-canvas") as HTMLCanvasElement;

  if (!canvas) {
    console.error("Canvas element not found");
    return;
  }

  // Create the in-house systems
  const toolSystem = new ToolSystem();
  const inputSystem = new InputManager(canvas, toolSystem);

  // Expose globally so other modules/components can access
  window.toolSystem = toolSystem;
  window.inputSystem = inputSystem;

  // Create the paper manager (which will reuse the global toolSystem)
  const paperManager = new PaperManager(canvas);

  // Make paperManager globally available for components
  window.paperManager = paperManager;
  console.log("PaperManager created and made globally available");

  // Initialize with a simple drawing tool
  paperManager.loadTool("stroke");

  console.log("Paper.js Runtime Editor initialized");
});
