import { ActionIcon, ActionIconProps, ElementProps, MantineSpacing, TooltipProps, UnstyledButton } from "@mantine/core";
import { useClipboard } from "@mantine/hooks";
import { IconCheck, IconClipboard } from "@tabler/icons-react";
import cx from "clsx";
import { PropsWithChildren, createContext, useCallback, useContext, useMemo, useState } from "react";

import itemClasses from "./CopyButtonAdvanced.module.css";
import classes from "./CustomCopyButton.module.css";

import { CustomTooltip, CustomTooltipProps } from "./Tooltip";

type Props = PropsWithChildren<{
  value: string | (() => string);
  timeout?: number;
  iconSize?: string | number | undefined;
  actionIconSize?: MantineSpacing;
  copyLabel?: string;

  tooltipProps?: Omit<TooltipProps, "label" | "children">;
  buttonProps?: Omit<ActionIconProps, "children"> & ElementProps<"button", keyof ActionIconProps>;
}>;

export function CopyButtonAdvanced({
  value,
  timeout = 2000,
  iconSize = "70%",
  actionIconSize = "md",
  copyLabel = "Copy",
  tooltipProps = {},
  buttonProps = {},
  children
}: Props) {
  const clipboard = useClipboard({ timeout });

  const copy = useCallback(() => {
    const val = typeof value === "function" ? value() : value;
    clipboard.copy(val + "");
  }, [clipboard, value]);

  const copied = clipboard.copied;

  const [open, setOpen] = useState(false);

  const tooltipOptions: Partial<Omit<CustomTooltipProps, "children">> = useMemo(() => {
    if (open) {
      return {
        label: children,
        position: "right-start",
        tooltipProps: {
          style: {
            pointerEvents: "unset",
            padding: 0,
            display: "flex",
            flexDirection: "column"
          }
        },
        onOpenChange: setOpen
      };
    } else {
      return {};
    }
  }, [children, open]);

  return (
    <CloseMenuContext.Provider value={() => setOpen(false)}>
      <CustomTooltip
        label={clipboard.copied ? "Copied" : copyLabel}
        opened={copied || undefined}
        withArrow
        position="right"
        {...tooltipProps}
        {...tooltipOptions}
      >
        <ActionIcon
          variant="dimmed"
          {...buttonProps}
          size={actionIconSize}
          className={cx(classes.icon, buttonProps.className)}
          mod={{ copied }}
          aria-label={copied ? "Copied" : copyLabel}
          onClickCapture={e => {
            copy();
            buttonProps.onClickCapture?.(e);
          }}
          onContextMenu={e => {
            e.preventDefault();
            e.stopPropagation();
            setOpen(true);
          }}
        >
          {copied ? (
            <IconCheck style={{ width: iconSize, height: iconSize }} />
          ) : (
            <IconClipboard style={{ width: iconSize, height: iconSize }} />
          )}
        </ActionIcon>
      </CustomTooltip>
    </CloseMenuContext.Provider>
  );
}

const CloseMenuContext = createContext<() => void>(() => {});

type CopyButtonItemProps = PropsWithChildren<{
  value: string | (() => string);
}>;
export function CopyButtonItem({ children, value }: CopyButtonItemProps) {
  const clipboard = useClipboard();

  const closeMenu = useContext(CloseMenuContext);

  const copy = useCallback(() => {
    const val = typeof value === "function" ? value() : value;
    clipboard.copy(val + "");
    closeMenu();
  }, [clipboard, closeMenu, value]);

  // const copied = clipboard.copied;

  return (
    <UnstyledButton
      onClick={e => {
        e.stopPropagation();
        e.preventDefault();
        copy();
      }}
      fz="0.875rem"
      className={itemClasses.item}
    >
      {children}
    </UnstyledButton>
  );
}
