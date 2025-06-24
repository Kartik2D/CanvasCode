import { TOOL_TEMPLATES } from "./tool-templates.js";
import { ToolSystem } from "./tool-system.js";
import type { Tool } from "./tool-system.js";
import type {
  PaperManagerEvent,
  PaperManagerEventType,
  EventListener,
} from "./types.js";

export class PaperManager {
  private currentToolName: string | null = null;
  private currentCode: string = "";
  private eventListeners: Set<EventListener<PaperManagerEventType>> = new Set();
  /**
   * Observes changes to the canvas element's size so we can keep Paper.js
   * in sync when the surrounding flex-box layout is resized. Without this,
   * the canvas element stretches visually while the internal resolution of
   * the Paper.js view remains unchanged, leading to distorted drawings and
   * incorrect cursor positions.
   */
  private resizeObserver: ResizeObserver;
  private toolSystem: ToolSystem;

  constructor(canvas: HTMLCanvasElement) {
    // Create or reuse a global tool system so components can access it too
    if (window.toolSystem) {
      this.toolSystem = window.toolSystem;
    } else {
      this.toolSystem = new ToolSystem();
      window.toolSystem = this.toolSystem;
    }

    // Set up Paper.js
    window.paper.setup(canvas);

    // Make project and view available globally after setup
    window.project = window.paper.project;
    window.view = window.paper.view;

    // Keep the Paper.js view in sync with the real DOM size of the canvas.
    // paper.view only reacts to window resize events, but inside a flex
    // container our canvas can change size without the window changing. We
    // therefore observe the canvas element directly and update the view
    // whenever its bounding box changes.
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;

        // Prevent zero-sized updates that can occur while the element is
        // detaching / attaching.
        if (width > 0 && height > 0 && window.view) {
          // Update the Paper.js view size. This keeps the internal pixel
          // resolution in sync and fires the onResize callback so the view
          // can redraw.
          window.view.viewSize = new window.paper.Size(width, height);

          // Broadcast the resize so other modules (e.g., OverlayCanvas) can
          // stay in sync without attaching their own ResizeObservers.
          window.dispatchEvent(
            new CustomEvent("paperCanvasResized", {
              detail: { width, height },
            })
          );

          // Make sure we redraw immediately so the user sees crisp output
          // while dragging the handle.
          window.view.draw();
        }
      }
    });

    this.resizeObserver.observe(canvas);

    // Clear canvas on resize
    window.view.onResize = () => {
      // Simply redraw the view. We no longer reload the entire tool here
      // because that is expensive and unnecessary – changing the view size
      // does not invalidate the current drawing.
      window.view.draw();
    };

    // Forward uncaught runtime errors to the UI so users can see what went wrong
    window.addEventListener("error", (event: ErrorEvent) => {
      console.error("Global error caught:", event.message);
      this.notifyError(event.message);
    });

    // Also catch unhandled promise rejections
    window.addEventListener(
      "unhandledrejection",
      (event: PromiseRejectionEvent) => {
        console.error("Unhandled promise rejection:", event.reason);
        this.notifyError(
          event.reason instanceof Error
            ? event.reason.message
            : String(event.reason)
        );
      }
    );
  }

  loadTool(toolName: string): void {
    try {
      console.log(`Loading tool: ${toolName}`);

      // Clean up current tool
      this.cleanup();

      // Get tool template
      const template = TOOL_TEMPLATES[toolName];
      if (!template) {
        throw new Error(`Tool "${toolName}" not found`);
      }

      console.log(`Tool template found:`, template);

      // Store current state
      this.currentToolName = toolName;
      this.currentCode = template.code;

      // Execute the tool code
      this.executeCode(this.currentCode);

      // Notify listeners that tool has changed
      console.log(`Notifying tool changed: ${toolName}`);
      this.notifyToolChanged(toolName, this.currentCode);
    } catch (error) {
      console.error("Error loading tool:", error);
      this.notifyError(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }

  executeCode(code: string): void {
    try {
      console.log("Executing tool code (ToolSystem)...");

      // Store the code
      this.currentCode = code;

      // Build a function expecting to return a Tool object
      // Expose paper / project / view / toolSystem in its scope
      const factoryFunc = new Function(
        "paper",
        "project",
        "view",
        "toolSystem",
        `${code}`
      ) as (
        paper: any,
        project: any,
        view: any,
        toolSystem: ToolSystem
      ) => Tool | void;

      const maybeTool = factoryFunc(
        window.paper,
        window.project,
        window.view,
        this.toolSystem
      );

      const toolObj: Tool | undefined =
        maybeTool && typeof maybeTool === "object"
          ? (maybeTool as Tool)
          : undefined;

      if (toolObj && toolObj.name) {
        // Register (overwrite if existing) and activate
        this.toolSystem.register(toolObj);
        this.toolSystem.activate(toolObj.name);

        // Notify outline etc.
        this.notifyProjectChanged();
      }
    } catch (error) {
      console.error("Error executing custom tool code:", error);
      this.notifyError(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }

  updateCode(code: string): void {
    // When user edits code, we clear everything and start fresh
    this.executeCode(code);
    this.notifyCodeChanged(code);
  }

  private clearCanvas(): void {
    console.log("Clearing canvas (removing all artwork)");
    if (window.project) {
      window.project.clear();
      this.notifyProjectChanged();
    }
  }

  getCurrentCode(): string {
    return this.currentCode;
  }

  getCurrentToolName(): string | null {
    return this.currentToolName;
  }

  clearAll(): void {
    this.clearCanvas();
  }

  private cleanup(): void {
    console.log("Cleaning up previous tools (keeping artwork)");

    // Remove all existing tools
    if (window.paper.tools) {
      console.log(`Removing ${window.paper.tools.length} existing tools`);
      // Deactivate all tools first
      window.paper.tools.forEach((tool: any) => {
        if (tool.remove) {
          tool.remove();
        }
      });
      window.paper.tools.length = 0;
    }

    // DON'T clear the project - we want to keep the drawings!
    // Only clear if explicitly requested (like when running new code)

    console.log("Cleanup complete - artwork preserved");
  }

  // Event system for communicating with UI components
  addEventListener<T extends PaperManagerEventType>(
    type: T,
    callback: (event: PaperManagerEvent[T]) => void
  ): void {
    this.eventListeners.add({
      type,
      callback,
    } as EventListener<PaperManagerEventType>);
  }

  removeEventListener<T extends PaperManagerEventType>(
    type: T,
    callback: (event: PaperManagerEvent[T]) => void
  ): void {
    this.eventListeners.forEach((listener) => {
      if (listener.type === type && listener.callback === callback) {
        this.eventListeners.delete(listener);
      }
    });
  }

  private notifyToolChanged(toolName: string, code: string): void {
    console.log(
      `Notifying ${this.eventListeners.size} listeners about tool change: ${toolName}`
    );
    this.eventListeners.forEach((listener) => {
      if (listener.type === "toolChanged") {
        console.log(`Calling listener for toolChanged`);
        (
          listener.callback as (event: PaperManagerEvent["toolChanged"]) => void
        )({ toolName, code });
      }
    });
  }

  private notifyCodeChanged(code: string): void {
    this.eventListeners.forEach((listener) => {
      if (listener.type === "codeChanged") {
        (
          listener.callback as (event: PaperManagerEvent["codeChanged"]) => void
        )({ code });
      }
    });
  }

  private notifyError(message: string): void {
    this.eventListeners.forEach((listener) => {
      if (listener.type === "error") {
        (listener.callback as (event: PaperManagerEvent["error"]) => void)({
          message,
        });
      }
    });
  }

  notifyProjectChanged(): void {
    this.eventListeners.forEach((listener) => {
      if (listener.type === "projectChanged") {
        (
          listener.callback as (
            event: PaperManagerEvent["projectChanged"]
          ) => void
        )({});
      }
    });
  }
}
