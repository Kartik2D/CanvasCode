import { LitElement, html, css } from "lit";
import { property } from "lit/decorators.js";
import type { PaperManagerEvent } from "../types.js";
import "./generic-panel.js";
import "./panel-button.js";

export class CodeEditor extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    generic-panel {
      flex-grow: 1;
    }

    textarea {
      width: 100%;
      height: 100%;
      border: none;
      background: transparent;
      resize: none;
      font-family: var(--font-mono);
      outline: none;
      color: var(--text-a);
    }
  `;

  @property({ type: String })
  code: string = "";

  @property({ type: String })
  currentTool: string = "";

  @property({ type: String })
  error: string = "";

  @property({ type: Boolean })
  hasUnsavedChanges: boolean = false;

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

      const currentCode = window.paperManager.getCurrentCode();
      const currentTool = window.paperManager.getCurrentToolName();
      if (currentCode) {
        this.code = currentCode;
        this.currentTool = currentTool || "";
        this.requestUpdate();
      }
    } else {
      setTimeout(() => this.setupEventListeners(), 100);
    }
  }

  private handleToolChanged(event: PaperManagerEvent["toolChanged"]): void {
    this.code = event.code;
    this.currentTool = event.toolName;
    this.error = "";
    this.hasUnsavedChanges = false;
  }

  private handleError(event: PaperManagerEvent["error"]): void {
    this.error = event.message;
    this.hasUnsavedChanges = true;
  }

  private handleCodeChange(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.code = target.value;
    this.hasUnsavedChanges = true;
    this.error = "";
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      this.runCode();
    }
  }

  private runCode(): void {
    if (window.paperManager && this.code.trim()) {
      window.paperManager.updateCode(this.code);
      this.hasUnsavedChanges = false;
    }
  }

  private resetCode(): void {
    if (window.paperManager && this.currentTool) {
      window.paperManager.loadTool(this.currentTool);
    }
  }

  render() {
    return html`
      <generic-panel>
        <div slot="header" class="header-content">
          <span class="header-title"
            >${this.currentTool || "No Tool Selected"}</span
          >
          <div class="header-spacer"></div>
          <div class="header-actions">
            <panel-button @click=${this.resetCode}>Reset</panel-button>
            <panel-button variant="primary" @click=${this.runCode}
              >Apply</panel-button
            >
          </div>
        </div>

        ${this.error
          ? html`<div
              style="color: var(--error, red); padding: var(--space-unit)"
            >
              ${this.error}
            </div>`
          : null}

        <textarea
          .value=${this.code}
          @input=${this.handleCodeChange}
          @keydown=${this.handleKeyDown}
          placeholder="Select a tool to see its code."
          spellcheck="false"
        ></textarea>
      </generic-panel>
    `;
  }
}

customElements.define("code-editor", CodeEditor);
