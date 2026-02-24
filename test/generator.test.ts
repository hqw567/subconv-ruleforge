import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { buildArtifacts } from '../src/generator/artifacts.ts'
import { loadGeneratorConfig } from '../src/generator/config.ts'
import { buildProfiles } from '../src/generator/profiles.ts'

const currentFile = fileURLToPath(import.meta.url)
const root = path.resolve(path.dirname(currentFile), '..')
const config = loadGeneratorConfig(root)
const profiles = buildProfiles(config)
const artifacts = buildArtifacts(config)

test('generated file names are unique', () => {
  const names = artifacts.map((artifact) => artifact.fileName)
  const unique = new Set(names)
  assert.equal(unique.size, names.length)
})

test('all generated file names are lowercase', () => {
  for (const artifact of artifacts) {
    assert.equal(artifact.fileName, artifact.fileName.toLowerCase())
  }
})

test('all generated INI files have required flags', () => {
  for (const profile of profiles) {
    const artifact = artifacts.find((item) => item.fileName === profile.fileName)
    assert.ok(artifact)
    const text = artifact.content
    assert.match(text, /enable_rule_generator=true/)
    assert.match(text, /overwrite_original_rules=true/)
  }
})

test('generated list files use DOMAIN-SUFFIX without comments', () => {
  const listArtifacts = artifacts.filter((artifact) => artifact.kind === 'list')

  for (const artifact of listArtifacts) {
    const lines = artifact.content.split('\n').filter((line) => line.length > 0)
    for (const line of lines) {
      assert.match(line, /^DOMAIN-SUFFIX,[^,#\s][^,#]*$/)
      assert.equal(line.includes('#'), false)
    }
  }
})

test('repo generated files match generator output', async () => {
  for (const artifact of artifacts) {
    const fullPath = path.join(root, artifact.fileName)
    const disk = await readFile(fullPath, 'utf8')
    assert.equal(disk, artifact.content, `Mismatch in ${artifact.fileName}`)
  }
})
