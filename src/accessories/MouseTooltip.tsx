import { flip, inline, offset, shift, useClientPoint, useDelayGroup, useDismiss, useFloating, useHover, useInteractions, useMergeRefs, useRole } from "@floating-ui/react";
import { Paper, PaperProps, TooltipProps, isElement } from "@mantine/core";
import { useId } from "@mantine/hooks";
import { PropsWithChildren, ReactElement, Ref, cloneElement, useEffect, useMemo, useState } from "react";

import { TransitionPortal, TransitionPortalProps } from "./TransitionPortal";

type Props = PropsWithChildren<
  TooltipProps & {
    withBorder?: boolean;

    overflowProps?: Partial<PaperProps>;
    transitionProps?: Partial<TransitionPortalProps>;
  }
>;

const restMs = 500;

export function MouseTooltip({
  children,
  label,
  disabled,
  position: placement = "bottom-start",
  withBorder = true,
  overflowProps,
  transitionProps,
  ref,
  ...settings
}: Props & { ref?: Ref<HTMLElement | null> }) {
  const [opened, setOpened] = useState(false);
  const [heldX, setHeldX] = useState<number>();
  const [heldY, setHeldY] = useState<number>();
  const uid = useId();

  const { x, y, context, refs, isPositioned } = useFloating({
    strategy: settings.floatingStrategy,
    placement,
    open: !disabled && opened,
    onOpenChange: (v, ev) => {
      setOpened(v);
      if (v && ev instanceof MouseEvent) {
        setHeldX(undefined);
        setHeldY(undefined);
      }
    },
    middleware: [offset(settings.offset ?? 12), shift({ padding: 8 }), flip(), ...(settings.inline ? [inline()] : [])],
  });

  useEffect(() => {
    if (isPositioned && heldX === undefined) {
      setHeldX(x);
    }
  }, [x, isPositioned, heldX]);
  useEffect(() => {
    if (isPositioned && heldY === undefined) {
      setHeldY(y);
    }
  }, [y, isPositioned, heldY]);

  useEffect(() => {
    if (heldX !== undefined && heldY !== undefined && (x !== heldX || y !== heldY)) {
      if (Math.abs(x - heldX) > 3 || Math.abs(y - heldY) > 3) {
        setOpened(false);
      }
    }
  }, [y, heldY, x, heldX]);

  const xOffset = useMemo(() => (typeof settings.offset === "number" ? settings.offset : settings.offset?.mainAxis ?? 8), [settings.offset]);
  const yOffset = useMemo(() => (typeof settings.offset === "number" ? settings.offset : settings.offset?.crossAxis ?? 8), [settings.offset]);

  const { delay } = useDelayGroup(context, { id: uid });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    useHover(context, {
      enabled: !disabled,
      delay,
      move: true,
      restMs,
    }),
    useClientPoint(context),
    useRole(context, { role: "tooltip" }),
    useDismiss(context),
  ]);

  if (!isElement(children)) {
    throw new Error("Tooltip component requires single child of type element");
  }

  const targetRef = useMergeRefs<HTMLElement>([refs.setReference, ref, (children as ReactElement<{ ref?: Ref<HTMLElement> }>).props.ref]);

  return (
    <>
      <TransitionPortal transition="fade" {...transitionProps} mounted={!disabled && opened}>
        {(transitionStyles) => (
          <Paper
            p={4}
            shadow="sm"
            {...overflowProps}
            ref={refs.setFloating}
            withBorder={withBorder}
            style={[
              overflowProps?.style ?? {},
              transitionStyles,
              {
                zIndex: 9999,
                top: (heldY ?? y ?? 0) + yOffset,
                left: (heldX ?? x ?? 0) + xOffset,
                position: "absolute",
                pointerEvents: "none",
                fontSize: "0.875rem",
              },
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
