// Test stub for the `server-only` marker package. In production Next aliases
// `server-only` to an empty module inside RSC bundles and to a throwing module
// elsewhere; under Vitest we always want the empty behavior.
export {};
