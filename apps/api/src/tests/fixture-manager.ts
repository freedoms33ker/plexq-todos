export type CleanupThunk = () => Promise<void>

export interface Fixture<T extends { id: string }> {
  value: T
  cleanupThunk: CleanupThunk
}

// Ported from plexq-ai-resources code-examples/typescript/src/tests/fixture-manager.ts.
// Each fixture removes exactly the row it created, by id. Teardown never touches rows a test did not create.
export class FixtureManager {
  fixtures: Fixture<{ id: string }>[] = []

  register = <T extends { id: string }>(fixture: Fixture<T>): T => {
    this.fixtures.push(fixture)
    return fixture.value
  }

  // LIFO so later rows that might reference earlier ones go first. Best-effort: one failure doesn't stop the rest.
  cleanUp = async (): Promise<void> => {
    await this.fixtures
      .reverse()
      .reduce<Promise<void>>(
        (chain, fixture) =>
          chain.then(() => fixture.cleanupThunk().catch((error: unknown) => reportCleanupFailure(fixture.value.id, error))),
        Promise.resolve()
      )
    this.fixtures = []
  }
}

const reportCleanupFailure = (id: string, error: unknown): void => {
  process.stderr.write(`Failed to clean up fixture ${id}: ${String(error)}\n`)
}
