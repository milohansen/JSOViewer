import { Box, Text } from "@mantine/core";
import { Dispatch, FC, SetStateAction, useMemo, useState } from "react";

import classes from "./RenderValue.module.css";

import { MouseTooltip } from "./accessories/MouseTooltip";
import { valueClass } from "./helpers";
import { JSONodeData } from "./parsing";

export type RenderOptions = {
  collapseStringsAfterLength?: number; // If provided, will collapse strings longer than this length
};

export type RenderValueProps = {
  value: unknown;
  node: JSONodeData;
  options: RenderOptions;
  expanded: boolean; // If true, the value is expanded
  setExpanded: Dispatch<SetStateAction<boolean>>; // Function to toggle expansion
  selected: boolean; // If true, the value is selected
};

// export type RenderValueComponent = FC<RenderValueProps>;
export type RenderValueComponent = FC<RenderValueProps>;

export function RenderValue({ value, options, expanded }: RenderValueProps) {
  if (value === null) {
    return (
      <Text inherit span className={valueClass("null")}>
        null
      </Text>
    );
  } else if (value === undefined) {
    return (
      <Text inherit span className={valueClass("undefined")}>
        undefined
      </Text>
    );
  } else if (typeof value === "object") {
    if (value instanceof Date) {
      return <RenderDate value={value} />;
    }
    return (
      <Text inherit span className={valueClass("object")}>
        {JSON.stringify(value)}
      </Text>
    );
  } else if (typeof value === "string") {
    let displayValue = value;
    if (options.collapseStringsAfterLength && value.length > options.collapseStringsAfterLength) {
      displayValue = value.slice(0, options.collapseStringsAfterLength) + "...";
    }
    return (
      <Text inherit span className={valueClass("string")}>
        "{displayValue}"
      </Text>
    );
  } else if (typeof value === "number" || typeof value === "bigint") {
    if (Number.isNaN(value)) {
      return (
        <Text inherit span className={valueClass("number")}>
          NaN
        </Text>
      );
    }
    return (
      <Text inherit span className={valueClass("number")}>
        {value}
        {typeof value === "bigint" ? "n" : ""}
      </Text>
    );
  } else if (typeof value === "boolean") {
    return (
      <Text inherit span className={valueClass("boolean")}>
        {value ? "true" : "false"}
      </Text>
    );
  } else if (typeof value === "function") {
    return <RenderFunction value={value} expanded={expanded} />;
  } else if (typeof value === "symbol") {
    const symbolForValue = Symbol.keyFor(value) !== undefined;
    const start = symbolForValue ? `Symbol.for(` : `Symbol(`;
    const symbolValue = String(value).slice(7, -1); // Remove "Symbol(" and ")"
    return (
      <Text inherit span className={classes.value}>
        <Text inherit span className={valueClass("symbol")}>
          {start}
        </Text>
        {symbolValue}
        <Text inherit span className={valueClass("symbol")}>
          )
        </Text>
      </Text>
    );
  }
  return (
    <Text inherit span className={valueClass("unknown")}>
      {String(value)}
    </Text>
  );
}

function RenderDate({ value }: { value: Date }) {
  const [format, setFormat] = useState("iso");
  const valueString = format === "iso" ? value.toISOString() : value.toLocaleString();
  return (
    <MouseTooltip label={format === "iso" ? "ISO Format (click to switch to locale)" : "Locale Format (click to switch to ISO)"}>
      <Text
        inherit
        span
        className={valueClass("date")}
        onClick={e => {
          e.stopPropagation();
          setFormat(prev => (prev === "iso" ? "locale" : "iso"));
        }}
      >
        {valueString}
      </Text>
    </MouseTooltip>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
function RenderFunction({ value, expanded }: { value: Function; expanded: boolean }) {
  const formattedLines = useMemo(() => formatFunctionLines(String(value)), [value]);
  const showEllipsis = !expanded && formattedLines.length > 1;
  return (
    <Box
      style={{ display: "flex", flexDirection: "column" }}
      className={valueClass("functionContainer")}
      data-expandable={formattedLines.length > 1}
    >
      {formattedLines.map(([line, indent], index) =>
        index === 0 || expanded ? (
          <Text key={index} inherit className={valueClass("function")} mod={{ expanded, indent }}>
            {line}
            {showEllipsis && "..."}
          </Text>
        ) : null
      )}
    </Box>
  );
}

function formatFunctionLines(str: string): [line: string, indent: number][] {
  const lines = str.split("\n");

  const formattedLines: [line: string, indent: number][] = [];
  let min = Infinity;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (i === 0) {
      formattedLines.push([line, 0]);
      continue;
    }
    const match = line.match(/^(\s*)/);
    if (match) {
      const indent = match[1].length;
      const formattedLine = line.slice(indent);
      formattedLines.push([formattedLine, indent]);
      min = Math.min(min, indent);
    } else {
      formattedLines.push([line, 0]);
    }
  }
  // console.log("formattedLines", formattedLines, "min", min);
  return formattedLines.map(([line, indent]) => [line, Math.max(indent - min, 0)]);
}
