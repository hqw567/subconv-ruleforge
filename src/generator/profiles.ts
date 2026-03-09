import { type GeneratorConfig, resolveCustomRuleUrl, resolveExternalUrl } from './config.ts'
import { type IniProfile, rule, selectGroup, urlTestGroup } from './model.ts'

const MINI_REGION_CORE = {
  hk: '(港|HK|hk|Hong Kong|HongKong|hongkong|🇭🇰)',
  jp: '(日本|川日|东京|大阪|泉日|埼玉|沪日|深日|JP|Japan|🇯🇵)',
  kr: '(KR|Korea|KOR|首尔|韩|韓|🇰🇷)',
  sg: '(新加坡|坡|狮城|SG|Singapore|🇸🇬)',
  tw: '(台|新北|彰化|TW|Tai Wan|TaiWan|Taiwan|🇹🇼)',
  us: '(美|纽约|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|硅谷|拉斯维加斯|洛杉矶|圣何塞|圣克拉拉|西雅图|芝加哥|US|United States|🇺🇲)',
} as const

// 提取括号内的内容，拼接成 other 的负向前瞻
function buildOtherPattern(core: Record<string, string>): string {
  const inner = Object.values(core)
    .map((p) => p.slice(1, -1)) // 去掉首尾括号
    .join('|')
  return `(^(?!.*(${inner})).*)`
}

const MINI_REGION_PATTERN = {
  ...MINI_REGION_CORE,
  other: buildOtherPattern(MINI_REGION_CORE),
} as const

interface ProfileBuilderContext {
  customRuleUrl: (key: string) => string
  externalUrl: (key: string) => string
}

function buildMiniRules(context: ProfileBuilderContext, includeAd: boolean, includeForeign: boolean): string[] {
  const { customRuleUrl, externalUrl } = context
  const rules: string[] = [rule('DIRECT', externalUrl('lan')), '']

  rules.push(rule(includeForeign ? '✈️ 国外' : '🌍 代理', customRuleUrl('proxy')))
  rules.push(rule('🇨🇳 国内', customRuleUrl('china')))
  rules.push(rule('🤖 AI', customRuleUrl('ai')))
  rules.push('')

  if (includeAd) {
    rules.push(rule('🛑 广告', customRuleUrl('ad')))
    rules.push(rule('🛑 广告', externalUrl('awaClassic')))
    rules.push('')
  }

  rules.push(rule('🤖 AI', externalUrl('aiSkk')))
  rules.push('')
  rules.push(rule('🇨🇳 国内', externalUrl('steamCn')))
  // rules.push(rule('🇨🇳 国内', externalUrl('googleCn')))
  rules.push(rule('🇨🇳 国内', externalUrl('appleCn')))
  // rules.push(rule('🇨🇳 国内', externalUrl('chinaDomain')))
  rules.push(rule('🇨🇳 国内', externalUrl('chinaCompanyIp')))
  rules.push(rule('🇨🇳 国内', externalUrl('download')))
  rules.push(rule('🇨🇳 国内', externalUrl('directSkk')))
  rules.push(rule('🇨🇳 国内', externalUrl('gameDownload')))
  rules.push(rule('🇨🇳 国内', externalUrl('domesticSkk')))
  rules.push(rule('🇨🇳 国内', '[]GEOIP,CN'))

  if (includeForeign) {
    rules.push('')
    rules.push(rule('✈️ 国外', externalUrl('proxyGfw')))
  }

  rules.push('')
  rules.push(rule('❓ 未知', '[]FINAL'))
  return rules
}

function buildMiniProxyGroups(includeAd: boolean, includeForeign: boolean): string[] {
  const proxyBase = [
    '[]⚡ 自动',
    '[]🎯 手动',
    '[]🇭🇰 香港',
    '[]🇹🇼 台湾',
    '[]🇯🇵 日本',
    '[]🇸🇬 新加坡',
    '[]🇰🇷 韩国',
    '[]🇺🇲 美国',
    '[]其他国家',
    '[]DIRECT',
  ] as const

  const groups: string[] = [
    selectGroup('🌍 代理', ...proxyBase),
    'custom_proxy_group=🎯 手动`select`.*`[]DIRECT',
    urlTestGroup('⚡ 自动', '.*', '300,,150'),
  ]

  if (includeForeign) {
    groups.push(selectGroup('✈️ 国外', '[]🌍 代理', ...proxyBase))
  }

  groups.push(selectGroup('🤖 AI', '[]🌍 代理', ...proxyBase))

  if (includeForeign) {
    groups.push(selectGroup('❓ 未知', '[]DIRECT', '[]🌍 代理', ...proxyBase.slice(0, -1)))
  } else {
    groups.push(selectGroup('❓ 未知', '[]🌍 代理', ...proxyBase))
  }

  if (includeAd) {
    groups.push(selectGroup('🛑 广告', '[]REJECT', '[]DIRECT', '[]🌍 代理'))
  }

  groups.push(
    selectGroup(
      '🇨🇳 国内',
      '[]DIRECT',
      '[]🌍 代理',
      '[]⚡ 自动',
      '[]🎯 手动',
      '[]🇭🇰 香港',
      '[]🇹🇼 台湾',
      '[]🇯🇵 日本',
      '[]🇸🇬 新加坡',
      '[]🇰🇷 韩国',
      '[]🇺🇲 美国',
      '[]其他国家',
    ),
  )

  return groups
}

const MINI_NODE_GROUPS = [
  urlTestGroup('🇭🇰 香港', MINI_REGION_PATTERN.hk, '300,,150'),
  urlTestGroup('🇺🇲 美国', MINI_REGION_PATTERN.us, '300,,150'),
  urlTestGroup('🇯🇵 日本', MINI_REGION_PATTERN.jp, '300,,150'),
  urlTestGroup('🇸🇬 新加坡', MINI_REGION_PATTERN.sg, '300,,150'),
  urlTestGroup('🇹🇼 台湾', MINI_REGION_PATTERN.tw, '300,,150'),
  urlTestGroup('🇰🇷 韩国', MINI_REGION_PATTERN.kr, '300,,150'),
  urlTestGroup('其他国家', MINI_REGION_PATTERN.other, '300,,150'),
] as const

export function buildProfiles(config: GeneratorConfig): readonly IniProfile[] {
  const context: ProfileBuilderContext = {
    customRuleUrl: (key: string) => resolveCustomRuleUrl(config, key),
    externalUrl: (key: string) => resolveExternalUrl(config, key),
  }

  return config.profiles.map((definition) => {
    const includeAd = definition.includeAd === true
    const includeForeign = definition.includeForeign === true

    return {
      fileName: definition.fileName,
      nodeGroups: MINI_NODE_GROUPS,
      proxyGroups: buildMiniProxyGroups(includeAd, includeForeign),
      rulesets: buildMiniRules(context, includeAd, includeForeign),
    }
  })
}
