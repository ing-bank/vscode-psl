import type { Config } from "@jest/types"

const config: Config.InitialOptions = {
  preset: "ts-jest",
  testEnvironment: "node",
  modulePathIgnorePatterns: ["<rootDir>/modules/*"],
  testPathIgnorePatterns: ["/__tests__/(files|utils)/"]
}

export default config
