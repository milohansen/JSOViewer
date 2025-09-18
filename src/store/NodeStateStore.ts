import { SetStateAction } from "react";

import { KeyedExternalStore } from "./ExternalStore";

export type ControlledNodeState = {
  isHovered: boolean;
  isCollectionHovered: boolean;
  isExpanded: boolean | undefined;
  isSelected: boolean | undefined;
};

export class NodeStateStore extends KeyedExternalStore<ControlledNodeState> {
  #hoveredNodeKey: string | undefined;
  #hoverStore = new KeyedExternalStore<boolean>(key => this.#hoveredNodeKey === key);
  #hoveredParentNodeKey: string | undefined;
  #collectionHoverStore = new KeyedExternalStore<boolean>(key => this.#hoveredParentNodeKey === key);

  #expanded: Record<string, boolean>;
  #expandedStore = new KeyedExternalStore<boolean | undefined>(key => this.#expanded[key]);
  #selected: Record<string, boolean>;
  #selectedStore = new KeyedExternalStore<boolean | undefined>(key => this.#selected[key]);

  constructor(initialState?: {
    expanded?: Record<string, boolean> | string[];
    selected?: Record<string, boolean> | string[];
    hoveredNodeKey?: string;
    hoveredParentNodeKey?: string;
  }) {
    super(
      key => ({
        isHovered: this.#hoveredNodeKey === key,
        isCollectionHovered: this.#hoveredParentNodeKey === key,
        isExpanded: this.#expanded[key],
        isSelected: this.#selected[key]
      }),
      (prev, next) =>
        prev?.isHovered === next.isHovered &&
        prev?.isCollectionHovered === next.isCollectionHovered &&
        prev?.isExpanded === next.isExpanded &&
        prev?.isSelected === next.isSelected
    );

    this.#hoveredNodeKey = initialState?.hoveredNodeKey;
    this.#hoveredParentNodeKey = initialState?.hoveredParentNodeKey;
    this.#expanded = initialState?.expanded
      ? Array.isArray(initialState?.expanded)
        ? Object.fromEntries(initialState?.expanded.map(key => [key, true]))
        : initialState?.expanded
      : {};
    this.#selected = initialState?.selected
      ? Array.isArray(initialState?.selected)
        ? Object.fromEntries(initialState?.selected.map(key => [key, true]))
        : initialState?.selected
      : {};
  }

  override makeSubscription(key: string, type: "value" | "collection" = "value") {
    if (key in this.subscriptions) {
      return this.subscriptions[key];
    }
    // console.log("💫", "NodeStateStore", "makeSubscription", key);
    const hoverSubscription = this.#hoverStore.makeSubscription(key);
    const collectionHoverSubscription = type === "collection" ? this.#collectionHoverStore.makeSubscription(key) : undefined;
    const expandedSubscription = this.#expandedStore.makeSubscription(key);
    const selectedSubscription = this.#selectedStore.makeSubscription(key);

    const subscribe = (_listener: () => void) => {
      const listener = () => {
        _listener();
      };
      this.listeners[key] = listener;
      const hoverUnsubscribe = hoverSubscription(listener);
      const collectionHoverUnsubscribe = collectionHoverSubscription?.(listener);
      const expandedUnsubscribe = expandedSubscription(listener);
      const selectedUnsubscribe = selectedSubscription(listener);

      return () => {
        delete this.listeners[key];
        hoverUnsubscribe();
        collectionHoverUnsubscribe?.();
        expandedUnsubscribe();
        selectedUnsubscribe();
      };
    };

    this.subscriptions[key] = subscribe;

    return subscribe;
  }

  setHovered(nodeKey: string | undefined) {
    const previousKey = this.#hoveredNodeKey;
    if (previousKey === nodeKey) {
      return;
    }
    this.#hoveredNodeKey = nodeKey;
    if (typeof previousKey === "string") {
      this.#hoverStore.notify(previousKey);
    }
    if (typeof nodeKey === "string") {
      this.#hoverStore.notify(nodeKey);
    }
  }
  setHoveredCollection(nodeKey: string | undefined) {
    const previousKey = this.#hoveredParentNodeKey;
    if (previousKey === nodeKey) {
      return;
    }
    this.#hoveredParentNodeKey = nodeKey;
    if (typeof previousKey === "string") {
      this.#collectionHoverStore.notify(previousKey);
    }
    if (typeof nodeKey === "string") {
      this.#collectionHoverStore.notify(nodeKey);
    }
  }

  setExpanded(nodeKey: string, expanded: SetStateAction<boolean>, overwrite = true) {
    const prev = this.#expanded[nodeKey];
    const next = typeof expanded === "function" ? expanded(!!prev) : expanded;
    if (prev === next || (!overwrite && prev !== undefined)) {
      return;
    }
    this.#expanded[nodeKey] = next;
    this.#expandedStore.notify(nodeKey);
  }

  setSelected(nodeKey: string, selected: SetStateAction<boolean>) {
    const prev = this.#selected[nodeKey];
    const next = typeof selected === "function" ? selected(!!prev) : selected;
    if (this.#selected[nodeKey] === next) {
      return;
    }
    this.#selected[nodeKey] = next;
    this.#selectedStore.notify(nodeKey);
  }

  bulkSetExpanded(expanded: Record<string, boolean> | string[], notify = false) {
    const toNotify = new Set<string>();
    if (Array.isArray(expanded)) {
      for (const key of expanded) {
        this.#expanded[key] = true;
        toNotify.add(key);
      }
    } else {
      for (const key in expanded) {
        if (Object.prototype.hasOwnProperty.call(expanded, key)) {
          this.#expanded[key] = expanded[key];
          toNotify.add(key);
        }
      }
    }
    if (notify) {
      for (const key of toNotify) {
        this.#expandedStore.notify(key);
      }
    }
  }
  bulkSetSelected(selected: Record<string, boolean> | string[], notify = false) {
    const toNotify = new Set<string>();
    if (Array.isArray(selected)) {
      for (const key of selected) {
        this.#selected[key] = true;
        toNotify.add(key);
      }
    } else {
      for (const key in selected) {
        if (Object.prototype.hasOwnProperty.call(selected, key)) {
          this.#selected[key] = selected[key];
          toNotify.add(key);
        }
      }
    }
    if (notify) {
      for (const key of toNotify) {
        this.#selectedStore.notify(key);
      }
    }
  }
}

export function defaultChunkSize(size: number, kind: "array" | "object"): number {
  // return 3;
  // Custom logic to determine chunk size based on the value type and size
  if (kind === "array") {
    return defaultArrayChunkSize;
  } else if (kind === "object") {
    return defaultObjectChunkSize(size);
  }
  return 100; // Default case
}
export const defaultArrayChunkSize = 50;

export function defaultObjectChunkSize(size: number): number {
  if (size < 100) {
    return Math.min(Math.max(25, Math.floor(size / 2)), 100); // Example: chunk objects into 10 parts
  } else {
    return Math.min(Math.max(25, Math.floor(size / 5)), 100); // Example: chunk objects into 20 parts
  }
}
