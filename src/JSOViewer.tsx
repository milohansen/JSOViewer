import { ElementProps, Factory, Paper, PaperProps, TreeCssVariables, TreeStylesNames } from "@mantine/core";
import { useLocalStorage } from "@mantine/hooks";
import cx from "clsx";
import { useEffect, useMemo, useState } from "react";

import nodeClasses from "./JSONode.module.css";
import classes from "./JSOViewer.module.css";

import { JSONode } from "./JSONode";
import { JSOViewerOptionsMenu } from "./JSOViewerOptionsMenu";
import { RenderValueComponent } from "./RenderValue";
import { defaultExtensions } from "./extensions";
import { ChunkSize, JSONodeData, MakeNodeOptions } from "./parsing";
import { JSOViewController } from "./store/JSOViewController";

export type ParsedProps = Omit<JSONodeData, "nodeKey" | "key" | "path" | "value" | "sizing">;
export type ParsedValueResult = Omit<JSONodeData & { type: "value" }, "nodeKey" | "key" | "path" | "value" | "sizing">;
export type ParsedCollectionResult = Omit<
  JSONodeData & { type: "collection" },
  "nodeKey" | "key" | "path" | "value" | "sizing" | "chunkSize"
> & {
  size: number;
  chunkSize?: ChunkSize;
};
export type ParseFunction<T = unknown> = (value: T) => (ParsedValueResult | ParsedCollectionResult) | undefined;

export type JSOViewerExtension<T = unknown> = {
  match: (value: unknown) => value is T;
  parse: ParseFunction<T>;
};

type RenderOptions = {
  collapseStringsAfterLength?: number; // If provided, will collapse strings longer than this length
};

export type JSOViewerOptions = {
  highlightBrackets?: boolean; // If true, will highlight opening and closing brackets
  colorizeBrackets?: boolean; // If true, will colorize brackets based on their type

  showLevelLine?: boolean;
  enableCopy?: boolean; // If true, will enable copy button for each value
  sortKeys?: boolean; // If true, will sort keys in collections

  clickAction?: "expand" | "select"; // Action to perform on click
  spaceAction?: "expand" | "select"; // Action to perform on space key press

  enableKeyboardNavigation?: boolean; // If true, will enable keyboard navigation
};

/**
 * Whether to quote string keys in objects.
 *
 * - If true or "always", all keys will be quoted.
 * - If false or "when-needed", keys will be quoted only if they are not valid identifiers.
 * - If "never", no keys will be quoted.
 */
export type QuoteKeyOptions = "always" | "never" | "when-needed" | boolean; // If true, will quote all keys, if "always", will always quote keys even if they are valid identifiers

export type JSOViewerProps = {
  value: unknown;
  /**
   * Extensions to customize the rendering of specific types of values.
   * Each extension should provide a `match` function to identify the type of value it handles,
   * and a `render` function to render the value.
   * The `getNodeProps` function can be used to customize the node properties for the matched value.
   * **IMPORTANT**: This object should be memoized to avoid unnecessary re-renders.
   */
  extensions?: JSOViewerExtension[];
  /**
   * Whether to include the default extensions for `Set` and `Map`
   * @default false
   */
  disableDefaultExtensions?: boolean;

  renderValueComponent?: RenderValueComponent;

  /**
   * Whether to quote string keys in objects.
   *
   * - If true or "always", all keys will be quoted.
   * - If false or "when-needed", keys will be quoted only if they are not valid identifiers.
   * - If "never", no keys will be quoted.
   *
   * @default "when-needed"
   */
  quoteKeys?: QuoteKeyOptions; // If true, will quote all keys, if "always", will always quote keys even if they are valid identifiers

  showCommas?: boolean; // If true, will show commas between items in collections

  // Options menu
  disableOptionsMenu?: boolean; // If true, will disable the options menu
  hideDisabledOptions?: boolean; // If true, will hide options that are disabled by default
  defaultOptions?: Partial<JSOViewerOptions>; // Default options to apply to the viewer
} & JSOViewerOptions &
  MakeNodeOptions &
  RenderOptions &
  PaperProps;

