export interface ToolTemplate {
  name: string;
  description: string;
  code: string;
}

export interface ToolTemplates {
  [key: string]: ToolTemplate;
}

export interface PaperManagerEvent {
  toolChanged: { toolName: string; code: string };
  codeChanged: { code: string };
  error: { message: string };
  projectChanged: {};
}

export type PaperManagerEventType = keyof PaperManagerEvent;

export interface EventListener<T extends PaperManagerEventType> {
  type: T;
  callback: (event: PaperManagerEvent[T]) => void;
}

export interface GlobalColorSystem {
  primary: string;
  secondary: string;
  listeners: Set<Function>;
  setPrimary: (color: string) => void;
  setSecondary: (color: string) => void;
  addListener: (listener: Function) => void;
  removeListener: (listener: Function) => void;
}

// Extend Window interface to include our global paperManager
declare global {
  interface Window {
    paperManager: any; // Will be typed properly when PaperManager is created
    paper: any;
    project: any;
    view: any;
    globalColors: GlobalColorSystem;

    // New in-house systems
    toolSystem: import("./tool-system.js").ToolSystem;
    inputSystem: any;

    // Overlay canvas utility
    OverlayCanvas: typeof import("./overlay-canvas.js").OverlayCanvas;

    // Potrace library for bitmap to SVG conversion
    potrace: typeof import("esm-potrace-wasm").potrace;
  }
}
