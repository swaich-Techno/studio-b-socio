import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "cc-auth-backend-test/**",
      "MFS-CC-AUTH/**",
      "MFS-CC-AUTH-GITHUB-UPLOAD/**",
      "MFS-CC-AUTH-REPO/**",
      "node_modules/**",
      "next-env.d.ts",
      "tsconfig.tsbuildinfo"
    ]
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      "react-hooks/set-state-in-effect": "off"
    }
  }
];

export default eslintConfig;
