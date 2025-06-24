import { LitElement, html, css } from "lit";
import type { TemplateResult } from "lit";
import { state } from "lit/decorators.js";
import "./generic-panel.js";
import "./panel-button.js";

interface OutlineItem {
  label: string;
  children: OutlineItem[];
  id: string; // Add unique identifier for selection
  paperItem?: any; // Reference to the actual Paper.js item
  isExpanded?: boolean; // Track expanded state
}

export class OutlinePanel extends LitElement {
  /** Hierarchical representation of the current project */
  @state()
  private outline: OutlineItem[] = [];

  /** Currently selected item ID */
  @state()
  private selectedItemId: string | null = null;

  /** Track expanded state of items */
  @state()
  private expandedItems: Set<string> = new Set();

  /** Track drag and drop state */
  @state()
  private draggedItemId: string | null = null;

  @state()
  private dropTargetId: string | null = null;

  @state()
  private dropPosition: "before" | "after" | "inside" | null = null;

  /** Disposers for event listeners */
  private disposers: Array<() => void> = [];

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .outline-item {
      display: flex;
      align-items: center;
      padding: 4px 8px;
      font-family: var(--font-mono, monospace);
      font-size: 0.85em;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      cursor: pointer;
      border-radius: var(--radius);
      margin: 1px 0;
      transition: var(--transition);
      user-select: none;
      position: relative;
    }

    .outline-item[draggable="true"] {
      cursor: grab;
    }

    .outline-item[draggable="true"]:active {
      cursor: grabbing;
    }

    .outline-item:hover {
      background-color: var(--bg-b);
      color: var(--text-a);
    }

    .outline-item.selected {
      background-color: var(--primary);
      color: var(--bg-a);
    }

    .outline-item.selected:hover {
      background-color: var(--primary-hover);
    }

    .outline-item.dragging {
      opacity: 0.5;
      transform: scale(0.95);
    }

    .outline-item.drop-target {
      background-color: var(--primary-light, rgba(59, 130, 246, 0.1));
      border: 2px dashed var(--primary);
    }

    .outline-item.drop-target.drop-before::before {
      content: "↳ Insert above";
      position: absolute;
      top: -16px;
      left: 8px;
      right: 0;
      height: 14px;
      background-color: var(--primary);
      color: white;
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 3px;
      white-space: nowrap;
      z-index: 1000;
    }

    .outline-item.drop-target.drop-after::after {
      content: "↳ Insert below";
      position: absolute;
      bottom: -16px;
      left: 8px;
      right: 0;
      height: 14px;
      background-color: var(--primary);
      color: white;
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 3px;
      white-space: nowrap;
      z-index: 1000;
    }

    .outline-item.drop-target.drop-inside {
      background-color: var(--primary-light, rgba(59, 130, 246, 0.2));
      border: 2px dashed var(--primary);
      position: relative;
    }

    .outline-item.drop-target.drop-inside::before {
      content: "↳ Add to container";
      position: absolute;
      top: -16px;
      left: 8px;
      right: 0;
      height: 14px;
      background-color: var(--primary);
      color: white;
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 3px;
      white-space: nowrap;
      z-index: 1000;
    }

    .expand-icon {
      width: 12px;
      height: 12px;
      margin-right: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      color: var(--text-b);
      transition: var(--transition);
      flex-shrink: 0;
    }

    .expand-icon.expanded {
      transform: rotate(90deg);
    }

    .expand-icon.no-children {
      visibility: hidden;
    }

