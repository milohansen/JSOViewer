import { Box, Text } from "@mantine/core";
import cx from "clsx";

import nodeClasses from "./JSONode.module.css";
import classes from "./RenderValue.module.css";

import { RenderValueProps } from "./RenderValue";

function DoNotDisplay() {
  return <Box className={nodeClasses["do-not-display"]}>[Do not display]</Box>;
}
const DO_NOT_DISPLAY = <DoNotDisplay />;

export function RenderValueJSON({ value, options }: RenderValueProps) {
  const nullComponent = (
    <Text inherit span c="dimmed" className="null">
      null
    </Text>
  );
  if (value === null) {
    return nullComponent;
  } else if (value === undefined) {
    return DO_NOT_DISPLAY;
  } else if (typeof value === "object") {
    try {
      return (
        <Text inherit span className={cx(classes.value, classes.object)}>
          {JSON.stringify(value)}
        </Text>
      );
    } catch {
      return null;
    }
  } else if (typeof value === "string") {
    let displayValue = value;
    if (options.collapseStringsAfterLength && value.length > options.collapseStringsAfterLength) {
      displayValue = value.slice(0, options.collapseStringsAfterLength) + "...";
    }
    return (
      <Text inherit span className={cx(classes.value, classes.string)}>
        "{displayValue}"
      </Text>
    );
  } else if (typeof value === "number") {
    if (Number.isNaN(value)) {
      return nullComponent;
    }
    return (
      <Text inherit span className={cx(classes.value, classes.number)}>
        {value}
      </Text>
    );
  } else if (typeof value === "boolean") {
    return (
      <Text inherit span className={cx(classes.value, classes.boolean)}>
        {value ? "true" : "false"}
      </Text>
    );
  } else if (typeof value === "function") {
    return DO_NOT_DISPLAY;
  } else if (typeof value === "symbol") {
    return DO_NOT_DISPLAY;
  }
  return DO_NOT_DISPLAY;
}
