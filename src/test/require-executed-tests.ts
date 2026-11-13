import type { Reporter } from "vitest/reporters";

export default class RequireExecutedTests implements Reporter {
  onTestRunEnd: NonNullable<Reporter["onTestRunEnd"]> = (modules) => {
    const tests = modules.flatMap((module) => [...module.children.allTests()]);
    if (
      !tests.some((test) => ["passed", "failed"].includes(test.result().state))
    ) {
      throw new Error("No tests executed; check the test name or file filter.");
    }
  };
}
