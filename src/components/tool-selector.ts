import { LitElement, html, css } from "lit";
import { property } from "lit/decorators.js";
import { TOOL_TEMPLATES } from "../tool-templates.js";
import type { PaperManagerEvent } from "../types.js";
import "./generic-panel.js";

export class ToolSelector extends LitElement {
  static styles = css`
    .tool-button {
      display: block;
      width: 100%;
      padding: var(--space-unit);
      border: 1px solid var(--border-a);
      border-radius: var(--radius);
      background: var(--bg-a);
      cursor: pointer;
      transition: var(--transition);
      text-align: left;
      margin-bottom: var(--space-unit);
    }

    .tool-button:hover {
      border-color: var(--primary);
      background: var(--bg-b);
    }

    .tool-button.active {
      border-color: var(--primary);
      background: var(--primary);
      color: var(--bg-a);
    }

    .tool-name {
      font-weight: 600;
      color: var(--text-a);
    }

    .tool-description {
      font-size: 0.9em;
      color: var(--text-b);
    }

    .tool-button.active .tool-name,
    .tool-button.active .tool-description {
      color: var(--bg-a);
    }
  `;

  @property({ type: String })
  selectedTool: string = "pencil";

  @property({ type: String })
  error: string = "";

  connectedCallback(): void {
    super.connectedCallback();
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    if (window.paperManager) {
      window.paperManager.addEventListener(
        "toolChanged",
        this.handleToolChanged.bind(this)
      );
      window.paperManager.addEventListener(
        "error",
        this.handleError.bind(this)
      );
      const currentTool = window.paperManager.getCurrentToolName();
      if (currentTool) {
        this.selectedTool = currentTool;
        this.requestUpdate();
      }
    } else {
      setTimeout(() => this.setupEventListeners(), 100);
    }
  }

  private handleToolChanged(event: PaperManagerEvent["toolChanged"]): void {
    this.selectedTool = event.toolName;
    this.error = "";
  }

  private handleError(event: PaperManagerEvent["error"]): void {
    this.error = event.message;
  }

  private selectTool(toolName: string): void {
    if (window.paperManager) {
      window.paperManager.loadTool(toolName);
    }
  }

  render() {
    return html`
      <generic-panel>
        <div slot="header" class="header-content">
          <span class="header-title">Tools</span>
        </div>
        ${Object.entries(TOOL_TEMPLATES).map(
          ([key, tool]) => html`
            <button
              class="tool-button ${this.selectedTool === key ? "active" : ""}"
              @click=${() => this.selectTool(key)}
            >
              <div class="tool-name">${tool.name}</div>
              <div class="tool-description">${tool.description}</div>
            </button>
          `
        )}
      </generic-panel>
    `;
  }
}

customElements.define("tool-selector", ToolSelector);
