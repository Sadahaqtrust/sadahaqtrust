/**
 * Shared fast-check setup for property-based tests.
 *
 * Import this module in any *.pbt.test.ts file to get a pre-configured
 * fast-check instance with global settings applied:
 *
 *   import fc, { PBT_RUNS } from "@/lib/test/pbt-setup";
 *   // or (relative):
 *   import fc, { PBT_RUNS } from "../../lib/test/pbt-setup";
 *
 * Tag format for all tests:
 *   Feature: digital-rohtak-core-platform, Property {N}: {text}
 */
import fc from "fast-check";

// Minimum 100 runs per property as required by the spec.
export const PBT_RUNS = 100;

// Apply global fast-check settings once when this module is loaded.
fc.configureGlobal({
  numRuns: PBT_RUNS,
  // Verbose output on failure to aid debugging.
  verbose: false,
  // Use a random seed per run; pin seed in test for reproducibility.
  seed: undefined,
});

export { fc };
export default fc;
