import { LitElement, html, css } from "lit";
import { property, state } from "lit/decorators.js";

export class ResizableLayout extends LitElement {
  @property({ type: Number, attribute: "panel-count" }) panelCount = 3;
  @property({ type: String }) orientation: "horizontal" | "vertical" =
    "horizontal";
  @property({ type: Array }) panels: string[] = [];
  @state() private panelSizes: number[] = [];
  @state() private isDragging = false;
  @state() private dragHandleIndex = -1;
  @state() private dragStartPos = 0;
  @state() private dragStartSizes: number[] = [];

  static styles = css`
    :host {
      display: flex;
      width: 100%;
      height: 100%;
      position: relative;
      flex-direction: row;
    }

    :host([orientation="vertical"]) {
      flex-direction: column;
    }

    .panel {
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .resize-handle {
      width: 8px;
      height: 100%;
      background: transparent;
      cursor: col-resize;
      position: relative;
      flex-shrink: 0;
      transition: background-color 0.2s ease;
      touch-action: none; /* Prevent default touch behaviors */
    }

    .panel-content {
      flex: 1;
      overflow: hidden;
    }

    /* Prevent text selection during drag */
    :host(.dragging) {
      user-select: none;
    }

    :host(.dragging) * {
      pointer-events: none;
    }

    :host(.dragging) .resize-handle {
      pointer-events: all;
    }

    :host([orientation="vertical"]) .resize-handle {
      width: 100%;
      height: 8px;
      cursor: row-resize;
    }
  `;

  constructor() {
    super();
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();
  }

  firstUpdated() {
    // Initialize panel sizes based on current orientation and panel count
    this.initializePanelSizes();
  }

  private initializePanelSizes() {
    const sizes = Array(this.panelCount).fill(0);
    if (this.panelCount > 1) {
      const first = this.orientation === "horizontal" ? 250 : 200;
      sizes[0] = first;

      if (this.panelCount > 2) {
        const last = this.orientation === "horizontal" ? 350 : 200;
        sizes[this.panelCount - 1] = last;
      }
    }
    this.panelSizes = sizes;
  }

  private handleMouseDown(event: MouseEvent, handleIndex: number) {
    event.preventDefault();
    this.startDrag(handleIndex, event.clientX, event.clientY);
    document.addEventListener("mousemove", this.handleMouseMove);
    document.addEventListener("mouseup", this.handleMouseUp);
  }

  private handleTouchStart(event: TouchEvent, handleIndex: number) {
    event.preventDefault();
    const touch = event.touches[0];
    this.startDrag(handleIndex, touch.clientX, touch.clientY);
    document.addEventListener("touchmove", this.handleTouchMove, {
      passive: false,
    });
    document.addEventListener("touchend", this.handleTouchEnd);
  }

  private startDrag(handleIndex: number, clientX: number, clientY: number) {
    this.isDragging = true;
    this.dragHandleIndex = handleIndex;
    this.dragStartPos = this.orientation === "horizontal" ? clientX : clientY;
    this.dragStartSizes = [...this.panelSizes];
    this.classList.add("dragging");
  }

  private handleMouseMove(event: MouseEvent) {
    if (!this.isDragging || this.dragHandleIndex === -1) return;
    event.preventDefault();
    this.updateDrag(event.clientX, event.clientY);
  }

  private handleTouchMove(event: TouchEvent) {
    if (!this.isDragging || this.dragHandleIndex === -1) return;
    event.preventDefault();
    const touch = event.touches[0];
    this.updateDrag(touch.clientX, touch.clientY);
  }

  private updateDrag(clientX: number, clientY: number) {
    const currentPos = this.orientation === "horizontal" ? clientX : clientY;
    const delta = currentPos - this.dragStartPos;

    const newSizes = [...this.dragStartSizes];
    const firstIndex = this.dragHandleIndex;
    const secondIndex = this.dragHandleIndex + 1;

    if (this.panelSizes[firstIndex] > 0) {
      newSizes[firstIndex] = Math.max(
        0,
        this.dragStartSizes[firstIndex] + delta
      );
    }

    if (this.panelSizes[secondIndex] > 0) {
      newSizes[secondIndex] = Math.max(
        0,
        this.dragStartSizes[secondIndex] - delta
      );
    }

    this.panelSizes = newSizes;
    this.requestUpdate();
  }

  private handleMouseUp() {
    this.endDrag();
    document.removeEventListener("mousemove", this.handleMouseMove);
    document.removeEventListener("mouseup", this.handleMouseUp);
  }

  private handleTouchEnd() {
    this.endDrag();
    document.removeEventListener("touchmove", this.handleTouchMove);
    document.removeEventListener("touchend", this.handleTouchEnd);
  }

  private endDrag() {
    this.isDragging = false;
    this.dragHandleIndex = -1;
    this.classList.remove("dragging");
  }

  private getPanelStyle(index: number): string {
    const size = this.panelSizes[index];
    if (size === 0) {
      return "flex: 1;";
    }

    if (this.orientation === "horizontal") {
      return `flex: 0 0 ${size}px; width: ${size}px;`;
    }
    return `flex: 0 0 ${size}px; height: ${size}px;`;
  }

  render() {
    const panelCount = this.panelCount;
    const panels = Array.from({ length: panelCount }, (_, i) => i);

    return html`
      ${panels.map(
        (index) => html`
          <div class="panel" style="${this.getPanelStyle(index)}">
            <div class="panel-content">
              <slot name="panel-${index}"></slot>
            </div>
          </div>
          ${index < panelCount - 1
            ? html`
                <div
                  class="resize-handle ${this.isDragging &&
                  this.dragHandleIndex === index
                    ? "dragging"
                    : ""}"
                  @mousedown="${(e: MouseEvent) =>
                    this.handleMouseDown(e, index)}"
                  @touchstart="${(e: TouchEvent) =>
                    this.handleTouchStart(e, index)}"
                ></div>
              `
            : ""}
        `
      )}
    `;
  }
}

customElements.define("resizable-layout", ResizableLayout);
