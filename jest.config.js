/** @type {import('jest').Config} */
const config = {
  testEnvironment: "jest-environment-jsdom",
  transform: { "^.+\\.tsx?$": ["ts-jest", { tsconfig: { jsx: "react-jsx" } }] },
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/$1" },
  setupFilesAfterEnv: ["@testing-library/jest-dom"],
};
module.exports = config;
