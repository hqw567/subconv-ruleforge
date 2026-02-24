# subconverter 配置合集（Clash）

这个仓库用于维护 https://github.com/tindy2013/subconverter 的远程配置（`config` 传入的 `.ini`）以及少量自定义规则列表（`.list`）。
目标是把机场订阅一键转换为 Clash 配置，并生成常用策略组（代理/国内/AI/广告等）。

## 包含内容

- `v1/config/*.ini`：subconverter 远程配置模板（规则生成器 + 策略组）
- `v1/rules/*.list`：被模板引用的自定义规则补充

## 配置模板（.ini）

- `v1/config/mini.ini`：精简版（代理/国内/AI/未知），带自动测速与地区分组
- `v1/config/mini-ad.ini`：在 `mini.ini` 基础上增加 `🛑 广告` 分流
- `v1/config/global-ad.ini`：区分 `✈️ 国外` 与 `🇨🇳 国内`，并包含广告分流

## 规则列表（.list）

- `v1/rules/proxy.list`：需要走代理/国外的域名补充
- `v1/rules/china.list`：希望直连/国内的域名补充
- `v1/rules/ai.list`：AI/相关站点域名补充（用于 `💬 AI` / `🤖 AI` 分组）
- `v1/rules/ad.list`：广告规则补充（当前为空，可自行维护）

## 使用方法（subconverter）

1) 先准备一个可用的 subconverter 服务（本地自建或你正在使用的实例）。

2) 生成转换链接：把 `url` 换成你的订阅地址，把 `config` 换成下面任意一个 `.ini` 的 Raw 地址。

接口格式（本地默认端口通常为 25500）：

```text
http://127.0.0.1:25500/sub?target=clash&url=%URL%&config=%CONFIG%
```

- `%URL%`：你的订阅地址（先做 URL Encode；多个订阅可用 `|` 拼接后再编码）
- `%CONFIG%`：外部配置文件地址/路径（可选；同样建议先做 URL Encode）

常用 `config`：

```text
https://raw.githubusercontent.com/hqw567/subconv-ruleforge/main/v1/config/mini.ini
https://raw.githubusercontent.com/hqw567/subconv-ruleforge/main/v1/config/mini-ad.ini
https://raw.githubusercontent.com/hqw567/subconv-ruleforge/main/v1/config/global-ad.ini
```

3) 把生成的转换链接作为订阅地址导入 Clash 客户端（Clash Verge / Clash for Windows / Mihomo Party 等），更新订阅即可。

提示：subconverter 的 `url` / `config` 参数官方建议先做 URL Encode（例如使用 https://www.urlencoder.org/）。不同部署还可能支持额外参数，请以你实际部署/前端页面支持为准。

## 自定义方式（推荐 Fork）

1) Fork 本仓库
2) 修改 `config/v1/generator.yaml` 中的 `rules`、`externalUrls` 与 `profiles`，然后执行生成命令
3) 如有需要，再调整 `src/generator/profiles.ts`（复杂规则拼装）
4) 在 subconverter 转换链接里把 `config=` 指向你 Fork 后仓库的 Raw 地址

## 自动化生成（Node 24 + TypeScript + ESM）

为避免手工维护多个 `.ini` 的重复内容，当前项目已改为由 TypeScript + YAML 生成。

`v1/config/*.ini` 与 `v1/rules/*.list` 均为生成产物，建议只修改 `config/v1/generator.yaml` 与生成逻辑，不直接手改生成文件。

- 运行环境：`Node.js v24+`
- 模块体系：原生 `ESM`（`"type": "module"`）
- 构建工具：`tsdown`（基于 rolldown）

主要目录：

- `config/v1/generator.yaml`：可读性更高的配置源（规则文件 + URL + 模板矩阵）
- `src/generator/config.ts`：YAML 加载与结构校验
- `src/generator/model.ts`：INI 渲染模型与基础拼装函数
- `src/generator/profiles.ts`：模板拼装逻辑（按 YAML 定义生成 3 个配置）
- `src/generator/write.ts`：生成/校验写入逻辑
- `src/scripts/generate.ts`：CLI 入口（`generate` / `--check`）
- `test/generator.test.ts`：生成一致性测试

常用命令：

```bash
pnpm install
pnpm run generate          # 生成并覆盖 v1/config/*.ini 与 v1/rules/*.list
pnpm run check:generated   # 校验所有生成文件是否与生成器一致
pnpm run typecheck         # TypeScript 类型检查
pnpm run test              # 运行生成器测试
pnpm run build             # 使用 tsdown 构建 dist
pnpm run verify            # 一次性执行 generate/check/typecheck/test
```

说明：开发期直接使用 Node 24 原生执行 TS（`--experimental-strip-types`），发布/分发可通过 `tsdown` 输出 `dist/`。

## 说明与致谢

- 本仓库的 `.ini` 会引用多方维护的公共规则（如 ACL4SSR、blackmatrix7、Sukka/skk、AWAvenue 等），规则优先级以 `.ini` 中 `ruleset` 的顺序为准。
- 相关项目/规则来源：
  - https://github.com/tindy2013/subconverter
  - https://github.com/ACL4SSR/ACL4SSR
  - https://github.com/blackmatrix7/ios_rule_script
  - https://ruleset.skk.moe/
  - https://github.com/TG-Twilight/AWAvenue-Ads-Rule
