import { LitElement, html, css } from "lit";

export class PaperCanvas extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--bg-a);
      border-radius: var(--radius);
      overflow: hidden;
    }

    .canvas-container {
      flex-grow: 1;
      display: flex;
      position: relative;
      /* Remove any padding that GenericPanel had */
      padding: 0;
      /* Ensure the canvas fills the entire container */
      width: 100%;
      height: 100%;
    }

    ::slotted(canvas) {
      /* Ensure canvas takes full space */
      width: 100% !important;
      height: 100% !important;
      display: block;
      /* Canvas-specific styles */
      touch-action: none;
      user-select: none;
      -webkit-user-select: none;
      -webkit-touch-callout: none;
      background-color: white;
    }

    /* Support for overlay canvas positioning */
    .canvas-container::after {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
      z-index: 1;
    }
  `;

  render() {
    return html`
      <div class="canvas-container">
        <slot></slot>
      </div>
    `;
  }
}

customElements.define("paper-canvas", PaperCanvas);
