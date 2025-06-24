import { LitElement, html, css } from "lit";
import { property } from "lit/decorators.js";

export class PanelButton extends LitElement {
  static styles = css`
    :host {
      display: inline-block;
    }

    button {
      padding: calc(var(--space-unit) / 2) var(--space-unit);
      border: 1px solid var(--border-a);
      border-radius: var(--radius);
      background: var(--bg-a);
      color: var(--text-a);
      cursor: pointer;
      transition: var(--transition);
      font-size: 0.85em;
      font-family: var(--font-family);
      line-height: 1.2;
    }

    button:hover {
      background: var(--bg-b);
      border-color: var(--primary);
    }

    :host([variant="primary"]) button {
      background: var(--primary);
      border-color: var(--primary);
      color: var(--bg-a);
    }

    :host([variant="primary"]) button:hover {
      background: var(--primary-hover);
      border-color: var(--primary-hover);
    }
  `;

  @property({ type: String })
  variant: "default" | "primary" = "default";

  render() {
    return html`
      <button>
        <slot></slot>
      </button>
    `;
  }
}

customElements.define("panel-button", PanelButton);
