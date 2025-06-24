/*
 * In-house ToolSystem – registers custom tools and dispatches input events.
 */

export interface PointerData {
  point: any; // Paper.Point runtime instance; using any to avoid type conflicts
  pressure: number;
  buttons: number;
  pointerId: number;
  pointerType: "mouse" | "pen" | "touch";
  tiltX: number;
  tiltY: number;
  native: PointerEvent;
}

export interface KeyData {
  key: string;
  code: string;
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
  native: KeyboardEvent;
}

export interface Tool {
  name: string;
  onPointerDown?(e: PointerData): void;
  onPointerMove?(e: PointerData): void;
  onPointerUp?(e: PointerData): void;
  onKeyDown?(e: KeyData): void;
  onKeyUp?(e: KeyData): void;
  onActivate?(): void;
  onDeactivate?(): void;
  /**
   * Optional hook that will be invoked when the global primary / secondary
   * colours change. Tools that cache colour values can update their state here
   * instead of being re-compiled.
   */
  onColorChange?(colors: { primary: string; secondary: string }): void;
  /**
   * Arbitrary state bag for the tool implementation.
   * The ToolSystem will not touch this.
   */
  [key: string]: unknown;
}

/**
 * Simple registry / dispatcher holding the currently active tool.
 */
export class ToolSystem {
  private tools: Map<string, Tool> = new Map();
  private activeTool: Tool | null = null;

  /**
   * InputManager installs the session manager here so tools can query it.
   * It is optional because ToolSystem itself does not create it.
   */
  sessionManager?: import("./pointer-session.js").PointerSessionManager;

  /** Register or overwrite a tool by name. */
  register(tool: Tool): void {
    if (!tool || typeof tool.name !== "string" || tool.name === "") {
      throw new Error("Tool must have a non-empty name property");
    }
    this.tools.set(tool.name, tool);
  }

  /** Activate a previously registered tool by its name. */
  activate(name: string): void {
    const next = this.tools.get(name);
    if (!next) {
      console.warn(`ToolSystem: Cannot activate unknown tool \"${name}\"`);
      return;
    }
    if (this.activeTool && this.activeTool.onDeactivate) {
      try {
        this.activeTool.onDeactivate();
      } catch (err) {
        console.error("Tool onDeactivate error", err);
      }
    }
    this.activeTool = next;
    if (next.onActivate) {
      try {
        next.onActivate();
      } catch (err) {
        console.error("Tool onActivate error", err);
      }
    }
  }

  getActiveTool(): Tool | null {
    return this.activeTool;
  }

  getActiveToolName(): string | null {
    return this.activeTool?.name ?? null;
  }

  /* Dispatch helpers */
  dispatchPointer(
    type: "pointerdown" | "pointermove" | "pointerup",
    e: PointerData
  ): void {
    if (!this.activeTool) return;
    try {
      if (type === "pointerdown") this.activeTool.onPointerDown?.(e);
      else if (type === "pointermove") this.activeTool.onPointerMove?.(e);
      else if (type === "pointerup") this.activeTool.onPointerUp?.(e);
    } catch (err) {
      console.error(
        `Tool (${this.activeTool.name}) pointer handler error`,
        err
      );
    }
  }

  dispatchKey(type: "keydown" | "keyup", e: KeyData): void {
    if (!this.activeTool) return;
    try {
      if (type === "keydown") this.activeTool.onKeyDown?.(e);
      else if (type === "keyup") this.activeTool.onKeyUp?.(e);
    } catch (err) {
      console.error(`Tool (${this.activeTool.name}) key handler error`, err);
    }
  }
}
