/*
 * InputManager – converts DOM pointer / keyboard events to ToolSystem events.
 */

import { ToolSystem } from "./tool-system.js";
import type { PointerData, KeyData } from "./tool-system.js";
import { PointerSessionManager } from "./pointer-session.js";

export class InputManager {
  private canvas: HTMLCanvasElement;
  private toolSystem: ToolSystem;
  private sessionManager = new PointerSessionManager();

  constructor(canvas: HTMLCanvasElement, toolSystem: ToolSystem) {
    this.canvas = canvas;
    this.toolSystem = toolSystem;
    // Make the session manager available to tools via the ToolSystem.
    this.toolSystem.sessionManager = this.sessionManager;

    // Unified pointer routing (down / move / up / cancel)
    ["pointerdown", "pointermove", "pointerup", "pointercancel"].forEach(
      (type) =>
        canvas.addEventListener(type, this.routePointer as any, {
          passive: false,
        })
    );

    // Keyboard events (global)
    window.addEventListener("keydown", this.handleKeyDown, { passive: false });
    window.addEventListener("keyup", this.handleKeyUp, { passive: false });

    // Prevent the system context menu / share sheet from appearing when
    // long-pressing or holding the Apple Pencil on the canvas (Safari on iPad).
    // This resolves an issue where the Share option would pop up during drawing.
    canvas.addEventListener(
      "contextmenu",
      (ev) => {
        ev.preventDefault();
      },
      { passive: false }
    );
  }

  /* ---------- Pointer helpers ---------- */
  private makePointerData = (ev: PointerEvent): PointerData => {
    const rect = this.canvas.getBoundingClientRect();
    const viewPoint = new window.paper.Point(
      ev.clientX - rect.left,
      ev.clientY - rect.top
    );
    const projectPoint = window.view
      ? window.view.viewToProject(viewPoint)
      : viewPoint;

    return {
      point: projectPoint,
      pressure: ev.pressure ?? 0,
      buttons: ev.buttons,
      pointerId: ev.pointerId,
      pointerType: ev.pointerType as "mouse" | "pen" | "touch",
      tiltX: ev.tiltX,
      tiltY: ev.tiltY,
      native: ev,
    };
  };

  /**
   * Returns true if the event should be ignored by the drawing engine.
   * We skip events that originate on draggable elements or within the
   * outline panel so that UI interactions do not trigger drawing logic.
   */
  private shouldIgnore(ev: Event): boolean {
    const target = ev.target as HTMLElement | null;
    if (!target) return false;
    return (
      !!target.closest('[draggable="true"]') ||
      !!target.closest(".outline-panel")
    );
  }

  /**
   * Unified pointer event handler.
   * Translates raw DOM events to the ToolSystem and triggers project redraws.
   */
  private routePointer = (ev: PointerEvent): void => {
    if (this.shouldIgnore(ev)) return;

    ev.preventDefault(); // Block default browser behaviours (text‐select, zoom, …)

    // For pointerdown, capture the pointer so subsequent move / up events
    // continue to target the canvas even if the pointer leaves its bounds.
    if (ev.type === "pointerdown") {
      (ev.target as HTMLElement).setPointerCapture?.(ev.pointerId);
    }

    const data = this.makePointerData(ev);

    // Normalise cancel → up so tools don't need a special handler.
    const type = ev.type === "pointercancel" ? "pointerup" : (ev.type as any);

    // Track full session history for interested tools / analytics.
    if (type === "pointerdown") this.sessionManager.start(data);
    else if (type === "pointermove") this.sessionManager.move(data);
    else if (type === "pointerup") this.sessionManager.end(data);

    this.toolSystem.dispatchPointer(type, data);

    // Let interested components re-render their previews / outlines.
    // Notify other components only for pointerdown and pointerup to avoid
    // excessive updates during continuous pointermove events which can cause
    // performance issues when large drawings or complex panels (e.g., the
    // outline panel) are recalculated on every move.
    if (type === "pointerdown" || type === "pointerup") {
      window.paperManager?.notifyProjectChanged?.();
    }
  };

  /* ---------- Key helpers ---------- */
  private makeKeyData = (ev: KeyboardEvent): KeyData => {
    return {
      key: ev.key,
      code: ev.code,
      ctrl: ev.ctrlKey,
      shift: ev.shiftKey,
      alt: ev.altKey,
      meta: ev.metaKey,
      native: ev,
    };
  };

  private handleKeyDown = (ev: KeyboardEvent): void => {
    const data = this.makeKeyData(ev);
    this.toolSystem.dispatchKey("keydown", data);
  };

  private handleKeyUp = (ev: KeyboardEvent): void => {
    const data = this.makeKeyData(ev);
    this.toolSystem.dispatchKey("keyup", data);
  };
}