    .item-label {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .children-container {
      overflow: hidden;
      transition: var(--transition);
    }

    .children-container.collapsed {
      display: none;
    }

    .drag-handle {
      width: 16px;
      height: 16px;
      margin-right: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      color: var(--text-c);
      cursor: grab;
      opacity: 0;
      transition: var(--transition);
      flex-shrink: 0;
    }

    .outline-item:hover .drag-handle {
      opacity: 1;
    }

    .drag-handle:active {
      cursor: grabbing;
    }
  `;

  connectedCallback(): void {
    super.connectedCallback();
    this.updateOutline();
    this.setupPaperManagerListeners();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.disposers.forEach((dispose) => dispose());
    this.disposers = [];
  }

  private setupPaperManagerListeners(): void {
    if (!window.paperManager) {
      setTimeout(() => this.setupPaperManagerListeners(), 100);
      return;
    }

    const onToolChanged = () => this.updateOutline();
    const onProjectChanged = () => this.updateOutline();

    window.paperManager.addEventListener("toolChanged", onToolChanged);
    window.paperManager.addEventListener("projectChanged", onProjectChanged);

    this.disposers.push(() => {
      window.paperManager.removeEventListener("toolChanged", onToolChanged);
      window.paperManager.removeEventListener(
        "projectChanged",
        onProjectChanged
      );
    });
  }

  private updateOutline(): void {
    if (!window.project) {
      this.outline = [];
      return;
    }

    const newOutline: OutlineItem[] = window.project.layers.map(
      (layer: any, index: number) =>
        this.buildOutline(layer, `Layer ${index}`, `layer-${index}`)
    );

    // Only trigger re-render if structure actually changed to avoid needless work
    if (JSON.stringify(this.outline) !== JSON.stringify(newOutline)) {
      this.outline = newOutline;
    }
  }

  private buildOutline(
    item: any,
    fallbackName: string,
    idPrefix: string
  ): OutlineItem {
    const label = this.getLabel(item, fallbackName);
    const id = `${idPrefix}-${
      item.id || Math.random().toString(36).substr(2, 9)
    }`;
    const children: OutlineItem[] = (item.children || []).map(
      (child: any, idx: number) =>
        this.buildOutline(
          child,
          `${child.className || "Item"} ${idx}`,
          `${id}-child-${idx}`
        )
    );

    // Only expand if explicitly expanded, don't auto-expand layers
    const isExpanded = this.expandedItems.has(id);

    return { label, children, id, paperItem: item, isExpanded };
  }

  private getLabel(item: any, fallback: string): string {
    // Prefer explicit name, otherwise type, then fallback
    if (item.name) return item.name;
    if (item.className) return item.className;
    return fallback;
  }

  private handleItemClick(item: OutlineItem, event: Event): void {
    event.stopPropagation();

    // Update selection state
    this.selectedItemId = this.selectedItemId === item.id ? null : item.id;

    // If there's a Paper.js item, select it in the canvas
    if (item.paperItem && window.project) {
      // Deselect all items first
      window.project.deselectAll();

      // Select the clicked item
      if (this.selectedItemId === item.id) {
        item.paperItem.selected = true;

        // Optionally bring the item into view or focus
        if (window.view && item.paperItem.bounds) {
          // You could add view centering logic here if desired
          window.view.draw();
        }
      }

      // Redraw the view to show selection
      if (window.view) {
        window.view.draw();
      }
    }

    // Dispatch a custom event for other components to listen to
    this.dispatchEvent(
      new CustomEvent("item-selected", {
        detail: { item, selected: this.selectedItemId === item.id },
        bubbles: true,
      })
    );
  }

  private handleExpandClick(item: OutlineItem, event: Event): void {
    event.stopPropagation();

    if (this.expandedItems.has(item.id)) {
      this.expandedItems.delete(item.id);
    } else {
      this.expandedItems.add(item.id);
    }

    // Trigger re-render
    this.requestUpdate();
  }

  private handleAddLayer(): void {
    if (!window.project) return;

    // Create a new layer
    const newLayer = new window.paper.Layer();
    newLayer.name = `Layer ${window.project.layers.length}`;

    // Activate the new layer
    newLayer.activate();

    // Auto-expand the new layer
    const layerId = `layer-${window.project.layers.length - 1}-${
      newLayer.id || Math.random().toString(36).substr(2, 9)
    }`;
    this.expandedItems.add(layerId);

    // Update the outline
    this.updateOutline();

    // Notify that the project has changed
    if (window.paperManager) {
      window.paperManager.notifyProjectChanged?.();
    }

    // Redraw the view
    if (window.view) {
      window.view.draw();
    }

    // Dispatch custom event
    this.dispatchEvent(
      new CustomEvent("layer-added", {
        detail: { layer: newLayer },
        bubbles: true,
      })
    );
  }

  private handleDragStart(item: OutlineItem, event: DragEvent): void {
    if (!event.dataTransfer) return;

    this.draggedItemId = item.id;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", item.id);

    // Set drag image to be the item text
    const dragImage = document.createElement("div");
    dragImage.textContent = item.label;
    dragImage.style.position = "absolute";
    dragImage.style.top = "-1000px";
    dragImage.style.padding = "4px 8px";
    dragImage.style.backgroundColor = "var(--bg-a)";
    dragImage.style.border = "1px solid var(--border)";
    dragImage.style.borderRadius = "var(--radius)";
    dragImage.style.fontSize = "0.85em";
    dragImage.style.fontFamily = "var(--font-mono, monospace)";
    document.body.appendChild(dragImage);
    event.dataTransfer.setDragImage(dragImage, 0, 0);

    // Clean up drag image after a short delay
    setTimeout(() => {
      document.body.removeChild(dragImage);
    }, 0);

    this.requestUpdate();
  }

  private handleDragEnd(_event: DragEvent): void {
    this.draggedItemId = null;
    this.dropTargetId = null;
    this.dropPosition = null;
    this.requestUpdate();
  }

  private handleDragOver(item: OutlineItem, event: DragEvent): void {
    if (!this.draggedItemId || this.draggedItemId === item.id) return;

    event.preventDefault();
    event.dataTransfer!.dropEffect = "move";

    // Check if we're trying to drag an item into its own descendant (prevent infinite recursion)
    if (this.isDescendant(this.draggedItemId, item.id)) {
      return;
    }

    const draggedItem = this.findItemById(this.draggedItemId);
    if (!draggedItem) return;

    // Calculate drop position based on mouse position relative to the item
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const y = event.clientY - rect.top;
    const height = rect.height;

    let position: "before" | "after" | "inside";

    // Special handling for layers
    const isDraggedLayer = draggedItem.paperItem?.className === "Layer";
    const isTargetLayer = item.paperItem?.className === "Layer";

    if (isDraggedLayer) {
      // Layers can only be reordered with other layers, not moved inside
      if (isTargetLayer) {
        position = y < height * 0.5 ? "before" : "after";
      } else {
        // Can't drop layer on non-layer items
        return;
      }
    } else {
      // Regular items can be dropped inside layers/groups or reordered
      const canHaveChildren =
        item.paperItem?.className === "Layer" ||
        item.paperItem?.className === "Group" ||
        item.children.length > 0;

      if (canHaveChildren && y > height * 0.2 && y < height * 0.8) {
        position = "inside";
      } else if (y < height * 0.5) {
        position = "before";
      } else {
        position = "after";
      }
    }

    this.dropTargetId = item.id;
    this.dropPosition = position;
    this.requestUpdate();
  }

  private isDescendant(ancestorId: string, itemId: string): boolean {
    const item = this.findItemById(itemId);
    if (!item) return false;

    const checkChildren = (children: OutlineItem[]): boolean => {
      for (const child of children) {
        if (child.id === ancestorId) return true;
        if (checkChildren(child.children)) return true;
      }
      return false;
    };

    return checkChildren(item.children);
  }

  private handleDragLeave(event: DragEvent): void {
    // Only clear if we're leaving the entire item, not just moving between child elements
    const relatedTarget = event.relatedTarget as HTMLElement;
    const currentTarget = event.currentTarget as HTMLElement;

    if (!relatedTarget || !currentTarget.contains(relatedTarget)) {
      this.dropTargetId = null;
      this.dropPosition = null;
      this.requestUpdate();
    }
  }

  private handleDrop(item: OutlineItem, event: DragEvent): void {
    event.preventDefault();

    if (
      !this.draggedItemId ||
      !this.dropPosition ||
      this.draggedItemId === item.id
    ) {
      this.handleDragEnd(event);
      return;
    }

    const draggedItem = this.findItemById(this.draggedItemId);
    if (!draggedItem || !draggedItem.paperItem) {
      this.handleDragEnd(event);
      return;
    }

    // Perform the actual rearrangement in Paper.js
    this.rearrangeItems(draggedItem, item, this.dropPosition);

    // Clear drag state
    this.handleDragEnd(event);

    // Update the outline
    this.updateOutline();

    // Notify that the project has changed
    if (window.paperManager) {
      window.paperManager.notifyProjectChanged?.();
    }

    // Redraw the view
    if (window.view) {
      window.view.draw();
    }

    // Dispatch custom event
    this.dispatchEvent(
      new CustomEvent("item-rearranged", {
        detail: {
          draggedItem: draggedItem,
          targetItem: item,
          position: this.dropPosition,
        },
        bubbles: true,
      })
    );
  }

  private findItemById(id: string): OutlineItem | null {
    const search = (items: OutlineItem[]): OutlineItem | null => {
      for (const item of items) {
        if (item.id === id) return item;
        const found = search(item.children);
        if (found) return found;
      }
      return null;
    };
    return search(this.outline);
  }

  private rearrangeItems(
    draggedItem: OutlineItem,
    targetItem: OutlineItem,
    position: "before" | "after" | "inside"
  ): void {
    if (!draggedItem.paperItem || !targetItem.paperItem || !window.project)
      return;

    const draggedPaperItem = draggedItem.paperItem;
    const targetPaperItem = targetItem.paperItem;

    // Handle layer reordering specially
    if (
      draggedPaperItem.className === "Layer" &&
      targetPaperItem.className === "Layer"
    ) {
      // Find the indices of both layers
      const draggedIndex = window.project.layers.indexOf(draggedPaperItem);
      const targetIndex = window.project.layers.indexOf(targetPaperItem);

      if (draggedIndex !== -1 && targetIndex !== -1) {
        // Remove the dragged layer
        window.project.layers.splice(draggedIndex, 1);

        // Calculate new target index after removal
        let newTargetIndex = targetIndex;
        if (draggedIndex < targetIndex) {
          newTargetIndex--;
        }

        // Insert at new position
        if (position === "before") {
          window.project.layers.splice(newTargetIndex, 0, draggedPaperItem);
        } else {
          window.project.layers.splice(newTargetIndex + 1, 0, draggedPaperItem);
        }
      }
      return;
    }

    // Handle regular item rearrangement
    // Remove the dragged item from its current parent
    if (draggedPaperItem.parent) {
      draggedPaperItem.remove();
    }

    switch (position) {
      case "inside":
        // Add as child of target item
        if (targetPaperItem.className === "Layer") {
          targetPaperItem.addChild(draggedPaperItem);
          // Auto-expand the layer that received the item
          this.expandedItems.add(targetItem.id);
        } else if (targetPaperItem.addChild) {
          targetPaperItem.addChild(draggedPaperItem);
          // Auto-expand the container that received the item
          this.expandedItems.add(targetItem.id);
        }
        break;

      case "before":
        // Insert before target item
        if (targetPaperItem.parent) {
          const targetIndex = targetPaperItem.index;
          targetPaperItem.parent.insertChild(targetIndex, draggedPaperItem);
        }
        break;

      case "after":
        // Insert after target item
        if (targetPaperItem.parent) {
          const targetIndex = targetPaperItem.index;
          targetPaperItem.parent.insertChild(targetIndex + 1, draggedPaperItem);
        }
        break;
    }
  }

  private renderItems(
    items: OutlineItem[],
    depth: number = 0
  ): TemplateResult[] {
    const results: TemplateResult[] = [];

    items.forEach((item) => {
      const isExpanded = this.expandedItems.has(item.id);
      const hasChildren = item.children.length > 0;
      const isDragging = this.draggedItemId === item.id;
      const isDropTarget = this.dropTargetId === item.id;

      // Allow dragging of all items, but layers can only be reordered with other layers
      const isDraggable = true;

      // Build CSS classes
      let classes = "outline-item";
      if (this.selectedItemId === item.id) classes += " selected";
      if (isDragging) classes += " dragging";
      if (isDropTarget) {
        classes += " drop-target";
        if (this.dropPosition) classes += ` drop-${this.dropPosition}`;
      }

      const itemTemplate = html`
        <div
          class="${classes}"
          style="padding-left: ${depth * 16 + 8}px"
          draggable="${isDraggable}"
          @click=${(e: Event) => this.handleItemClick(item, e)}
          @dragstart=${(e: DragEvent) =>
            isDraggable ? this.handleDragStart(item, e) : null}
          @dragend=${(e: DragEvent) => this.handleDragEnd(e)}
          @dragover=${(e: DragEvent) => this.handleDragOver(item, e)}
          @dragleave=${(e: DragEvent) => this.handleDragLeave(e)}
          @drop=${(e: DragEvent) => this.handleDrop(item, e)}
        >
          ${isDraggable ? html`<div class="drag-handle">⋮⋮</div>` : ""}
          <div
            class="expand-icon ${isExpanded ? "expanded" : ""} ${hasChildren
              ? ""
              : "no-children"}"
            @click=${(e: Event) => this.handleExpandClick(item, e)}
          >
            ${hasChildren ? "▶" : ""}
          </div>
          <div class="item-label">${item.label}</div>
        </div>
      `;

      results.push(itemTemplate);

      if (hasChildren && isExpanded) {
        const childrenTemplate = html`
          <div class="children-container">
            ${this.renderItems(item.children, depth + 1)}
          </div>
        `;
        results.push(childrenTemplate);
      }
    });

    return results;
  }

  render() {
    return html`
      <generic-panel>
        <div slot="header" class="header-content">
          <span class="header-title">Outline</span>
          <div class="header-spacer"></div>
          <div class="header-actions">
            <panel-button variant="primary" @click=${this.handleAddLayer}>
              + Layer
            </panel-button>
          </div>
        </div>
        ${this.outline.length === 0
          ? html`<div style="color: var(--text-b); padding: 8px;">
              No items
            </div>`
          : this.renderItems(this.outline)}
      </generic-panel>
    `;
  }
}

customElements.define("outline-panel", OutlinePanel);
