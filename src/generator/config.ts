import { readFileSync } from 'node:fs'
import path from 'node:path'

import { parse } from 'yaml'

export type ProfileTemplate = 'mini'

export interface OutputConfig {
  configDir: string
  rawBaseUrl: string
  rulesDir: string
}

export interface RuleFileDefinition {
  domains: string[]
  fileName: string
}

export interface ProfileDefinition {
  fileName: string
  template: ProfileTemplate
  includeAd?: boolean
  includeForeign?: boolean
}

export interface GeneratorConfig {
  output: OutputConfig
  ruleFiles: Record<string, RuleFileDefinition>
  externalUrls: Record<string, string>
  profiles: ProfileDefinition[]
}

function asRecord(value: unknown, name: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`Invalid ${name}: expected object`)
  }

  return value as Record<string, unknown>
}

function asBoolean(value: unknown, name: string): boolean | undefined {
  if (value === undefined) {
    return undefined
  }

  if (typeof value !== 'boolean') {
    throw new Error(`Invalid ${name}: expected boolean`)
  }

  return value
}

function asString(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Invalid ${name}: expected non-empty string`)
  }

  return value
}

function normalizeRawBaseUrl(value: string, name: string): string {
  const trimmed = value.trim()
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    throw new Error(`Invalid ${name}: expected http(s) url`)
  }

  return trimmed.replace(/\/+$/, '')
}

function normalizeRelativeDir(value: string, name: string): string {
  const normalized = value
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\/+|\/+$/g, '')

  if (normalized.length === 0) {
    throw new Error(`Invalid ${name}: directory cannot be empty`)
  }

  if (normalized !== normalized.toLowerCase()) {
    throw new Error(`Invalid ${name}: directory must be lowercase (${normalized})`)
  }

  return normalized
}

function ensureLowercaseBaseFileName(fileName: string, name: string, extension: '.ini' | '.list'): void {
  if (fileName !== fileName.toLowerCase()) {
    throw new Error(`Invalid ${name}: generated file names must be lowercase (${fileName})`)
  }

  if (!fileName.endsWith(extension)) {
    throw new Error(`Invalid ${name}: expected ${extension} file (${fileName})`)
  }

  if (fileName.includes('/') || fileName.includes('\\')) {
    throw new Error(`Invalid ${name}: must be base filename without directory (${fileName})`)
  }
}

function parseDomainArray(value: unknown, name: string): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid ${name}: expected string array`)
  }

  return value.map((item, index) => {
    if (typeof item !== 'string') {
      throw new Error(`Invalid ${name}[${index}]: expected string`)
    }

    const domain = item.trim()
    if (domain.length === 0) {
      throw new Error(`Invalid ${name}[${index}]: domain cannot be empty`)
    }

    if (domain.startsWith('#')) {
      throw new Error(`Invalid ${name}[${index}]: comments are not allowed, only domains`)
    }

    if (domain.includes(',')) {
      throw new Error(`Invalid ${name}[${index}]: include domain only, without rule prefix`)
    }

    return domain
  })
}

function resolveFilePath(dir: string, fileName: string): string {
  return `${dir}/${fileName}`
}

function parseOutput(value: unknown): OutputConfig {
  const input = asRecord(value, 'output')
  return {
    configDir: normalizeRelativeDir(asString(input.configDir, 'output.configDir'), 'output.configDir'),
    rawBaseUrl: normalizeRawBaseUrl(asString(input.rawBaseUrl, 'output.rawBaseUrl'), 'output.rawBaseUrl'),
    rulesDir: normalizeRelativeDir(asString(input.rulesDir, 'output.rulesDir'), 'output.rulesDir'),
  }
}

function parseRuleFiles(value: unknown, output: OutputConfig): Record<string, RuleFileDefinition> {
  const input = asRecord(value, 'rules')
  const result: Record<string, RuleFileDefinition> = {}

  for (const [ruleKey, definition] of Object.entries(input)) {
    const row = asRecord(definition, `rules.${ruleKey}`)
    const fileName = asString(row.file, `rules.${ruleKey}.file`)
    ensureLowercaseBaseFileName(fileName, `rules.${ruleKey}.file`, '.list')
    const domainsRaw = row.domains
    const domains = domainsRaw === undefined ? [] : parseDomainArray(domainsRaw, `rules.${ruleKey}.domains`)

    result[ruleKey] = {
      domains,
      fileName: resolveFilePath(output.rulesDir, fileName),
    }
  }

  return result
}

function parseExternalUrls(value: unknown): Record<string, string> {
  const input = asRecord(value, 'externalUrls')
  const urls: Record<string, string> = {}

  for (const [key, url] of Object.entries(input)) {
    urls[key] = asString(url, `externalUrls.${key}`)
  }

  return urls
}

function parseProfiles(value: unknown, output: OutputConfig): ProfileDefinition[] {
  if (!Array.isArray(value)) {
    throw new Error('Invalid profiles: expected array')
  }

  return value.map((item, index) => {
    const row = asRecord(item, `profiles[${index}]`)
    const fileName = asString(row.file, `profiles[${index}].file`)
    ensureLowercaseBaseFileName(fileName, `profiles[${index}].file`, '.ini')

    const template = row.template
    if (template !== 'mini') {
      throw new Error(`Invalid profiles[${index}].template: ${String(template)}`)
    }

    const includeAd = asBoolean(row.includeAd, `profiles[${index}].includeAd`)
    const includeForeign = asBoolean(row.includeForeign, `profiles[${index}].includeForeign`)

    const profile: ProfileDefinition = {
      fileName: resolveFilePath(output.configDir, fileName),
      template,
    }

    if (includeAd !== undefined) {
      profile.includeAd = includeAd
    }

    if (includeForeign !== undefined) {
      profile.includeForeign = includeForeign
    }

    return profile
  })
}

export function loadGeneratorConfig(rootDir: string): GeneratorConfig {
  const filePath = path.join(rootDir, 'config', 'v1', 'generator.yaml')
  const text = readFileSync(filePath, 'utf8')
  const parsed = asRecord(parse(text), 'generator.yaml')
  const output = parseOutput(parsed.output)

  return {
    externalUrls: parseExternalUrls(parsed.externalUrls),
    output,
    profiles: parseProfiles(parsed.profiles, output),
    ruleFiles: parseRuleFiles(parsed.rules, output),
  }
}

export function resolveExternalUrl(config: GeneratorConfig, key: string): string {
  const value = config.externalUrls[key]
  if (value === undefined) {
    throw new Error(`Missing required external URL key in YAML: ${key}`)
  }

  return value
}

export function resolveCustomRuleUrl(config: GeneratorConfig, key: string): string {
  const definition = config.ruleFiles[key]
  if (definition === undefined) {
    throw new Error(`Missing required rule file key in YAML: ${key}`)
  }

  return `${config.output.rawBaseUrl}/${definition.fileName}`
}
