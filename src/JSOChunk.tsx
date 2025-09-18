import { findElementAncestor } from "@mantine/core";
import { IconCaretDownFilled } from "@tabler/icons-react";
import { Dispatch, SetStateAction, memo, startTransition, useCallback, useMemo, useRef, useSyncExternalStore } from "react";

import classes from "./JSONode.module.css";

import { JSONode, JSONodeProps } from "./JSONode";
import { numberFormatter, sortEntries } from "./helpers";
import { Entry, JSONodeData, getConditionalOption } from "./parsing";

export type JSOChunkData = Pick<JSONodeData & { type: "collection" }, "openingBracket" | "closingBracket"> & {
  sourceKey: string;
  nodeKey: string;

  start: number;
  end: number;
} & (
    | {
        isNested?: false;
        children: [key: string | number, value: unknown][];
      }
    | {
        isNested: true;
        children: JSOChunkData[];
      }
  );

type Props = JSOChunkData & Omit<JSONodeProps, "value">;

export const JSOChunk = memo(function JSOChunk({
  sourceKey,
  nodeKey,
  path,
  children,
  controller,

  start,
  end,
  isNested = false,

  openingBracket,
  closingBracket,

  clickAction = "expand",
  spaceAction = "expand",
  showLevelLine,
  sortKeys,
  parentKey,
  levelOffset = 0,
  ...rest
}: Props) {
  const ref = useRef<HTMLLIElement>(null);

  const nodeSize = children.length;

  const sortedChildren = useMemo(() => {
    if (sortKeys && !isNested) {
      return [...(children as Entry[])].sort(sortEntries);
    }
    return children;
  }, [children, isNested, sortKeys]);

  const {
    isCollectionHovered,
    isExpanded = path.length === 0,
    isSelected = false
  } = useSyncExternalStore(controller.makeNodeStateSubscription(nodeKey, "collection"), controller.makeNodeStateSnapshot(nodeKey));

  const setHovered = useCallback(
    (expanded: boolean) => {
      const cKey = expanded ? nodeKey : parentKey;
      controller.setHovered(sourceKey);
      controller.setHoveredCollection(cKey);
    },
    [controller, nodeKey, parentKey, sourceKey]
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
          setExpandedTransition(true);
        }
      }

      if (event.nativeEvent.code === "ArrowLeft") {
        event.stopPropagation();
        event.preventDefault();
        if (isExpanded && nodeSize > 0) {
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
    [isExpanded, setExpandedTransition, nodeSize, path.length, spaceAction, controller, nodeKey]
  );

  const handleNodeClick = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();

      if (clickAction === "expand") {
        setExpandedTransition(prev => !prev);
      } else if (clickAction === "select") {
        controller.toggleSelected(nodeKey);
      }
      ref.current?.focus();
    },
    [clickAction, controller, nodeKey, setExpandedTransition]
  );

  return (
    <li
      className={classes.node}
      role="treeitem"
      data-value={nodeKey}
      data-hovered={isCollectionHovered || undefined}
      data-expanded={isExpanded || undefined}
      data-selected={isSelected || undefined}
      data-level={path.length}
      data-level-mod={(path.length + levelOffset + 1) % 12}
      onKeyDown={handleKeyDown}
      ref={ref}
      onMouseOver={event => {
        event.stopPropagation();
        setHovered(isExpanded);
      }}
    >
      <div className={classes.label} onClick={handleNodeClick} data-show-level-line={showLevelLine}>
        <IconCaretDownFilled
          className={classes.caret}
          color="currentcolor"
          data-expanded={isExpanded}
          data-show
          onClick={e => {
            e.stopPropagation();
            setExpandedTransition(prev => !prev);
          }}
        />
        {`${getConditionalOption(openingBracket, true)}${start === end ? start : `${numberFormatter.format(start)} - ${numberFormatter.format(end)}`}${getConditionalOption(closingBracket, true)}`}
      </div>

      {(isExpanded || children.length < 5) && (
        <ul role="group" className={classes.subtree} data-expanded={isExpanded} data-show-level-line={showLevelLine}>
          {sortedChildren.map(v => {
            if (Array.isArray(v)) {
              const [identifier, child] = v;
              const key = `${sourceKey}.${identifier}`;
              return (
                <JSONode
                  key={key}
                  value={child}
                  controller={controller}
                  path={[...path, identifier]}
                  nodeKey={key}
                  clickAction={clickAction}
                  spaceAction={spaceAction}
                  showLevelLine={showLevelLine}
                  sortKeys={sortKeys}
                  parentKey={nodeKey}
                  levelOffset={levelOffset + 1}
                  {...rest}
                />
              );
            } else if (isNested) {
              return (
                <JSOChunk
                  key={v.nodeKey}
                  {...v}
                  controller={controller}
                  path={path}
                  clickAction={clickAction}
                  spaceAction={spaceAction}
                  showLevelLine={showLevelLine}
                  sortKeys={sortKeys}
                  parentKey={nodeKey}
                  levelOffset={levelOffset + 1}
                  {...rest}
                />
              );
            }
          })}
        </ul>
      )}
    </li>
  );
});
