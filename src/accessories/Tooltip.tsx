import { flip, inline, offset, safePolygon, shift, useDelayGroup, useDismiss, useFloating, useHover, useInteractions, useMergeRefs, useRole } from "@floating-ui/react";
import { Paper, PaperProps, TooltipProps, getDefaultZIndex, isElement } from "@mantine/core";
import { useId, useInViewport } from "@mantine/hooks";
import { PropsWithChildren, ReactElement, Ref, cloneElement, useState } from "react";

import { useFloatingAutoUpdate } from "./useFloatingAutoUpdate";
import { TransitionPortal, TransitionPortalProps } from "./TransitionPortal";

export type CustomTooltipProps = PropsWithChildren<
  TooltipProps & {
    withBorder?: boolean;

    tooltipProps?: Partial<PaperProps>;
    transitionProps?: Partial<TransitionPortalProps>;

    onOpenChange?: (open: boolean) => void;
  }
>;

const zIndex = getDefaultZIndex("popover");

const restMs = 150;

export function CustomTooltip({
  children,
  label,
  disabled,
  position: placement = "bottom-start",
  withBorder = true,
  tooltipProps,
  transitionProps,
  ref,
  onOpenChange,
  opened: openedProp,
  ...settings
}: CustomTooltipProps & { ref?: Ref<HTMLElement | null> }) {
  const [opened, setOpened] = useState(false);
  const uid = useId();

  const { x, y, context, refs, update } = useFloating({
    strategy: settings.floatingStrategy,
    placement,
    open: !disabled && (openedProp ?? opened),
    onOpenChange: (o) => {
      setOpened(o);
      onOpenChange?.(o);
    },
    middleware: [offset(settings.offset), shift({ padding: 8 }), flip(), ...(settings.inline ? [inline()] : [])],
  });

  const { ref: viewportRef, inViewport } = useInViewport();

  useFloatingAutoUpdate({
    opened,
    refs,
    update,
    visible: inViewport,
  });

  const { delay } = useDelayGroup(context, { id: uid });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    useHover(context, {
      enabled: !disabled,
      delay,
      restMs,
      move: false,
      handleClose: safePolygon(),
    }),
    useRole(context, { role: "tooltip" }),
    useDismiss(context),
  ]);

  if (!isElement(children)) {
    throw new Error("Tooltip component requires single child of type element");
  }

  const targetRef = useMergeRefs<HTMLElement>([refs.setReference, viewportRef, ref, (children as ReactElement<{ ref?: Ref<HTMLElement> }>).props.ref]);

  return (
    <>
      <TransitionPortal transition="fade" {...transitionProps} mounted={!disabled && opened}>
        {(transitionStyles) => (
          <Paper
            shadow="sm"
            {...tooltipProps}
            ref={refs.setFloating}
            withBorder={withBorder}
            style={[
              {
                padding: 4,
                zIndex,
                top: y ?? 0,
                left: x ?? 0,
                position: "absolute",
                pointerEvents: "none",
                fontSize: "0.875rem",
              },
              tooltipProps?.style ?? {},
              transitionStyles,
            ]}
            {...getFloatingProps()}
          >
            {label}
          </Paper>
        )}
      </TransitionPortal>

      {cloneElement(
        children,
        getReferenceProps({
          ref: targetRef,
        })
      )}
    </>
  );
}
