import { spawnSync } from "node:child_process"
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { type Mutation, mutations } from "./mutations.ts"

// Definition-only counterexample audit (plexq tests.md → "Test-result claims"): each check must PASS on the real
// code and FAIL once the behavior it guards is deliberately broken. Runs in a throwaway copy of the repo.

interface CheckResult {
  mutation: string
  story: string
  baselineExit: number
  mutatedExit: number
  proven: boolean
}

const repoRoot = resolve(import.meta.dirname, "..")
const storyFilter = process.argv.find(arg => arg.startsWith("--story="))?.split("=")[1]

const main = (): void => {
  const workdir = copyRepository()
  const selected = mutations.filter(mutation => storyFilter === undefined || mutation.story === storyFilter)
  const results = selected.map(mutation => checkMutation(workdir, mutation))
  rmSync(workdir, { recursive: true, force: true })
  process.stdout.write(`${results.map(formatResult).join("\n")}\n${summarize(results)}\n`)
  process.exitCode = results.length > 0 && results.every(result => result.proven) ? 0 : 1
}

const copyRepository = (): string => {
  const workdir = mkdtempSync(join(tmpdir(), "todo-counterexamples-"))
  cpSync(repoRoot, workdir, {
    recursive: true,
    verbatimSymlinks: true,
    filter: source => !/[/\\](\.git|\.turbo|test-results|playwright-report)$/.test(source)
  })
  return workdir
}

const checkMutation = (workdir: string, mutation: Mutation): CheckResult => {
  const file = join(workdir, mutation.file)
  const original = readFileSync(file, "utf8")
  if (!original.includes(mutation.find)) {
    throw new Error(`Mutation ${mutation.name}: pattern not found in ${mutation.file}`)
  } else {
    const baselineExit = run(workdir, mutation.command)
    writeFileSync(file, original.replace(mutation.find, mutation.replace))
    const mutatedExit = run(workdir, mutation.command)
    writeFileSync(file, original)
    return { mutation: mutation.name, story: mutation.story, baselineExit, mutatedExit, proven: baselineExit === 0 && mutatedExit !== 0 }
  }
}

const run = (cwd: string, command: string): number => spawnSync(command, { cwd, shell: true, stdio: "ignore" }).status ?? 1

const summarize = (results: ReadonlyArray<CheckResult>): string =>
  `${results.filter(result => result.proven).length}/${results.length} counterexamples proven${storyFilter === undefined ? "" : ` for ${storyFilter}`}`

const formatResult = (result: CheckResult): string =>
  `${result.proven ? "PROVEN " : "FAILED "} [${result.story}] ${result.mutation} (baseline exit ${result.baselineExit}, mutated exit ${result.mutatedExit})`

main()
