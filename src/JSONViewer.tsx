import { useEffect, useState } from "react";

import { JSOViewer, JSOViewerExtension, JSOViewerProps } from "./JSOViewer";

export function JSONViewer(props: JSOViewerProps) {
  const [extensions, setExtensions] = useState([jsonExtension, ...(props.extensions || [])]);
  useEffect(() => {
    setExtensions([jsonExtension, ...(props.extensions || [])]);
  }, [props.extensions]);

  return <JSOViewer {...props} extensions={extensions} disableDefaultExtensions />;
}

const jsonExtension: JSOViewerExtension = {
  match: (value => {
    const valueType = typeof value;
    if (valueType === "bigint" || valueType === "function" || valueType === "undefined" || valueType === "symbol") {
      return true;
    }
    if (typeof value === "object" && value !== null) {
      const proto = Object.getPrototypeOf(value);
      if (proto.constructor !== Object && proto.constructor !== Array) {
        console.log("jsonExtension", "match", value, proto, typeof value);
        try {
          JSON.stringify(value);
        } catch {
          return true;
        }
      }
    }
    return false;
  }) as (value: unknown) => value is unknown,
  parse: () => {
    return {
      type: "value",
      hide: true
    };
  }
};
