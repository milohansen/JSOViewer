import cx from "clsx";

import nodeClasses from "./JSONode.module.css";
import classes from "./RenderValue.module.css";

export function sortEntries([a]: [string | number, unknown], [b]: [string | number, unknown]): number {
  if (typeof a === "string" && typeof b === "string") {
    return a.localeCompare(b);
  }
  if (typeof a === "number" && typeof b === "number") {
    return a - b;
  }
  if (typeof a === "string" && typeof b === "number") {
    return -1; // Strings come before numbers
  }
  if (typeof a === "number" && typeof b === "string") {
    return 1; // Numbers come after strings
  }
  return 0; // Fallback for other types, should not happen in JSON
}

export const numberFormatter = new Intl.NumberFormat();

export function valueClass(name: string) {
  return cx(nodeClasses.value, classes.value, classes[name]);
}
