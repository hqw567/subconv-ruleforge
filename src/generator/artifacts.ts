import type { GeneratorConfig } from './config.ts'
import { renderIni } from './model.ts'
import { buildProfiles } from './profiles.ts'

const RULE_PREFIX = 'DOMAIN-SUFFIX'

export interface GeneratedArtifact {
  content: string
  fileName: string
  kind: 'ini' | 'list'
}

function renderList(domains: readonly string[]): string {
  if (domains.length === 0) {
    return ''
  }

  const lines = domains.map((domain) => `${RULE_PREFIX},${domain}`)
  return `${lines.join('\n')}\n`
}

export function buildArtifacts(config: GeneratorConfig): readonly GeneratedArtifact[] {
  const iniArtifacts = buildProfiles(config).map((profile) => ({
    content: renderIni(profile),
    fileName: profile.fileName,
    kind: 'ini' as const,
  }))

  const ruleArtifacts = Object.values(config.ruleFiles).map((ruleFile) => ({
    content: renderList(ruleFile.domains),
    fileName: ruleFile.fileName,
    kind: 'list' as const,
  }))

  return [...iniArtifacts, ...ruleArtifacts].sort((a, b) => a.fileName.localeCompare(b.fileName))
}
