import { findElementAncestor } from "@mantine/core";
import { IconCaretDownFilled } from "@tabler/icons-react";
import cx from "clsx";
import { isEqual } from "es-toolkit/compat";
import {
  Dispatch,
  SetStateAction,
  createElement,
  memo,
  startTransition,
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore
} from "react";

import classes from "./JSONode.module.css";
import valueClasses from "./RenderValue.module.css";

import { CopyButtonAdvanced, CopyButtonItem } from "./accessories/CopyButton";
import { JSOChunk, JSOChunkData } from "./JSOChunk";
import { JSONodeLoading } from "./JSONodeLoading";
import { ParsedProps, QuoteKeyOptions } from "./JSOViewer";
import { RenderOptions, RenderValue, RenderValueComponent } from "./RenderValue";
import { numberFormatter } from "./helpers";
import { CHILD_COUNT, JSONodeData, NodeSizing, Unchunked, getConditionalOption, isUnchunked, makeNodeChunks } from "./parsing";
import { JSOViewController } from "./store/JSOViewController";

export type JSONodeProps = {
  value: unknown;
  controller: JSOViewController;

  nodeKey: string;
  path: (string | number)[];

  rvc: RenderValueComponent | undefined;
  renderOptions?: RenderOptions;
  quoteKeys: QuoteKeyOptions;
  showCommas: boolean;

  clickAction?: "expand" | "select";
  spaceAction?: "expand" | "select";

  showLevelLine?: boolean;
  enableCopy: boolean;
  sortKeys: boolean;
  parentKey?: string;

  overrides?: Partial<ParsedProps>; // Additional properties for the child nodes, if any

  /**
   * This is used to set the level offset for the level line.
   * It's used when the node is part of a chunk.
   */
  levelOffset?: number; // Offset for the level line, if any
};

const emptyOverrides: Partial<ParsedProps> = {};

