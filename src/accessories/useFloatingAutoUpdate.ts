import { ReferenceType, autoUpdate } from "@floating-ui/react";
import { useDidUpdate } from "@mantine/hooks";
import { MutableRefObject, useEffect, useState } from "react";

interface Payload {
  opened: boolean;
  update(): void;
  refs: {
    floating: MutableRefObject<HTMLElement | null>;
    reference: MutableRefObject<ReferenceType | null>;
  };
  visible?: boolean;
}

export function useFloatingAutoUpdate({ opened, refs, update, visible }: Payload) {
  const [delayedUpdate, setDelayedUpdate] = useState(0);

  useEffect(() => {
    const isVisible = typeof visible === "boolean" ? visible : true;
    if (refs.reference.current && refs.floating.current && isVisible) {
      return autoUpdate(refs.reference.current, refs.floating.current, update);
    }
  }, [refs.reference.current, refs.floating.current, /* effect dep */ opened, /* effect dep */ delayedUpdate, visible]);

  useDidUpdate(() => {
    update();
  }, []);

  useDidUpdate(() => {
    setDelayedUpdate(c => c + 1);
  }, [opened]);
}
