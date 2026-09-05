# Agent Note: 跨会话持久 token 用量账本

Status: implemented

[English](2026-09-04-usage-ledger.md) | 中文

## 问题

harness 一直缺少对"DSH 一共用了多少 token"的持久回答。适配器已把用量归一化为 `TokenUsage`，`assistant/message` 事件也随事件落盘，`dsh-token-meter` 更是按会话折叠出 `tokenUsage` 投影——但这些都是单会话口径：没有任何东西跨会话累积，想知道一个部署的总花费只能手工扫描所有会话日志。Web 统计条也只数单会话的输出 token,且不存在任何面向整个部署记账的可视化面。

## 决策

`packages/llm/usage-ledger` 是一个服务类插件，挂载在 `dsh-base` 中，为每个 harness home 维护一份只追加的 JSONL 账本文件（默认 `dshHomePath('usage', 'usage.jsonl')`）。它在插件根上下文订阅 `session/event` firehose，因此进程观察到的所有活跃会话——主会话、subagent、workflow——都会贡献记录；每条带用量上报的 `assistant/message` 事件写入一行带版本戳的 JSON 记录，路由直接取自消息的 `source.provider`/`source.model`，无需折叠 request/header 状态。被中断的消息也计入——已交付的前缀同样计费。

"实时"的实现方式：追加链在事件提交的那一刻启动，写入走一条串行 promise 链（保持顺序，写失败记日志并被包容），被等待的 `session/flush` 持久检查点会排空这条链，因此账本丢失的记录恰好是崩溃同样会从会话日志丢掉的记录——两个持久面在构造上保持一致。销毁（disposal）时先排空再关闭句柄。

总量永远推导、绝不落检查点：`totals()` 先 stat 文件，大小或 mtime 相对上次折叠发生变化就重新整折——这保证了多个进程共享一个 harness home 时的正确性，无需任何协调：另一个 profile 的追加会改变文件身份，下一次折叠自然看到。桶合计按 `input + cacheRead + cacheWrite + output` 推导，与 `dsh-token-meter` 折叠的计费总量约定一致，两个记账面因此天然一致。

`/usage` 命令是命令能力面的消费方：通过 `ctx.inject(['commands'], ...)` 注册（plan-mode 的子上下文模式），渲染全量数字、当日（UTC）数字和前五条路由。记录刻意不携带任何消息内容——账本是记账面，不是转录，因此不需要脱敏规则。

Web 仪表盘（`packages/client/ui-usage`）是可视化面：一个 `settings.section` 条目，从新的 `usage` Typert Remote 命名空间（`ctx.remote.usage.totals()`，经 `api-remotes` 程序集挂载）渲染总量网格、当日数字、七天趋势图与路由表。页面在挂载与刷新时取数而非实时订阅：账本随每次模型调用变化，实时计数器会在无关流量上反复重渲染面板。紧凑数字格式在命令文本与仪表盘之间逐字共用，两个口径读起来一样。

## 备选方案

**按会话投影再求和。** 否决：投影折叠活跃会话、其缓存服务于会话列表列；全量合计需要扫描每个会话的日志或投影行，冷会话会从内存合计中掉队。全局 firehose 监听器每条计费事件只追加一条记录，完全没有按会话状态。

**做成 session-telemetry 的后端。** 否决：telemetry 缝面向外发报告，带共享披露与脱敏规则，且部署只挂一个后端；本地记账文件既不外发也不需要披露，耦合进去只会让默认挂载的记账功能背上遥测姿态。

**走 storage 栈用 SQLite。** v1 否决：JSONL 对部署而言格式可读、跨进程追加安全（`O_APPEND` 行级原子）、且没有当前消费方需要的任何 schema 机制。

**启动时从既有会话日志回填。** 延期：resume 重放种子不经过 firehose，一次性扫描可以恢复安装前的用量，但首次启动要折叠全部历史日志，且会混淆安装前后两个口径。账本从安装时刻开始记账；此后的一切都在持久文件里。

**实时更新的仪表盘计数器。** 延期：账本随每次模型调用变化，实时面板会在所有打开的客户端上因无关流量反复重渲染。挂载加刷新匹配数据的节奏；有消费方提出需求时再做推送通道。

## 后果

- 所有基于 base 的 profile 默认记账；`path` 可重定向文件，`disabled: true` 的补丁行可整体退出。
- 一旦挂载，`/usage` 出现在所有具备命令面的界面（CLI 对话、Web 客户端），Web 客户端的设置面板中也会出现 **用量统计** 页；没有命令注册表的组合保留账本本身。
- JSONL 文件是用户可读的事实：每行一个 JSON 对象、带版本戳、不压缩、不轮转——部署体积随用量增长，折叠为 O(记录数)。
- 崩溃的写手可能撕坏最后一行；下次启动的折叠只跳过那一行。
- `packages/client` 下的客户端包用 `.client.` 后缀命名测试文件所属的编译面；不带后缀的普通 spec 会把 client 的 `api-remotes` 面拉进 Host 聚合并在那里构建失败（随仪表盘的 spec 一并落地）。