export const JSONode = memo(function JSONodeInternal({
  value,
  controller,
  nodeKey,
  path,
  rvc,
  renderOptions,
  quoteKeys,
  showCommas,
  clickAction = "expand",
  spaceAction = "expand",
  showLevelLine,
  enableCopy,
  sortKeys,
  parentKey,
  levelOffset = 0,
  overrides = emptyOverrides
}: JSONodeProps) {
  const ref = useRef<HTMLLIElement>(null);

  const [node, setNode] = useState<JSONodeData>();
  // useEffect(() => console.log("JSONode", "path", path, "node", node), [path, node]);
  // const [node, setNode] = useState<JSONodeData>(() => ({ ...controller.makeNode(path, value), ...overrides }) as JSONodeData);

  useEffect(() => {
    // console.log("JSONode useEffect", path, "overrides", overrides, "value", value);
    // const label = `makeNode ${path.join(".")}`;
    // const start = performance.now();
    startTransition(() => {
      // console.time(label);
      setNode(prev => {
        const next = { ...controller.makeNode(path, value), ...overrides } as JSONodeData;
        if (!prev || !areNodesEqual(prev, next)) {
          // console.timeEnd(label);
          // console.log("JSONode useEffect", path, "prev", prev, "next", next, performance.now() - start, "ms");
          return next;
        }
        // console.timeEnd(label);
        // console.log("JSONode useEffect", path, "prev", prev, performance.now() - start, "ms");
        // console.log("JSONode useEffect", next.nodeKey, path, "prev", prev, "next", next);
        return prev;
      });
    });
  }, [value, path, overrides, controller]);

  const nodeSizing: NodeSizing = node?.sizing ?? fallbackSizing;

  const {
    isHovered,
    isCollectionHovered,
    isExpanded: isExpandedInStore = path.length === 0,
    isSelected = false
  } = useSyncExternalStore(controller.makeNodeStateSubscription(nodeKey, node?.type), controller.makeNodeStateSnapshot(nodeKey));

  const canExpand = node?.type !== "collection" || (node?.sizing.size ?? 0) > 0;
  const isExpanded = canExpand && isExpandedInStore;

  const [loadingChunks, setLoadingChunks] = useState(false);
  const [chunkState, dispatch] = useReducer(chunksReducer, undefined);
  const chunks = chunkState?.chunks;
  const hasChunks = !!chunks;

  useEffect(() => {
    // console.log("setChunks", node.nodeKey, chunks, node.type, isExpanded, nodeSize);
    // if (chunks || node.type !== "collection" || (!isExpanded && nodeSize > 5)) {
    if (!node || node.type !== "collection" || (!isExpanded && nodeSizing.size > 5)) {
      return;
    }
    if (hasChunks) {
      dispatch({ node, sortKeys, value });
    } else {
      setLoadingChunks(true);
      startTransition(() => {
        // console.log("setChunks", node.nodeKey, nodeSize, isExpanded, chunks);
        // const chunkSize = typeof node.chunkSize === "function" ? node.chunkSize(node.size, node.kind, node) : node.chunkSize;
        // setChunks(makeNodeChunks(node.getChildren(), chunkSize, node, { sort: sortKeys, nest: true }));
        dispatch({ node, sortKeys, value });
        setLoadingChunks(false);
      });
    }
  }, [hasChunks, isExpanded, node, nodeSizing.size, sortKeys, value]);

  const setHovered = useCallback(
    (expanded: boolean) => {
      const cKey = node?.type === "collection" && expanded ? nodeKey : parentKey;
      controller.setHovered(nodeKey);
      controller.setHoveredCollection(cKey);
    },
    [controller, nodeKey, node?.type, parentKey]
  );

  const setExpandedTransition: Dispatch<SetStateAction<boolean>> = useCallback(
    value => {
      startTransition(() => {
        controller.setExpanded(nodeKey, prev => {
          const newValue = typeof value === "function" ? value(prev) : value;
          setHovered(newValue);
          return newValue;
        });
      });
    },
    [controller, nodeKey, setHovered]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.nativeEvent.code === "ArrowRight") {
        event.stopPropagation();
        event.preventDefault();

        if (isExpanded) {
          event.currentTarget.querySelector<HTMLLIElement>("[role=treeitem]")?.focus();
        } else {
          setExpandedTransition(canExpand);
        }
      }

      if (event.nativeEvent.code === "ArrowLeft") {
        event.stopPropagation();
        event.preventDefault();
        if (isExpanded && nodeSizing.size > 0) {
          setExpandedTransition(false);
        } else if (path.length > 0) {
          findElementAncestor(event.currentTarget as HTMLElement, "[role=treeitem]")?.focus();
        }
      }

      if (event.nativeEvent.code === "ArrowDown" || event.nativeEvent.code === "ArrowUp") {
        const root = findElementAncestor(event.currentTarget as HTMLElement, "[data-tree-root]");

        if (!root) {
          return;
        }

        event.stopPropagation();
        event.preventDefault();
        const nodes = Array.from(root.querySelectorAll<HTMLLIElement>("[role=treeitem]"));
        const index = nodes.indexOf(event.currentTarget as HTMLLIElement);

        if (index === -1) {
          return;
        }

        const nextIndex = event.nativeEvent.code === "ArrowDown" ? index + 1 : index - 1;
        nodes[nextIndex]?.focus();
      }

      if (event.nativeEvent.code === "Space") {
        if (spaceAction === "expand") {
          event.stopPropagation();
          event.preventDefault();
          setExpandedTransition(prev => !prev);
        } else if (spaceAction === "select") {
          event.stopPropagation();
          event.preventDefault();
          controller.toggleSelected(nodeKey);
        }
      }
    },
    [isExpanded, setExpandedTransition, canExpand, nodeSizing.size, path.length, spaceAction, controller, nodeKey]
  );

  const handleNodeClick = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();

      if (clickAction === "expand") {
        setExpandedTransition(prev => canExpand && !prev);
      } else if (clickAction === "select") {
        controller.toggleSelected(nodeKey);
      }
      ref.current?.focus();
    },
    [canExpand, clickAction, controller, nodeKey, setExpandedTransition]
  );

  if (node?.hide) {
    return null;
  }

  if (!node) {
    return <JSONodeLoading nodeKey={nodeKey} count={1} />;
  }

  return (
    <li
      className={classes.node}
      role="treeitem"
      data-value={node.nodeKey}
      data-hovered={isCollectionHovered || undefined}
      data-expanded={isExpanded || undefined}
      data-selected={isSelected || undefined}
      data-level={path.length}
      data-level-mod={(path.length + levelOffset) % 12}
      data-type={node.type}
      onKeyDown={handleKeyDown}
      ref={ref}
      onMouseOver={event => {
        event.stopPropagation();
        setHovered(isExpanded);
      }}
    >
      <div className={cx(valueClasses.label, classes.label)} onClick={handleNodeClick} data-show-level-line={showLevelLine}>
        <IconCaretDownFilled
          className={classes.caret}
          color="currentcolor"
          data-expanded={isExpanded}
          data-show={nodeSizing.size > 0}
          onClick={e => {
            e.stopPropagation();
            setExpandedTransition(prev => !prev);
          }}
        />

        {!node.hideKey && (
          <span className={classes.keyAndColon}>
            <span className={classes.key} data-kind={typeof node.key}>
              {typeof node.key === "string" ? maybeQuoteKey(node.key, quoteKeys) : node.key}
            </span>
            {":"}
          </span>
        )}

        {node.type === "collection" && (
          <span className={classes["collection-value"]} data-opening-bracket={getConditionalOption(node.openingBracket, isExpanded)}>
            <span
              className={classes["collection-collapsed-contents"]}
              data-closing-bracket={getConditionalOption(node.closingBracket, isExpanded)}
            >
              {getCollapsedContents(node.collapsedContents ?? (nodeSizing.size > 0 ? "..." : ""), nodeSizing.size)}
            </span>
          </span>
        )}

        {node.type === "collection" && (isExpanded || node.collapsedContents !== CHILD_COUNT) && (
          <span className={classes.size}>
            {numberFormatter.format(nodeSizing.size)} {nodeSizing.size === 1 ? "item" : "items"}
          </span>
        )}

        {node.type === "value" &&
          createElement(rvc ?? RenderValue, {
            value,
            options: renderOptions ?? {
              collapseStringsAfterLength: 75
            },
            node,
            expanded: isExpanded,
            setExpanded: setExpandedTransition,
            selected: isSelected
          })}

        {enableCopy && (isHovered || isSelected) && (
          <CopyButtonAdvanced
            value={() => (typeof node.stringify === "string" ? node.stringify : (node.stringify?.(value) ?? JSON.stringify(value)))}
            copyLabel="Copy value"
            actionIconSize="var(--line-height)"
            buttonProps={{
              onClickCapture: e => e.stopPropagation(),
              onContextMenu: e => {
                e.preventDefault();
              },
              className: classes["copy-button"]
            }}
          >
            <CopyButtonItem value={node.key + ""}>Copy key</CopyButtonItem>
            <CopyButtonItem value={() => JSON.stringify(node.key)}>Copy JSON key</CopyButtonItem>
            <CopyButtonItem value={() => JSON.stringify(value)}>Copy JSON value</CopyButtonItem>
          </CopyButtonAdvanced>
        )}
      </div>

      {node.type === "collection" && (chunks || loadingChunks) && isExpanded && (
        <ul role="group" className={classes.subtree} data-expanded={isExpanded} data-show-level-line={showLevelLine}>
          {/* Render chunks or unchunked children */}
          {!chunks || loadingChunks ? (
            <JSONodeLoading nodeKey={nodeKey} count={nodeSizing.chunkCount || nodeSizing.size} />
          ) : isUnchunked(chunks) ? (
            chunks.children.map(([identifier, child]) => (
              <JSONode
                key={nodeKey + identifier}
                value={child}
                controller={controller}
                path={[...path, identifier]}
                nodeKey={!nodeKey ? identifier + "" : `${nodeKey}.${identifier}`}
                rvc={rvc}
                renderOptions={renderOptions}
                quoteKeys={quoteKeys}
                showCommas={showCommas}
                clickAction={clickAction}
                spaceAction={spaceAction}
                showLevelLine={showLevelLine}
                enableCopy={enableCopy}
                sortKeys={sortKeys}
                parentKey={nodeKey}
                levelOffset={levelOffset}
                overrides={node.overrides}
              />
            ))
          ) : (
            chunks.map(chunk => (
              <JSOChunk
                {...chunk}
                key={chunk.nodeKey}
                controller={controller}
                path={path}
                rvc={rvc}
                renderOptions={renderOptions}
                quoteKeys={quoteKeys}
                showCommas={showCommas}
                clickAction={clickAction}
                spaceAction={spaceAction}
                showLevelLine={showLevelLine}
                enableCopy={enableCopy}
                sortKeys={sortKeys}
                levelOffset={levelOffset}
                overrides={node.overrides}
              />
            ))
          )}
        </ul>
      )}

      {node.type === "collection" && isExpanded && (
        <span
          className={classes["collection-closing-bracket"]}
          data-closing-bracket={getConditionalOption(node.closingBracket, isExpanded)}
        />
      )}
    </li>
  );
}, arePropsEqual);

