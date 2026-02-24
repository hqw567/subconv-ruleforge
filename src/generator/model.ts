export interface IniProfile {
  fileName: string
  rulesets: readonly string[]
  proxyGroups: readonly string[]
  nodeGroups: readonly string[]
}

const TEST_URL = 'http://www.gstatic.com/generate_204'

export function rule(group: string, source: string): string {
  return `ruleset=${group},${source}`
}

export function selectGroup(name: string, ...items: readonly string[]): string {
  return `custom_proxy_group=${name}\`select\`${items.join('`')}`
}

export function urlTestGroup(name: string, pattern: string, interval: string): string {
  return `custom_proxy_group=${name}\`url-test\`${pattern}\`${TEST_URL}\`${interval}`
}

export function renderIni(profile: IniProfile): string {
  const lines: string[] = [
    ';1、域名组',
    ...profile.rulesets,
    '',
    ';2、策略组（域名组-节点组）',
    ...profile.proxyGroups,
    '',
    ';3、节点组',
    ...profile.nodeGroups,
    '',
    ';4、启用规则集',
    'enable_rule_generator=true',
    'overwrite_original_rules=true',
    '',
  ]

  return lines.join('\n')
}
