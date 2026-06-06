/** @type {import('jest').Config} */
const config = {
  testEnvironment: "jest-environment-jsdom",
  transform: { "^.+\\.tsx?$": ["ts-jest", { tsconfig: { jsx: "react-jsx" } }] },
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/$1" },
  setupFilesAfterEnv: ["@testing-library/jest-dom"],
  testMatch: [
    "**/__tests__/**/*.[jt]s?(x)",
    "**/?(*.)+(spec|test).[jt]s?(x)",
    "**/?(*.)+(pbt.test).[jt]s?(x)",
  ],
};
module.exports = config;