JSONode.displayName = "JSONode";

const fallbackSizing: NodeSizing = {
  size: 0,
  chunkSize: Number.POSITIVE_INFINITY,
  chunkCount: 0,
  contentsChunked: false
};

function arePropsEqual(prevProps: JSONodeProps, nextProps: JSONodeProps): boolean {
  // console.log("arePropsEqual", nextProps.nodeKey, prevProps, nextProps);
  for (const key in nextProps) {
    if (Object.prototype.hasOwnProperty.call(nextProps, key)) {
      const element = nextProps[key as keyof JSONodeProps];
      const prevElement = prevProps[key as keyof JSONodeProps];
      if (key === "path") {
        if (!arePathsEqual(element as (string | number)[], prevElement as (string | number)[])) {
          return false;
        }
      } else if (element !== prevElement) {
        // console.log("arePropsEqual", nextProps.nodeKey, "element changed", key, element, prevElement);
        return false;
      }
    }
  }
  return true;
}

function arePathsEqual(prevPath: (string | number)[], nextPath: (string | number)[]): boolean {
  if (prevPath.length !== nextPath.length) {
    return false;
  }
  for (let i = 0; i < prevPath.length; i++) {
    if (prevPath[i] !== nextPath[i]) {
      return false;
    }
  }
  return true;
}

