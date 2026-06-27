import type { Config } from "jest";

const tsJestOptions = {
  tsconfig: {
    module: "CommonJS",
    moduleResolution: "node",
  },
};

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  transform: {
    "^.+\\.tsx?$": ["ts-jest", tsJestOptions],
    "^.+\\.js$": ["ts-jest", { ...tsJestOptions, diagnostics: false }],
  },
  transformIgnorePatterns: ["/node_modules/(?!jose)/"],
  setupFiles: ["<rootDir>/jest.setup.ts"],
};

export default config;