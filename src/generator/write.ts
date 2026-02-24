import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { buildArtifacts } from './artifacts.ts'
import { loadGeneratorConfig } from './config.ts'

export interface GenerateResult {
  written: string[]
  unchanged: string[]
}

function projectRootFrom(callerFile: string): string {
  const dir = path.dirname(callerFile)
  return path.resolve(dir, '..', '..')
}

export async function generateAll(callerFile: string, checkOnly: boolean): Promise<GenerateResult> {
  const root = projectRootFrom(callerFile)
  const config = loadGeneratorConfig(root)
  const artifacts = buildArtifacts(config)
  const result: GenerateResult = { unchanged: [], written: [] }

  for (const artifact of artifacts) {
    const targetFile = path.join(root, artifact.fileName)

    let current = ''
    try {
      current = await readFile(targetFile, 'utf8')
    } catch {
      current = ''
    }

    if (current === artifact.content) {
      result.unchanged.push(artifact.fileName)
      continue
    }

    if (checkOnly) {
      throw new Error(`Outdated generated file: ${artifact.fileName}. Run "pnpm run generate".`)
    }

    await mkdir(path.dirname(targetFile), { recursive: true })
    await writeFile(targetFile, artifact.content, 'utf8')
    result.written.push(artifact.fileName)
  }

  return result
}
