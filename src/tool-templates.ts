import type { ToolTemplates } from "./types.js";

export const TOOL_TEMPLATES: ToolTemplates = {
  stroke: {
    name: "Stroke",
    description: "Free-hand drawing tool",
    code: `// Stroke Tool – uses global primary color
return {
  name: 'Stroke',
  onPointerDown(e) {
    this.path = new paper.Path({
      strokeColor: window.globalColors?.primary || '#007acc',
      strokeWidth: 5,
      strokeCap: 'round',
      strokeJoin: 'round'
    });
    this.path.add(e.point);
  },
  onPointerMove(e) {
    if (this.path) this.path.add(e.point);
  },
  onPointerUp() {
    if (this.path) this.path.simplify();
    this.path = undefined;
  }
};`,
  },

  rectangle: {
    name: "Rectangle",
    description: "Draw rectangles by drag",
    code: `// Rectangle Tool – uses global primary color
return {
  name: 'Rectangle',
  onPointerDown(e) {
    this.start = e.point;
    this.rectPath = null;
  },
  onPointerMove(e) {
    if (!this.start) return;
    if (this.rectPath) this.rectPath.remove();
    const rectangle = new paper.Rectangle(this.start, e.point);
    this.rectPath = new paper.Path.Rectangle(rectangle);
    this.rectPath.strokeColor = window.globalColors?.primary || '#007acc';
    this.rectPath.strokeWidth = 2;
  },
  onPointerUp() {
    this.start = undefined;
    this.rectPath = undefined;
  }
};`,
  },

  line: {
    name: "Line",
    description: "Straight line between drag endpoints",
    code: `// Line Tool – uses global secondary color
return {
  name: 'Line',
  onPointerDown(e) {
    this.start = e.point;
    this.path = new paper.Path({
      strokeColor: window.globalColors?.secondary || '#ff6b6b',
      strokeWidth: 3
    });
    this.path.add(this.start);
  },
  onPointerMove(e) {
    if (!this.path) return;
    if (this.path.segments.length > 1) this.path.removeSegment(1);
    this.path.add(e.point);
  },
  onPointerUp() {
    this.start = undefined;
    this.path = undefined;
  }
};`,
  },

  circle: {
    name: "Circle",
    description: "Draw circles by drag",
    code: `// Circle Tool – uses global secondary color
return {
  name: 'Circle',
  onPointerDown(e) {
    this.start = e.point;
    this.circlePath = null;
  },
  onPointerMove(e) {
    if (!this.start) return;
    if (this.circlePath) this.circlePath.remove();
    const radius = this.start.getDistance(e.point);
    this.circlePath = new paper.Path.Circle(this.start, radius);
    this.circlePath.strokeColor = window.globalColors?.secondary || '#ff6b6b';
    this.circlePath.strokeWidth = 2;
  },
  onPointerUp() {
    this.start = undefined;
    this.circlePath = undefined;
  }
};`,
  },

  pixelbrush: {
    name: "Pixel Brush",
    description: "Raster brush for free-hand drawing with pressure sensitivity",
    code: `// Pixel Brush Tool – leverages OverlayCanvas helper for raster drawing & automatic vectorisation
return {
  name: 'Pixel Brush',
  
  onActivate() {
    console.log('Pixel Brush activated');
    // Create a raster overlay at 25% resolution with custom Potrace options
    this.overlay = new window.OverlayCanvas(0.25, {
      turdsize: 2,
      turnpolicy: 4,
      alphamax: 1,
      opticurve: 1,
      opttolerance: 0.2,
      pathonly: false,
      extractcolors: false,
      posterizelevel: 2,
      posterizationalgorithm: 0
    });
    this.ctx = this.overlay.create();
    
    // Pressure sensitivity settings
    this.maxBrushSize = 16; // Maximum brush size at full pressure
    this.minBrushSize = 2;  // Minimum brush size at no pressure
  },
  
  onDeactivate() {
    console.log('Pixel Brush deactivated');
    this.overlay?.destroy();
    this.overlay = null;
    this.ctx = null;
  },
  
  onPointerDown(e) {
    if (!this.ctx) return;
    
    this.isDrawing = true;
    const overlayPoint = this.overlay.paperToOverlay(e.point);
    
    // Calculate pressure-sensitive brush size
    const pressure = Math.max(0, Math.min(1, e.pressure || 0.5)); // Clamp between 0-1, default to 0.5
    const brushSize = this.minBrushSize + (this.maxBrushSize - this.minBrushSize) * pressure;
    
    // Set brush properties
    this.ctx.strokeStyle = window.globalColors?.primary || '#007acc';
    this.ctx.fillStyle = this.ctx.strokeStyle;
    this.ctx.lineWidth = brushSize;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    
    // Draw initial dot
    this.ctx.beginPath();
    this.ctx.arc(overlayPoint.x, overlayPoint.y, brushSize / 2, 0, Math.PI * 2);
    this.ctx.fill();
    
    this.lastPoint = overlayPoint;
  },
  
  onPointerMove(e) {
    if (!this.isDrawing || !this.ctx) return;
    
    const overlayPoint = this.overlay.paperToOverlay(e.point);
    const pressure = Math.max(0, Math.min(1, e.pressure || 0.5)); // Clamp between 0-1, default to 0.5
    
    // Calculate brush size based on pressure
    const brushSize = this.minBrushSize + (this.maxBrushSize - this.minBrushSize) * pressure;
    
    // Update brush size
    this.ctx.lineWidth = brushSize;
    
    // Draw line from last point to current point
    this.ctx.beginPath();
    this.ctx.moveTo(this.lastPoint.x, this.lastPoint.y);
    this.ctx.lineTo(overlayPoint.x, overlayPoint.y);
    this.ctx.stroke();
    
    this.lastPoint = overlayPoint;
  },
  
  async onPointerUp() {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    if (!this.overlay) return;
    // Vectorise and import into Paper.js with current primary colour
    await this.overlay.traceToPaper();
  }
};`,
  },

  template: {
    name: "Template",
    description:
      "Empty template showing all available tool functions and global references",
    code: `// Template Tool – shows all available functions and global references
// 
// Available globals:
// - window.globalColors.primary    // Current primary color (string)
// - window.globalColors.secondary  // Current secondary color (string)
// - window.OverlayCanvas          // Class for raster drawing
// - paper                         // Paper.js library
// - paper.Path                    // Vector path creation
// - paper.Point                   // Point objects
// - paper.Rectangle               // Rectangle objects
//
// Event object properties:
// - e.point         // Paper.Point of cursor/touch position
// - e.pressure      // Pressure value (0-1, mainly for stylus)
// - e.buttons       // Mouse buttons pressed
// - e.pointerId     // Unique pointer identifier
// - e.pointerType   // "mouse", "pen", or "touch"
// - e.tiltX, e.tiltY // Stylus tilt angles
// - e.native        // Original browser PointerEvent
//
// Key event properties:
// - e.key           // Key pressed (e.g., "a", "Enter")
// - e.code          // Physical key code (e.g., "KeyA")
// - e.ctrl, e.shift, e.alt, e.meta // Modifier keys
// - e.native        // Original browser KeyboardEvent

return {
  name: 'Template',
  
  // Called when tool becomes active
  onActivate() {
    // Initialize tool state, create UI elements, etc.
  },
  
  // Called when tool becomes inactive
  onDeactivate() {
    // Clean up resources, remove temporary elements, etc.
  },
  
  // Called when pointer/mouse is pressed down
  onPointerDown(e) {
    // e.point contains the cursor position
    // e.pressure contains pressure (0-1)
    // Start drawing/interaction here
  },
  
  // Called when pointer/mouse moves
  onPointerMove(e) {
    // Continue drawing/interaction
    // Only called while pointer is down for most browsers
  },
  
  // Called when pointer/mouse is released
  onPointerUp(e) {
    // Finish drawing/interaction
    // Clean up temporary state
  },
  
  // Called when keyboard key is pressed
  onKeyDown(e) {
    // Handle keyboard shortcuts
    // e.key contains the key pressed
  },
  
  // Called when keyboard key is released
  onKeyUp(e) {
    // Handle key release events
  },
  
  // Called when global colors change
  onColorChange(colors) {
    // colors.primary and colors.secondary contain new color values
    // Update any cached color references
  }
};`,
  },
};
