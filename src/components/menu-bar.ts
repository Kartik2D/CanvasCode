import { LitElement, html, css } from "lit";

export class MenuBar extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: row;
      height: 40px;
      background: var(--header-bg);
      border-radius: var(--radius);
      overflow: hidden;
      flex-shrink: 0;
      align-items: center;
      padding: 0 var(--space-unit);
      gap: var(--space-unit);
      /* Prevent text selection on mobile */
      user-select: none;
      -webkit-user-select: none;
      -webkit-touch-callout: none;
    }

    .menu-section {
      display: flex;
      align-items: center;
      gap: calc(var(--space-unit) / 2);
    }

    .menu-button {
      background: transparent;
      border: none;
      color: var(--text-a);
      font-family: var(--font-family);
      font-size: var(--font-size);
      padding: calc(var(--space-unit) / 2) var(--space-unit);
      border-radius: calc(var(--radius) / 2);
      cursor: pointer;
      transition: var(--transition);
      min-height: 28px;
      display: flex;
      align-items: center;
      gap: calc(var(--space-unit) / 2);
    }

    .menu-button:hover {
      background: var(--bg-b);
    }

    .menu-button:active {
      background: var(--border-a);
    }

    .menu-separator {
      width: 1px;
      height: 20px;
      background: var(--border-a);
      margin: 0 calc(var(--space-unit) / 2);
    }

    .app-title {
      font-weight: 600;
      color: var(--text-a);
      margin-right: var(--space-unit);
    }

    .spacer {
      flex-grow: 1;
    }

    /* Support for slotted content */
    ::slotted(.menu-section) {
      display: flex;
      align-items: center;
      gap: calc(var(--space-unit) / 2);
    }

    ::slotted(.menu-button) {
      background: transparent;
      border: none;
      color: var(--text-a);
      font-family: var(--font-family);
      font-size: var(--font-size);
      padding: calc(var(--space-unit) / 2) var(--space-unit);
      border-radius: calc(var(--radius) / 2);
      cursor: pointer;
      transition: var(--transition);
      min-height: 28px;
      display: flex;
      align-items: center;
      gap: calc(var(--space-unit) / 2);
    }

    ::slotted(.menu-button:hover) {
      background: var(--bg-b);
    }

    ::slotted(.menu-separator) {
      width: 1px;
      height: 20px;
      background: var(--border-a);
      margin: 0 calc(var(--space-unit) / 2);
    }
  `;

  private handleMenuAction(action: string) {
    // Dispatch custom event for menu actions
    this.dispatchEvent(
      new CustomEvent("menu-action", {
        detail: { action },
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    return html`
      <div class="app-title">Canvas Code</div>

      <div class="menu-section">
        <button
          class="menu-button"
          @click="${() => this.handleMenuAction("new")}"
          title="New Canvas"
        >
          New
        </button>
        <button
          class="menu-button"
          @click="${() => this.handleMenuAction("open")}"
          title="Open File"
        >
          Open
        </button>
        <button
          class="menu-button"
          @click="${() => this.handleMenuAction("save")}"
          title="Save"
        >
          Save
        </button>
      </div>

      <div class="menu-separator"></div>

      <div class="menu-section">
        <button
          class="menu-button"
          @click="${() => this.handleMenuAction("undo")}"
          title="Undo"
        >
          Undo
        </button>
        <button
          class="menu-button"
          @click="${() => this.handleMenuAction("redo")}"
          title="Redo"
        >
          Redo
        </button>
      </div>

      <div class="spacer"></div>

      <div class="menu-section">
        <button
          class="menu-button"
          @click="${() => this.handleMenuAction("export")}"
          title="Export"
        >
          Export
        </button>
      </div>

      <!-- Allow for additional custom menu items -->
      <slot></slot>
    `;
  }
}

customElements.define("menu-bar", MenuBar);
