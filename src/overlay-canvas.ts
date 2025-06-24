/**
 * OverlayCanvas - Utility class for managing a low-resolution raster overlay
 * on top of the Paper.js canvas for pixel-based drawing tools.
 */
import paper from "paper";

export class OverlayCanvas {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private resizeListener: ((ev: Event) => void) | null = null;
  private scale: number;
  private potraceOptions: any;

  constructor(scale: number = 0.25, potraceOptions: any = {}) {
    this.scale = scale;
    this.potraceOptions = potraceOptions;
  }

  /**
   * Create and position the overlay canvas over the paper canvas
   */
  create(): CanvasRenderingContext2D | null {
    const paperCanvas = document.getElementById("paper-canvas");
    if (!paperCanvas) {
      console.warn("Paper canvas not found");
      return null;
    }

    // Remove any existing overlay
    this.destroy();

    // Create overlay canvas positioned exactly over the paper canvas
    this.canvas = document.createElement("canvas");
    this.canvas.id = "raster-overlay";
    this.canvas.style.position = "fixed";
    this.canvas.style.pointerEvents = "none"; // Don't block input to paper canvas
    this.canvas.style.imageRendering = "pixelated"; // Keep pixels crisp when scaled
    this.canvas.style.zIndex = "100"; // Ensure it's on top

    // Add to document body so it's not constrained by parent containers
    document.body.appendChild(this.canvas);

    // Set up initial size and position
    this.updateSize();

    // Get drawing context
    this.ctx = this.canvas.getContext("2d");
    if (this.ctx) {
      this.ctx.imageSmoothingEnabled = false; // Keep pixels crisp
    }

    // Listen for resize events dispatched by PaperManager so we can keep
    // the overlay in sync without owning another ResizeObserver.
    this.resizeListener = () => this.updateSize();
    window.addEventListener("paperCanvasResized", this.resizeListener);

    console.log("Overlay canvas created");
    return this.ctx;
  }

  /**
   * Update overlay size and position to match paper canvas
   */
  private updateSize(): void {
    const paperCanvas = document.getElementById("paper-canvas");
    if (!paperCanvas || !this.canvas) return;

    // Get paper canvas position and size
    const rect = paperCanvas.getBoundingClientRect();

    // Update overlay position and size to match paper canvas
    this.canvas.style.left = rect.left + "px";
    this.canvas.style.top = rect.top + "px";
    this.canvas.style.width = rect.width + "px";
    this.canvas.style.height = rect.height + "px";

    // Set internal resolution (low res)
    this.canvas.width = rect.width * this.scale;
    this.canvas.height = rect.height * this.scale;

    // Restore context settings after canvas resize
    if (this.ctx) {
      this.ctx.imageSmoothingEnabled = false;
    }
  }

  /**
   * Convert Paper.js coordinates to overlay canvas coordinates
   */
  paperToOverlay(point: { x: number; y: number }): { x: number; y: number } {
    return {
      x: point.x * this.scale,
      y: point.y * this.scale,
    };
  }

  /**
   * Get the drawing context
   */
  getContext(): CanvasRenderingContext2D | null {
    return this.ctx;
  }

  /**
   * Get the canvas element
   */
  getCanvas(): HTMLCanvasElement | null {
    return this.canvas;
  }

  /**
   * Clear the overlay canvas
   */
  clear(): void {
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  /**
   * Get ImageData from the overlay canvas for tracing
   */
  getImageData(): ImageData | null {
    if (!this.ctx || !this.canvas) return null;
    return this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Get the resolution scale factor
   */
  getScale(): number {
    return this.scale;
  }

  /**
   * Vectorise the current raster content using Potrace and import the result
   * into the active Paper.js project. The overlay is cleared automatically.
   *
   * @returns           The imported Paper.js item hierarchy or null on error.
   */
  async traceToPaper(): Promise<any> {
    try {
      const canvasEl = this.getCanvas();
      if (!canvasEl) {
        console.warn("OverlayCanvas: No canvas to trace");
        return null;
      }

      if (typeof window.potrace !== "function") {
        console.error("OverlayCanvas: Potrace is not initialised");
        return null;
      }

      const svg = await window.potrace(canvasEl, this.potraceOptions);
      const imported = paper.project.importSVG(svg);

      if (imported) {
        // Compensate for low-resolution overlay scale without offset
        imported.scale(1 / this.getScale(), new paper.Point(0, 0));

        const primary = window.globalColors?.primary || "#007acc";
        const secondary = window.globalColors?.secondary || "#ff6b6b";

        const applyColour = (item: any) => {
          if (
            item instanceof paper.Path ||
            item instanceof paper.CompoundPath
          ) {
            item.strokeColor = new paper.Color(primary);
            (item as any).fillColor = new paper.Color(secondary);
          } else if (item.children) {
            item.children.forEach(applyColour);
          }
        };
        applyColour(imported);
      }

      return imported;
    } catch (err) {
      console.error("OverlayCanvas: Potrace vectorisation failed", err);
      return null;
    } finally {
      this.clear();
    }
  }

  /**
   * Destroy the overlay canvas and clean up resources
   */
  destroy(): void {
    if (this.canvas) {
      this.canvas.remove();
      this.canvas = null;
      this.ctx = null;
    }
    if (this.resizeListener) {
      window.removeEventListener("paperCanvasResized", this.resizeListener);
      this.resizeListener = null;
    }
  }
}
