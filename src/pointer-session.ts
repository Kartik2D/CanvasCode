/*
 * PointerSessionManager – collects PointerData for the lifetime of each
 * active pointer (mouse, pen, touch). This is useful for tools that want the
 * full history of a stroke or need to compute statistics like length,
 * velocity, etc. It also guarantees that memory used for a stroke is released
 * the moment the pointer is lifted or cancelled.
 */
import type { PointerData } from "./tool-system.js";

export class PointerSessionManager {
  private sessions: Map<number, PointerData[]> = new Map();

  /**
   * Called when a new pointer is pressed.
   */
  start(data: PointerData): void {
    this.sessions.set(data.pointerId, [data]);
  }

  /**
   * Called for every movement of an active pointer.
   */
  move(data: PointerData): void {
    const arr = this.sessions.get(data.pointerId);
    if (arr) arr.push(data);
  }

  /**
   * Called when the pointer is released or cancelled. Returns the full data
   * array for the session so callers can process it and then frees memory.
   */
  end(data: PointerData): PointerData[] | undefined {
    const arr = this.sessions.get(data.pointerId);
    if (arr) {
      arr.push(data);
      this.sessions.delete(data.pointerId);
    }
    return arr;
  }

  /**
   * Retrieve an in-progress session (useful for live feedback).
   */
  get(pointerId: number): PointerData[] | undefined {
    return this.sessions.get(pointerId);
  }
}