function areNodesEqual(prev: JSONodeData, next: JSONodeData): boolean {
  // console.log("arePropsEqual", nextProps.nodeKey, prevProps, nextProps);
  for (const key in next) {
    if (Object.prototype.hasOwnProperty.call(next, key)) {
      const nextElement = next[key as keyof JSONodeData];
      const prevElement = prev[key as keyof JSONodeData];
      if (key === "value") {
        if (prevElement !== nextElement) {
          return false;
        }
      } else if (!isEqual(prevElement, nextElement)) {
        // console.log("areNodesEqual", next.nodeKey, "element changed", key, nextElement, prevElement);
        return false;
      }
    }
  }
  return true;
}

// This regex checks if a string is a valid ECMAScript identifier
const ecmaIdentifierRegex = /^\p{ID_Start}\p{ID_Continue}*$/u;

// This map is used for fast checking if a key needs to be quoted
// It is initialized with an empty string, which always needs to be quoted
const needsQuoteMap: Record<string, boolean | undefined> = {
  "": true
};

function maybeQuoteKey(key: string, quoteKeys: QuoteKeyOptions): string {
  if (quoteKeys === "always" || quoteKeys === true) {
    return `"${key}"`;
  }
  if (quoteKeys === "when-needed" || quoteKeys === false) {
    if (needsQuoteMap[key] === undefined) {
      needsQuoteMap[key] = !ecmaIdentifierRegex.test(key);
    }
    if (needsQuoteMap[key]) {
      return `"${key}"`;
    } else {
      return key;
    }
  }
  if (quoteKeys === "never") {
    return key;
  }
  return `"${key}"`; // Default to quoting
}

function getCollapsedContents(collapsedContents: string | typeof CHILD_COUNT, size: number): string {
  if (collapsedContents === CHILD_COUNT) {
    return numberFormatter.format(size);
  }
  return collapsedContents;
}

type ChunksState = {
  sourceValue: unknown;
  chunks: JSOChunkData[] | Unchunked;
  sortKeys: boolean;
};

type ChunksAction = {
  node: JSONodeData & { type: "collection" };
  value: unknown;
  sortKeys: boolean;
};

function chunksReducer(state: ChunksState | undefined, action: ChunksAction): ChunksState {
  if (state && state.sortKeys === action.sortKeys && state.chunks && state.sourceValue === action.value) {
    return state; // No change needed
  }

  const node = action.node;
  // const label = `makeNodeChunks ${node.nodeKey}`;
  // console.time(label);
  const chunks = makeNodeChunks(node.getChildren(action.value), node.sizing.chunkSize, node, { sort: action.sortKeys, nest: true });
  // console.timeEnd(label);
  return {
    sourceValue: action.value,
    chunks,
    sortKeys: action.sortKeys
  };
}
