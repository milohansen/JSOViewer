import react from "@vitejs/plugin-react";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react({
    babel: {
      envName: "production",
    }
  })],
  build: {
    outDir: "dist",
    lib: {
      entry: {
        "JSOViewer": resolve(__dirname, "src/JSOViewer.tsx"),
        "Tooltip": resolve(__dirname, "src/accessories/Tooltip.tsx"),
        "MouseTooltip": resolve(__dirname, "src/accessories/MouseTooltip.tsx"),
        "TransitionPortal": resolve(__dirname, "src/accessories/TransitionPortal.tsx"),
        "CopyButton": resolve(__dirname, "src/accessories/CopyButton.tsx"),
      },
      name: "JSOViewer",
      formats: ["es", "cjs"],
      fileName: (format, entryName) => `${entryName}.${format === "es" ? "mjs" : "cjs"}`,
      cssFileName: "styles"
    },
    rollupOptions: {
      // make sure to externalize deps that shouldn't be bundled
      // into your library
      external: ["react", "react/jsx-runtime", "react-dom", "@mantine/core", "@mantine/hooks", "@tabler/icons-react", "es-toolkit/compat", "@floating-ui/react", "clsx"],
      output: {
        // Provide global variables to use in the UMD build
        // for externalized deps
        globals: {
          react: "React",
          "react/jsx-runtime": "ReactJSXRuntime",
          "react-dom": "ReactDOM",
          "@mantine/core": "mantineCore",
          "@mantine/hooks": "mantineHooks",
          "@tabler/icons-react": "tablerIconsReact",
          "es-toolkit/compat": "esToolkit",
          "@floating-ui/react": "floatingUIReact",
          clsx: "clsx",
        },
      },
    },
  },
});
