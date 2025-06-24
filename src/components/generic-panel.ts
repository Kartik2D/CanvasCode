import { LitElement, html, css } from "lit";

export class GenericPanel extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--bg-a);
      border-radius: var(--radius);
      overflow: hidden;
    }

    .header {
      flex-shrink: 0;
      padding: calc(var(--space-unit) / 2) var(--space-unit);
      background: var(--header-bg);
      min-height: 28px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      /* Prevent text selection on mobile */
      user-select: none;
      -webkit-user-select: none;
      -webkit-touch-callout: none;
    }

    .content {
      flex-grow: 1;
      overflow-y: auto;
      padding: var(--space-unit);
    }

    /* Header layout styles for slotted content */
    ::slotted(.header-content) {
      display: flex;
      align-items: center;
      width: 100%;
      gap: calc(var(--space-unit) / 2);
      justify-content: space-between;
    }

    ::slotted(.header-title) {
      font-weight: 600;
      color: var(--text-a);
    }

    ::slotted(.header-spacer) {
      flex-grow: 1;
    }

    ::slotted(.header-actions) {
      display: flex;
      gap: calc(var(--space-unit) / 2);
      align-items: center;
      margin-left: auto;
    }

    /* Support for simple text headers */
    .header:not(:has(slot[name="header"] *)) {
      font-weight: 600;
    }
  `;

  render() {
    return html`
      <div class="header">
        <slot name="header"></slot>
      </div>
      <div class="content">
        <slot></slot>
      </div>
    `;
  }
}

customElements.define("generic-panel", GenericPanel);
