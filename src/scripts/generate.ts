import { fileURLToPath } from 'node:url'

import { generateAll } from '../generator/write.ts'

const argv = new Set(process.argv.slice(2))
const checkOnly = argv.has('--check')

async function main(): Promise<void> {
  const currentFile = fileURLToPath(import.meta.url)
  const result = await generateAll(currentFile, checkOnly)

  if (checkOnly) {
    const all = [...result.unchanged].sort()
    process.stdout.write(`Generated files are up-to-date (${all.length}).\n`)
    return
  }

  const changed = [...result.written].sort()
  const unchanged = [...result.unchanged].sort()
  process.stdout.write(`Generated ${changed.length} file(s): ${changed.join(', ') || 'none'}\n`)
  process.stdout.write(`Unchanged ${unchanged.length} file(s): ${unchanged.join(', ') || 'none'}\n`)
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  process.stderr.write(`${message}\n`)
  process.exitCode = 1
})
