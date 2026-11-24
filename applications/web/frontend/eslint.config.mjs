import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // built copy of the 3D city tour (source: F_B_Landing page)
    "public/3d/**",
    // research material: third-party YOLOv8 demo site and notes, not app code
    "ml/**",
  ]),
]);

export default eslintConfig;
