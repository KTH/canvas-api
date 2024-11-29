import type { JestConfigWithTsJest } from "ts-jest";

const config: JestConfigWithTsJest = {
  testEnvironment: "node",
  setupFiles: ["dotenv/config"],
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
};

export default config;
