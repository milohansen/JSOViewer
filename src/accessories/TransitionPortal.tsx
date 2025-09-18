import { Transition, TransitionProps } from "@mantine/core";
import { useIsomorphicEffect } from "@mantine/hooks";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";

export type TransitionPortalProps = TransitionProps & {
  target?: string | HTMLElement;
};

export function TransitionPortal({ target = ".mantine-AppShell-root", ...transitionProps }: TransitionPortalProps) {
  const ref = useRef<HTMLElement>(null);
  const [mounted, setMounted] = useState(false);

  useIsomorphicEffect(() => {
    if (!mounted) {
      if (typeof target === "string") {
        ref.current = document.querySelector<HTMLElement>(target);
      } else if (target instanceof HTMLElement) {
        ref.current = target;
      }
      setMounted(true);
    }
  });

  if (!mounted) {
    return null;
  }

  return createPortal(<Transition {...transitionProps} />, ref.current!);
}
