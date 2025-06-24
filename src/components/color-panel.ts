import { LitElement, html, css } from "lit";
import { state } from "lit/decorators.js";
import "./generic-panel.js";

export class ColorPanel extends LitElement {
  @state()
  private primaryColor: string = "#007acc";

  @state()
  private secondaryColor: string = "#ff6b6b";

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .color-controls {
      display: flex;
      flex-direction: column;
      gap: var(--space-unit);
      padding: calc(var(--space-unit) / 2);
    }

    .color-row {
      display: flex;
      align-items: center;
      gap: calc(var(--space-unit) / 2);
    }

    .color-label {
      flex: 1;
      font-size: 0.85em;
      color: var(--text-a);
      font-family: var(--font-mono, monospace);
    }

    .color-input {
      width: 32px;
      height: 24px;
      border: 1px solid var(--border-a);
      border-radius: var(--radius);
      cursor: pointer;
      background: none;
      padding: 0;
      outline: none;
      transition: var(--transition);
    }

    .color-input:hover {
      border-color: var(--primary);
    }

    .color-input:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 2px rgba(0, 122, 204, 0.2);
    }

    .color-value {
      font-family: var(--font-mono, monospace);
      font-size: 0.75em;
      color: var(--text-b);
      min-width: 70px;
    }
  `;

  connectedCallback(): void {
    super.connectedCallback();
    this.initializeGlobalColors();
  }

  private initializeGlobalColors(): void {
    // Initialize global color system if it doesn't exist
    if (!window.globalColors) {
      window.globalColors = {
        primary: this.primaryColor,
        secondary: this.secondaryColor,
        listeners: new Set(),

        setPrimary: (color: string) => {
          window.globalColors.primary = color;
          window.globalColors.listeners.forEach((listener: Function) => {
            listener({ type: "primary", color });
          });
        },

        setSecondary: (color: string) => {
          window.globalColors.secondary = color;
          window.globalColors.listeners.forEach((listener: Function) => {
            listener({ type: "secondary", color });
          });
        },

        addListener: (listener: Function) => {
          window.globalColors.listeners.add(listener);
        },

        removeListener: (listener: Function) => {
          window.globalColors.listeners.delete(listener);
        },
      };
    }

    // Sync local state with global state
    this.primaryColor = window.globalColors.primary;
    this.secondaryColor = window.globalColors.secondary;
  }

  private handlePrimaryColorChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const color = input.value;

    this.primaryColor = color;

    if (window.globalColors) {
      window.globalColors.setPrimary(color);
    }

    // Notify paper manager to potentially update active tool
    this.notifyColorChange();
  }

  private handleSecondaryColorChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const color = input.value;

    this.secondaryColor = color;

    if (window.globalColors) {
      window.globalColors.setSecondary(color);
    }

    // Notify paper manager to potentially update active tool
    this.notifyColorChange();
  }

  private notifyColorChange(): void {
    // Debounce rapid changes so tools are not spammed.
    if (this.colorChangeTimeout) {
      clearTimeout(this.colorChangeTimeout);
    }

    this.colorChangeTimeout = window.setTimeout(() => {
      const tool = window.toolSystem?.getActiveTool();
      if (tool && typeof tool.onColorChange === "function") {
        tool.onColorChange({
          primary: this.primaryColor,
          secondary: this.secondaryColor,
        });
      }
      // Components like the outline panel may wish to refresh; this keeps them
      // in sync without recompiling the active tool.
      window.paperManager?.notifyProjectChanged?.();
    }, 100);
  }

  private colorChangeTimeout: number | undefined;

  disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this.colorChangeTimeout) {
      clearTimeout(this.colorChangeTimeout);
    }
  }

  render() {
    return html`
      <generic-panel>
        <div slot="header" class="header-content">
          <span class="header-title">Colors</span>
        </div>

        <div class="color-controls">
          <div class="color-row">
            <span class="color-label">Primary</span>
            <input
              type="color"
              class="color-input"
              .value=${this.primaryColor}
              @input=${this.handlePrimaryColorChange}
              title="Primary Color"
            />
            <span class="color-value">${this.primaryColor}</span>
          </div>

          <div class="color-row">
            <span class="color-label">Secondary</span>
            <input
              type="color"
              class="color-input"
              .value=${this.secondaryColor}
              @input=${this.handleSecondaryColorChange}
              title="Secondary Color"
            />
            <span class="color-value">${this.secondaryColor}</span>
          </div>
        </div>
      </generic-panel>
    `;
  }
}

customElements.define("color-panel", ColorPanel);
