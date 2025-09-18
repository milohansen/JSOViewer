import { JSOChunkData } from "./JSOChunk";
import { JSOViewerExtension, ParseFunction, ParsedCollectionResult, ParsedProps, ParsedValueResult } from "./JSOViewer";
import { sortEntries } from "./helpers";

export function makeExtendedParse(extensions: JSOViewerExtension[], existingParse: ParseFunction | undefined): ParseFunction | undefined {
  const filteredExtensions = extensions.filter(ext => ext.parse);
  if (filteredExtensions.length === 0) {
    return existingParse; // No extensions with parse function
  }
  return (value: unknown) => {
    if (existingParse) {
      const existingResult = existingParse(value);
      if (existingResult) {
        return existingResult; // Return result from existing parse function if available
      }
    }
    // Iterate through extensions and return the first matching parse result
    let out: ParsedValueResult | ParsedCollectionResult | undefined;
    for (const ext of filteredExtensions) {
      if (ext.match(value)) {
        const res = ext.parse?.(value);
        if (out) {
          out = { ...out, ...res };
        } else {
          out = res;
        }
      }
    }
    if (out) {
      return out;
    }
  };
}

export type ChunkSize = number | ((size: number, kind: "array" | "object" | string) => number);

export const CHILD_COUNT = Symbol("childCount");

type ConditionalOption<T extends number | string | boolean> = T | ConditionalObject<T> ;
type ConditionalObject<T> = { collapsed: T; expanded: T };

export type JSONodeData = {
  nodeKey: string;
  key: string | number;
  // value: unknown;

  path: (string | number)[];
  hideKey?: boolean;
  stringify?: ((value: unknown) => string) | string;

  /**
   * Prevent this node from being shown.
   * Used in the JSON viewer to hide objects that cannot be stringified.
   */
  hide?: boolean; // If true, will hide this node

  sizing: NodeSizing;
} & (
  | {
      type: "value";
    }
  | {
      type: "collection";
      kind: "array" | "object" | string; // Type of collection, can be "array", "object", or custom
      typeLabel?: string; // Optional label for the type of collection

      openingBracket: string | { collapsed: string; expanded: string };
      closingBracket: string | { collapsed: string; expanded: string };

      collapsedContents?: string | typeof CHILD_COUNT; // If provided, will show this instead of children when collapsed
      showSize?: ConditionalOption<boolean>;

      getChildren: (value: unknown) => [key: string | number, value: unknown][];

      overrides?: Partial<ParsedProps>;
    }
);

export type NodeSizing = {
  size: number;
  chunkSize: number; // Size of each chunk, if applicable
  chunkCount: number;
  contentsChunked: boolean;
};

export type MakeNodeOptions = {
  chunkSize?: number | ((size: number, kind: "array" | "object" | string) => number);
  arrayChunkSize?: number | ((size: number, kind: "array", value: unknown) => number);
  objectChunkSize?: number | ((size: number, kind: "object", value: unknown) => number);

  nestChunks?: boolean; // If true, will nest chunks in the tree

  extendedParse?: ParseFunction;
  defaultProps?: Partial<ParsedProps>; // Default properties to apply to all nodes

  defaultExpanded?: boolean | ((sizing: NodeSizing, node: JSONodeData) => boolean);
};

export type Entry = [key: string | number, value: unknown];

export type Unchunked = {
  NOT_CHUNKED: true;
  children: Entry[];
};

