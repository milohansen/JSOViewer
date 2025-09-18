import { JSOViewerExtension } from "./JSOViewer";
import { CHILD_COUNT } from "./parsing";

function isSet(value: unknown): value is Set<unknown> {
  return value instanceof Set;
}

export const setExtension: JSOViewerExtension<Set<unknown>> = {
  match: isSet,
  parse: value => {
    return {
      type: "collection",
      size: value.size,

      openingBracket: "Set(",
      closingBracket: ")",
      collapsedContents: CHILD_COUNT,
      kind: "Set",
      getChildren: value => Array.from((value as Set<string | number>).entries()),
      stringify: (v: unknown) =>
        v instanceof Set
          ? `Set(${Array.from(v)
              .map(v => JSON.stringify(v))
              .join(", ")})`
          : String(v),
      overrides: {
        hideKey: true
      }
    };
  }
};
export const mapExtension: JSOViewerExtension<Map<unknown, unknown>> = {
  match: value => value instanceof Map,
  parse: value => {
    return {
      type: "collection",
      size: value.size,

      openingBracket: "Map(",
      closingBracket: ")",
      collapsedContents: CHILD_COUNT,
      kind: "Map",
      getChildren: value => Array.from((value as Map<string | number, unknown>).entries()),
      stringify: (v: unknown) =>
        v instanceof Map
          ? `Map([${Array.from(v)
              .map(([k, v]) => `[${JSON.stringify(k)}, ${JSON.stringify(v)}]`)
              .join(", ")}])`
          : String(v)
    };
  }
};

export const defaultExtensions = [
  setExtension,
  mapExtension
  // Add more extensions here as needed
];
