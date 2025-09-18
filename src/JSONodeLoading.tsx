import { Box, Skeleton, Text } from "@mantine/core";

import classes from "./JSONode.module.css";

type Props = {
  nodeKey: string;
  count: number;
  width?: number; // Optional base width for the skeletons
  jitter?: number; // Optional jitter value to add randomness to the width
};

export function JSONodeLoading({ nodeKey, count, width: baseWidth = 280, jitter: widthJitter = 200 }: Props) {
  if (!(nodeKey in lengthStore)) {
    lengthStore[nodeKey] = {};
  }

  return (
    <Box className={classes.loading} data-count={count}>
      {Array.from({ length: count }).map((_, index) => {
        if (index === 0) {
          return <Text key={index} className={classes.loader} />;
        }
        let length = lengthStore[nodeKey][index];
        if (!length) {
          const jitter = Math.round(Math.random() * widthJitter) - widthJitter / 2; // Random jitter between -100 and 100
          length = baseWidth + jitter; // Base length of 280px with jitter
          lengthStore[nodeKey][index] = length;
        }
        return <Skeleton key={index} height="calc(1em * 1.15)" width={length} my="calc(calc(1lh - var(--skeleton-height)) / 2)" />;
      })}
    </Box>
  );
}

const lengthStore: Record<string, Record<number, number>> = {};