export function makeNodeChunks(
  children: Entry[],
  chunkSize: number,
  parentNode: JSONodeData & { type: "collection" },
  options?: {
    nest?: boolean; // If true, will nest chunks in the tree
    sort?: boolean; // If true, will sort the entries before chunking
  },
  offsetMultiplier = 1
): JSOChunkData[] | Unchunked {
  // console.log("makeNodeChunks", children.length, chunkSize, parentNode.nodeKey, options);
  let copiedChildren = children;
  if (children.length > chunkSize) {
    copiedChildren = [...children]; // Create a copy of children to avoid mutation
    if (options?.sort) {
      copiedChildren.sort(sortEntries); // Sort the entries if requested
    }

    const out: JSOChunkData[] = [];
    for (let offset = 0; offset < copiedChildren.length; offset += chunkSize) {
      const chunk = copiedChildren.slice(offset, offset + chunkSize);
      out.push(makeNodeChunk(chunk, parentNode, offset * offsetMultiplier));
    }

    if (options?.nest && out.length > chunkSize) {
      const nestedOut: JSOChunkData[] = [];
      for (let offset = 0; offset < out.length; offset += chunkSize) {
        const chunk = out.slice(offset, offset + chunkSize);
        nestedOut.push(makeNestedNodeChunk(chunk, parentNode));
      }

      // console.log("Nested chunks created:", nestedOut);
      return nestedOut;
    }
    return out;
  } else {
    if (options?.sort) {
      copiedChildren = [...children]; // Create a copy of children to avoid mutation
      copiedChildren.sort(sortEntries); // Sort the entries if requested
    }
    return {
      NOT_CHUNKED: true,
      children: copiedChildren
    };
  }
}

export function isUnchunked(value: unknown): value is Unchunked {
  return (
    typeof value === "object" &&
    value !== null &&
    "NOT_CHUNKED" in value &&
    (value as Unchunked).NOT_CHUNKED === true &&
    Array.isArray((value as Unchunked).children)
  );
}

function makeNodeChunk(chunk: Entry[], parentNode: JSONodeData & { type: "collection" }, offset: number): JSOChunkData {
  // const chunkKey = `${parentNode.openingBracket}${chunk.map(node => node.key).join(", ")}${parentNode.closingBracket}`;
  const chunkKey = `|chunk|${parentNode.openingBracket}${offset}-${offset + chunk.length - 1}${parentNode.closingBracket}`;

  const { key: __, ...rest } = parentNode as JSONodeData & { type: "collection" } & { isChunk: true }; // Exclude value from parentNode to avoid circular reference

  return {
    ...rest,
    sourceKey: parentNode.nodeKey,
    nodeKey: `${parentNode.nodeKey}${chunkKey}`,
    children: chunk,
    start: offset,
    end: offset + chunk.length - 1
  };
}

function makeNestedNodeChunk(chunk: JSOChunkData[], parentNode: JSONodeData & { type: "collection" }): JSOChunkData {
  const start = chunk[0].start;
  const end = chunk[chunk.length - 1].end;
  const chunkKey = `|chunk|${parentNode.openingBracket}${start}-${end}${parentNode.closingBracket}`;

  const { key: __, ...rest } = parentNode as JSONodeData & { type: "collection" } & { isChunk: true }; // Exclude value from parentNode to avoid circular reference

  return {
    ...rest,
    sourceKey: parentNode.nodeKey,
    nodeKey: `${parentNode.nodeKey}${chunkKey}`,
    isNested: true,
    children: chunk,
    start,
    end
  };
}

export function getCollectionNodeSizing(
  kind: "array" | "object" | string,
  size: number,
  chunkSizeOption: ChunkSize
): NodeSizing {
  const chunkSize = typeof chunkSizeOption === "function" ? chunkSizeOption(size, kind) : chunkSizeOption;
  // console.log("getCollectionNodeSizing", node.nodeKey, size, chunkSize, kind, node.value);
  if (size <= chunkSize) {
    return {
      size,
      chunkSize,
      chunkCount: 0,
      contentsChunked: false
    };
  } else {
    const chunkCount = Math.ceil(size / chunkSize);
    return {
      size,
      chunkSize,
      chunkCount,
      contentsChunked: true
    };
  }
}

function isConditionalObject<T>(obj: unknown): obj is ConditionalObject<T> {
  return typeof obj === "object" && obj !== null && "collapsed" in obj && "expanded" in obj;
}

export function getConditionalOption<T extends number | string | boolean>(option: ConditionalOption<T>, expanded: boolean): T {
  if (isConditionalObject(option)) {
    return expanded ? option.expanded : option.collapsed;
  }
  return option;
}

export function getOptionalConditionalOption<T extends number | string | boolean>(
  option: ConditionalOption<T> | undefined,
  expanded: boolean
): T | undefined {
  if (isConditionalObject(option)) {
    return expanded ? option.expanded : option.collapsed;
  }
  return option;
}
