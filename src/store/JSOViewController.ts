import { isEqual } from "es-toolkit/compat";

import { JSOViewerExtension } from "../JSOViewer";
import { CHILD_COUNT, ChunkSize, JSONodeData, MakeNodeOptions, getCollectionNodeSizing, makeExtendedParse } from "../parsing";
import { ControlledNodeState, NodeStateStore } from "./NodeStateStore";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyExtension = JSOViewerExtension<any>;
export class JSOViewController {
  #nodeStateStore = new NodeStateStore();
  #visited = new WeakMap<object, JSONodeData>();

  #extensions: AnyExtension[];
  #options: MakeNodeOptions;
  #internalOptions: MakeNodeOptions;

  constructor(extensions: AnyExtension[] = [], options: MakeNodeOptions = {}) {
    // console.time("JSOViewController constructor");
    this.#extensions = extensions;
    this.#options = options;
    this.#internalOptions = {
      ...options,
      chunkSize: options.chunkSize ?? defaultChunkSize,
      extendedParse: makeExtendedParse(extensions, options.extendedParse),
    };

    // console.timeEnd("JSOViewController constructor");
  }

  set extensions(extensions: AnyExtension[]) {
    if (isEqual(this.#extensions, extensions)) {
      return;
    }
    this.#extensions = extensions;
    this.#internalOptions = {
      ...this.#internalOptions,
      extendedParse: makeExtendedParse(this.#extensions, this.#options.extendedParse),
    };
    this.#visited = new WeakMap<object, JSONodeData>();
  }
  set options(options: MakeNodeOptions) {
    if (isEqual(this.#options, options)) {
      return;
    }
    this.#options = options;
    this.#internalOptions = {
      ...this.#internalOptions,
      ...options,
      chunkSize: options.chunkSize ?? defaultChunkSize,
      extendedParse: makeExtendedParse(this.#extensions, options.extendedParse),
    };
    this.#visited = new WeakMap<object, JSONodeData>();
  }

  makeNodeStateSubscription: (key: string, type?: "value" | "collection") => (listener: () => void) => () => void = this.#nodeStateStore.makeSubscription.bind(this.#nodeStateStore);
  makeNodeStateSnapshot: (key: string) => () => ControlledNodeState = this.#nodeStateStore.makeSnapshot.bind(this.#nodeStateStore);

  setHovered: (nodeKey: string) => void = this.#nodeStateStore.setHovered.bind(this.#nodeStateStore);
  setHoveredCollection: (nodeKey: string) => void = this.#nodeStateStore.setHoveredCollection.bind(this.#nodeStateStore);

  setExpanded: (nodeKey: string, expanded: React.SetStateAction<boolean>, overwrite?: boolean) => void = this.#nodeStateStore.setExpanded.bind(this.#nodeStateStore);
  toggleExpanded = (nodeKey: string) => {
    this.#nodeStateStore.setExpanded(nodeKey, (prev) => !prev);
  };
  setSelected: (nodeKey: string, selected: React.SetStateAction<boolean>) => void = this.#nodeStateStore.setSelected.bind(this.#nodeStateStore);
  toggleSelected = (nodeKey: string) => {
    this.#nodeStateStore.setSelected(nodeKey, (prev) => !prev);
  };

  makeNode(path: (string | number)[], value: unknown): JSONodeData {
    const key = path[path.length - 1];
    const nodePath = path;
    const nodeKey = path.join(".");

    if (typeof value === "object" && value !== null) {
      const existingNode = this.#visited.get(value);
      if (existingNode) {
        const node = { ...existingNode };
        node.nodeKey = nodeKey; // Update the nodeKey to the new path
        node.path = nodePath; // Update the path to the new path
        node.key = key; // Update the key to the new key
        this.#prepareCreatedNode(node, value);
        // console.log("Reusing existing node for", nodeKey, "from", existingNode.nodeKey, existingNode);
        return node;
      }
    }

    let node: JSONodeData = {
      nodeKey,
      hideKey: nodePath.length === 0, // Hide the key for the root node
      ...this.#internalOptions.defaultProps, // Apply default properties if provided
      type: "value",
      key,
      path: nodePath,
      sizing: {
        size: 0,
        chunkSize: Number.POSITIVE_INFINITY,
        chunkCount: 0,
        contentsChunked: false,
      },
    };

    let { arrayChunkSize = this.#internalOptions.chunkSize ?? 100, objectChunkSize = this.#internalOptions.chunkSize ?? Number.POSITIVE_INFINITY } = this.#internalOptions;

    if (nodePath.length === 0) {
      arrayChunkSize = Number.POSITIVE_INFINITY;
      objectChunkSize = Number.POSITIVE_INFINITY; // Disable chunking for top-level nodes
    }

    if (typeof this.#internalOptions.extendedParse === "function") {
      const parsed = this.#internalOptions.extendedParse(value);
      if (parsed) {
        if (parsed.type === "value") {
          node = { ...node, ...parsed };
        } else if (parsed.type === "collection") {
          const newNode = {
            ...node,
            ...parsed,
            overrides: { ...this.#internalOptions.defaultProps, ...parsed.overrides },
            sizing: getCollectionNodeSizing(parsed.kind, parsed.size, parsed.chunkSize ?? this.#internalOptions.chunkSize ?? 100),
          } as JSONodeData & {
            type: "collection";
          };
          node = newNode;
        }
        this.#prepareCreatedNode(node, value);
        // console.log("Parsed node", node.nodeKey, "from extended parse", parsed);
        return node;
      }
    }

    if (typeof value !== "object" || value === null || value instanceof Date) {
      node.type = "value"; // Set type to value for non-object types
      if (typeof value === "function") {
        node.stringify = String(value);
      } else if (typeof value === "symbol") {
        node.stringify = value.toString();
      } else if (typeof value === "undefined") {
        node.stringify = "undefined";
      } else if (typeof value === "bigint") {
        node.stringify = value.toString() + "n";
      }

      this.#prepareCreatedNode(node, value);
      return node;
    }

    if (Array.isArray(value)) {
      node = {
        ...node,
        type: "collection",
        openingBracket: { collapsed: "Array(", expanded: "[" },
        closingBracket: { collapsed: ")", expanded: "]" },
        collapsedContents: CHILD_COUNT,
        showSize: { collapsed: false, expanded: true },
        kind: "array",
        getChildren: (value) => (value as unknown[]).map((item, index) => [index, item]),
        sizing: getCollectionNodeSizing("array", value.length, arrayChunkSize as ChunkSize),
      };
    } else {
      const constructor = Object.getPrototypeOf(value)?.constructor;
      const nonObjectConstructor = constructor && constructor !== Object && constructor !== Array ? constructor.name : undefined;
      node = {
        ...node,
        type: "collection",
        openingBracket: "{",
        closingBracket: "}",
        kind: nonObjectConstructor ? "class" : "object",
        typeLabel: nonObjectConstructor,
        getChildren: (value) => Object.entries(value as Record<string, unknown>),
        sizing: getCollectionNodeSizing("object", Object.keys(value).length, objectChunkSize as ChunkSize),
      };
    }

    this.#prepareCreatedNode(node, value);
    // console.log("makeNode", "node", node);
    return node;
  }

  #prepareCreatedNode(node: JSONodeData, value: unknown): void {
    const defaultExpanded = this.#internalOptions.defaultExpanded;
    const isExpanded = typeof defaultExpanded === "function" ? defaultExpanded(node.sizing, node) : defaultExpanded;
    if (isExpanded) {
      this.#nodeStateStore.setExpanded(node.nodeKey, true, false);
    }
    if (typeof value === "object" && value !== null) {
      this.#visited.set(value, node);
    }
  }
}

export function defaultChunkSize(size: number, kind: "array" | "object" | string): number {
  // return 3;
  // Custom logic to determine chunk size based on the value type and size
  if (kind === "array") {
    return defaultArrayChunkSize;
  } else if (kind === "object") {
    return defaultObjectChunkSize(size);
  }
  return 100; // Default case
}
export const defaultArrayChunkSize = 100;

export function defaultObjectChunkSize(size: number): number {
  if (size < 100) {
    return 50;
  } else {
    return Math.min(Math.max(50, Math.floor(size / 5)), 100);
  }
}

// function stringifyFunction(this: JSONodeData) {
//   return String(this.value);
// }
// function stringifySymbol(this: JSONodeData) {
//   return (this.value as symbol).toString();
// }
// function stringifyUndefined(this: JSONodeData) {
//   return "undefined";
// }
// function stringifyBigInt(this: JSONodeData) {
//   return (this.value as bigint).toString() + "n"; // Append 'n'
// }
