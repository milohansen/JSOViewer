import { ActionIcon, Badge, Menu, Switch, Text } from "@mantine/core";
import {
  IconAdjustments,
  IconAlignLeft,
  IconAlignLeft2,
  IconArrowsSort,
  IconBraces,
  IconBracesOff,
  IconClick,
  IconClipboard,
  IconClipboardOff,
  IconKeyboard,
  IconKeyboardOff,
  IconSortAscendingLetters,
  IconSpace
} from "@tabler/icons-react";
import { PropsWithChildren, ReactElement, cloneElement, useState } from "react";

import classes from "./JSOViewer.module.css";

import { MouseTooltip } from "./accessories/MouseTooltip";
import { JSOViewerOptions } from "./JSOViewer";

type Props = {
  options: Required<JSOViewerOptions>;
  setOptions: (options: Required<JSOViewerOptions>) => void;

  hideDisabledOptions?: boolean; // If true, will hide options that are disabled by default
} & JSOViewerOptions;

export function JSOViewerOptionsMenu({
  options,
  setOptions,
  hideDisabledOptions,
  highlightBrackets,
  colorizeBrackets,
  enableCopy,
  showLevelLine,
  sortKeys,
  clickAction,
  spaceAction,
  enableKeyboardNavigation
}: Props) {
  const [open, setOpen] = useState(false);

  const items = [];

  const enableKeyboardNavigationValue = enableKeyboardNavigation ?? options.enableKeyboardNavigation;
  const enableKeyboardNavigationDisabled = typeof enableKeyboardNavigation !== "undefined";
  if (!enableKeyboardNavigationDisabled || !hideDisabledOptions) {
    items.push(
      <OptionItem
        key="sort-keys"
        disabled={enableKeyboardNavigationDisabled}
        checked={enableKeyboardNavigationValue}
        onLabel={<IconKeyboard />}
        offLabel={<IconKeyboardOff />}
        onClick={() => setOptions({ ...options, enableKeyboardNavigation: !enableKeyboardNavigationValue })}
      >
        Enable keyboard navigation
      </OptionItem>
    );
  }
  const sortKeysValue = sortKeys ?? options.sortKeys;
  const sortKeysDisabled = typeof sortKeys !== "undefined";
  if (!sortKeysDisabled || !hideDisabledOptions) {
    items.push(
      <OptionItem
        key="sort-keys"
        disabled={sortKeysDisabled}
        checked={sortKeysValue}
        onLabel={<IconSortAscendingLetters />}
        offLabel={<IconArrowsSort />}
        onClick={() => setOptions({ ...options, sortKeys: !sortKeysValue })}
      >
        Sort keys
      </OptionItem>
    );
  }

  const enableCopyValue = enableCopy ?? options.enableCopy;
  const enableCopyDisabled = typeof enableCopy !== "undefined";
  if (!enableCopyDisabled || !hideDisabledOptions) {
    items.push(
      <OptionItem
        key="enable-copy"
        disabled={enableCopyDisabled}
        checked={enableCopyValue}
        onLabel={<IconClipboard />}
        offLabel={<IconClipboardOff />}
        onClick={() => setOptions({ ...options, enableCopy: !enableCopyValue })}
      >
        Enable copy button
      </OptionItem>
    );
  }

  const bracesItems = [];

  const highlightBracketsValue = highlightBrackets ?? options.highlightBrackets;
  const highlightBracketsDisabled = typeof highlightBrackets !== "undefined";
  if (!highlightBracketsDisabled || !hideDisabledOptions) {
    bracesItems.push(
      <OptionItem
        key="highlight-brackets"
        disabled={highlightBracketsDisabled}
        checked={highlightBracketsValue}
        onLabel={<IconBraces />}
        offLabel={<IconBracesOff />}
        onClick={() => setOptions({ ...options, highlightBrackets: !highlightBracketsValue })}
      >
        Highlight matching braces
      </OptionItem>
    );
  }

  const colorizeBracketsValue = colorizeBrackets ?? options.colorizeBrackets;
  const colorizeBracketsDisabled = typeof colorizeBrackets !== "undefined";
  if (!colorizeBracketsDisabled || !hideDisabledOptions) {
    bracesItems.push(
      <OptionItem
        key="colorize-brackets"
        disabled={colorizeBracketsDisabled}
        checked={colorizeBracketsValue}
        onLabel={<IconBraces />}
        offLabel={<IconBracesOff />}
        onClick={() => setOptions({ ...options, colorizeBrackets: !colorizeBracketsValue })}
      >
        Color matching braces
      </OptionItem>
    );
  }

  const showLevelLineValue = showLevelLine ?? options.showLevelLine;
  const showLevelLineDisabled = typeof showLevelLine !== "undefined";
  if (!showLevelLineDisabled || !hideDisabledOptions) {
    bracesItems.push(
      <OptionItem
        key="show-level-line"
        disabled={showLevelLineDisabled}
        checked={showLevelLineValue}
        onLabel={<IconAlignLeft2 />}
        offLabel={<IconAlignLeft />}
        onClick={() => setOptions({ ...options, showLevelLine: !showLevelLineValue })}
      >
        Show level line
      </OptionItem>
    );
  }

  if (bracesItems.length > 0) {
    items.push(<Menu.Label key="braces-options-label">Braces Options</Menu.Label>, ...bracesItems);
  }

  const actionItems = [];

  const clickActionValue = clickAction ?? options.clickAction;
  const clickActionDisabled = typeof clickAction !== "undefined";
  if (!clickActionDisabled || !hideDisabledOptions) {
    actionItems.push(
      <Menu.Item
        key="click-action"
        disabled={clickActionDisabled}
        rightSection={<IconClick size={14} color="var(--mantine-color-dimmed)" />}
        leftSection={
          <Badge size="sm" style={{ pointerEvents: "none" }} variant={clickActionValue === "expand" ? "light" : "filled"}>
            {clickActionValue === "select" ? "Select" : "Expand"}
          </Badge>
        }
        onClick={() => setOptions({ ...options, clickAction: clickActionValue === "select" ? "expand" : "select" })}
      >
        On Click
      </Menu.Item>
    );
  }

  const spaceActionValue = spaceAction ?? options.spaceAction;
  const spaceActionDisabled = typeof spaceAction !== "undefined";

  if (enableKeyboardNavigationValue && (!spaceActionDisabled || !hideDisabledOptions)) {
    actionItems.push(
      <Menu.Item
        key="space-action"
        disabled={spaceActionDisabled}
        rightSection={<IconSpace size={14} color="var(--mantine-color-dimmed)" />}
        leftSection={
          <Badge size="sm" style={{ pointerEvents: "none" }} variant={spaceActionValue === "expand" ? "light" : "filled"}>
            {spaceActionValue === "select" ? "Select" : "Expand"}
          </Badge>
        }
        onClick={() => setOptions({ ...options, spaceAction: spaceActionValue === "select" ? "expand" : "select" })}
      >
        On Space
      </Menu.Item>
    );
  }

  if (actionItems.length > 0) {
    items.push(<Menu.Label key="action-options-label">Action Options</Menu.Label>, ...actionItems);
  }

  if (items.length === 0) {
    return null; // No options to display
  }

  return (
    <Menu
      shadow="md"
      position="bottom-end"
      withArrow
      closeOnItemClick={false}
      onClose={() => setOpen(false)}
      opened={open}
      onOpen={() => setOpen(true)}
    >
      <Menu.Target>
        <MouseTooltip label="Options">
          <ActionIcon
            size="md"
            className={classes["options-button"]}
            variant="default"
            onClick={() => setOpen(!open)}
            aria-label="Json Viewer Options"
            mod={{ open }}
          >
            <IconAdjustments size="1.125rem" />
          </ActionIcon>
        </MouseTooltip>
      </Menu.Target>

      <Menu.Dropdown>
        {/* <Menu.Label>Options</Menu.Label> */}
        {items}
      </Menu.Dropdown>
    </Menu>
  );
}

type OptionItemProps = {
  key: string;
  disabled?: boolean;
  checked: boolean;
  onClick: () => void;
  onLabel: ReactElement<{ size: number; color: string }>;
  offLabel: ReactElement<{ size: number; color: string }>;
};

function OptionItem({ key, disabled, checked, onClick, onLabel, offLabel, children }: PropsWithChildren<OptionItemProps>) {
  return (
    <Menu.Item
      key={key}
      disabled={disabled}
      leftSection={
        <Switch
          size="xs"
          checked={checked}
          style={{ pointerEvents: "none" }}
          onLabel={cloneElement(onLabel, { size: 12, color: "var(--mantine-color-white)" })}
          offLabel={cloneElement(offLabel, { size: 12, color: "var(--mantine-color-text)" })}
        />
      }
      rightSection={
        <Text c="dimmed" inherit>
          {checked ? "On" : "Off"}
        </Text>
      }
      onClick={onClick}
    >
      {children}
    </Menu.Item>
  );
}
