/**
 * @deepseek-ai/dsh-quran-bundle — the Quran Harness bundle's runtime glue is
 * intentionally empty: everything the bundle ships lives in the declarative
 * `cordis.patch.yml` (Quran tools wiring + the `quran` agent preset) declared
 * by the `dsh.bundle.patch` manifest field. The empty apply keeps the package
 * a valid workspace build member.
 */

/** Host plugin body — declarative bundle, no runtime glue. */
export function apply(): void {}