export function JSOViewer({
  value,
  extensions: userExtensions,
  disableDefaultExtensions,
  renderValueComponent,
  quoteKeys = "when-needed",
  showCommas = true,
  defaultExpanded,
  chunkSize,
  arrayChunkSize,
  objectChunkSize,
  collapseStringsAfterLength,
  highlightBrackets,
  colorizeBrackets,
  showLevelLine,
  enableCopy,
  sortKeys,
  clickAction,
  spaceAction,
  enableKeyboardNavigation = false,
  disableOptionsMenu,
  hideDisabledOptions = true,
  defaultOptions,
  extendedParse: _,
  defaultProps: __,
  ...paperProps
}: JSOViewerProps) {
  const [controller] = useState(
    () =>
      new JSOViewController([...(disableDefaultExtensions ? [] : defaultExtensions), ...(userExtensions || [])], {
        chunkSize,
        arrayChunkSize,
        objectChunkSize,
        defaultExpanded
      })
  );

  useEffect(() => {
    controller.extensions = [...(disableDefaultExtensions ? [] : defaultExtensions), ...(userExtensions || [])];
  }, [controller, disableDefaultExtensions, userExtensions]);
  useEffect(() => {
    controller.options = {
      chunkSize,
      arrayChunkSize,
      objectChunkSize,
      defaultExpanded
    };
  }, [chunkSize, arrayChunkSize, objectChunkSize, defaultExpanded, controller]);

  const [storedViewerOptions] = useLocalStorage<Partial<JSOViewerOptions> | undefined>({
    key: "jso-viewer-options",
    defaultValue: defaultOptions
  });
  const [viewerOptions, setViewerOptions] = useState<Required<JSOViewerOptions>>(() => ({
    highlightBrackets: highlightBrackets ?? storedViewerOptions?.highlightBrackets ?? true, // Default to false if not provided
    colorizeBrackets: colorizeBrackets ?? storedViewerOptions?.colorizeBrackets ?? false, // Default to false if not provided
    showLevelLine: showLevelLine ?? storedViewerOptions?.showLevelLine ?? true, // Default to false if not provided
    enableCopy: enableCopy ?? storedViewerOptions?.enableCopy ?? false, // Default to false if not provided
    sortKeys: sortKeys ?? storedViewerOptions?.sortKeys ?? false, // Default to false if not provided
    clickAction: clickAction ?? storedViewerOptions?.clickAction ?? "expand", // Default to "expand" if not provided
    spaceAction: spaceAction ?? storedViewerOptions?.spaceAction ?? "expand", // Default to "expand" if not provided
    enableKeyboardNavigation: enableKeyboardNavigation ?? storedViewerOptions?.enableKeyboardNavigation ?? false // Default to false if not provided
  }));

  const renderOptions = useMemo(
    () => (collapseStringsAfterLength ? { collapseStringsAfterLength } : undefined),
    [collapseStringsAfterLength]
  );

  return (
    <Paper
      withBorder
      shadow="none"
      component="ul"
      role="tree"
      data-tree-root
      {...paperProps}
      className={cx("root", nodeClasses.container, classes.container, paperProps?.className)}
      data-highlight-brackets={highlightBrackets ?? viewerOptions.highlightBrackets}
      data-colorize-brackets={colorizeBrackets ?? viewerOptions.colorizeBrackets}
      data-show-commas={showCommas}
      onMouseLeave={() => {
        controller.setHovered(undefined);
        controller.setHoveredCollection(undefined);
      }}
    >
      {!disableOptionsMenu && (
        <JSOViewerOptionsMenu
          options={viewerOptions}
          setOptions={setViewerOptions}
          hideDisabledOptions={hideDisabledOptions}
          highlightBrackets={highlightBrackets}
          showLevelLine={showLevelLine}
          enableCopy={enableCopy}
          sortKeys={sortKeys}
          colorizeBrackets={colorizeBrackets}
          clickAction={clickAction}
          spaceAction={spaceAction}
          enableKeyboardNavigation={enableKeyboardNavigation}
        />
      )}

      <JSONode
        value={value}
        controller={controller}
        path={rootPath}
        nodeKey=""
        clickAction={clickAction ?? viewerOptions.clickAction}
        spaceAction={spaceAction ?? viewerOptions.spaceAction}
        rvc={renderValueComponent}
        renderOptions={renderOptions}
        quoteKeys={quoteKeys}
        showCommas={showCommas}
        showLevelLine={showLevelLine ?? viewerOptions.showLevelLine}
        enableCopy={enableCopy ?? viewerOptions.enableCopy}
        sortKeys={sortKeys ?? viewerOptions.sortKeys}
      />
    </Paper>
  );
}

const rootPath: (string | number)[] = [];

interface RootProps extends PaperProps, ElementProps<"ul"> {}

export type JsonTreeFactory = Factory<{
  props: RootProps;
  ref: HTMLUListElement;
  stylesNames: TreeStylesNames;
  vars: TreeCssVariables;
}>;
