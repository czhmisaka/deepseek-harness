---
description: "液态玻璃主题:以可选主题注册的半透明磨砂表面、背景模糊与高光描边,附设置开关。"
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-theme-liquid-glass

[English](README.md) | 中文

## 概述

`@deepseek-ai/dsh-client-ui-theme-liquid-glass` 注册 **liquid-glass** 主题:半透明磨砂表面、侧栏/对话框/浮动面板的背景模糊、渐变壁纸底,以及高光描边——全部走标准主题契约。它通过 `ctx.theme.register` 注册 `ThemeDefinition`(id `liquid-glass`,深色底,别名令牌覆盖),用随主题联动的 `body[data-ds-glass]` 属性圈定结构性效果的作用域,并在设置的通用页提供开关行。

## 目录

- [使用本包](#use-this-package)
- [理解实现](#understand-the-implementation)
- [模型体验](#model-experience)
- [已知限制与延期工作](#known-limitations-and-deferred-work)
- [开发备注](#dev-note)

-----

<a id="use-this-package"></a>
## 使用本包

把本插件挂到 Web 组合中 `ui-theme` 旁;随附的 `dsh-web-app` bundle 已挂载。从 **设置 → 通用 → 液态玻璃** 开关。

### 组合

```yaml
- name: '@deepseek-ai/dsh-client-ui-theme'
- name: '@deepseek-ai/dsh-client-ui-theme-liquid-glass'
```

### 主题行为

- 主题构建在**深色基础调色板**上(`colorScheme: 'dark'`):玻璃面板为暗色底上的亮面。
- 13 个别名令牌(背景、边框、文字、品牌、状态、侧栏填充)覆盖为半透明值;各功能无需改动即自动生效。
- 结构性效果(壁纸渐变、`backdrop-filter` 模糊、高光 `box-shadow` 描边)位于作用域为 `body[data-ds-glass]` 的样式表——该属性在本主题活跃时设置、切到其他主题时移除。
- 开关选择持久化在 `localStorage` 并在挂载时恢复;`ThemeRuntime` 只对内置偏好做持久化,第三方主题在此保留自己的会话级持久化。

### 前提

玻璃需要面板后有可折射的内容——壁纸渐变提供它。在不支持 `backdrop-filter` 的引擎上,表面退化为半透明令牌填充(在深色底上依然可读)。

-----

<a id="understand-the-implementation"></a>
## 理解实现

<details>
<summary>实现细节——点击展开</summary>

### 源码地图

| 文件 | 职责 |
|---|---|
| [`src/client/index.ts`](src/client/index.ts) | 主题注册、玻璃作用域属性、样式表注入、开关行 |
| [`src/client/tokens.ts`](src/client/tokens.ts) | 别名令牌覆盖 |
| [`src/client/glass.css`](src/client/glass.css) | 结构性玻璃效果(`body[data-ds-glass]` 作用域) |
| [`src/client/GlassRow.tsx`](src/client/GlassRow.tsx) | 设置开关行 |

### 选择器策略

功能组件使用哈希类名的 CSS Modules,全局样式表无法直接选中。玻璃样式表因此只锚定**结构性锚点**:布局列的类名前缀(`_sidebarCol_`、`_centerCol_`、`_detailsCol_`)、shell 浮层的 `data-shell-overlay` 属性、原生 `dialog` 元素,以及通用的 `_card_`/`_panel_` 模块前缀。布局外壳改类名时需同步更新此处前缀。

</details>

-----

<a id="model-experience"></a>
## 模型体验

### token 与 KV Cache 影响

#### 模型看到什么

什么都不看到。主题只改变呈现:注册一个 `ThemeDefinition` 并设置一个 body 属性;不贡献任何提示段、工具、消息或会话事件。

#### token 影响

无。主题不发起任何模型请求;所有数字都来自适配器已上报的 `TokenUsage`。

#### KV Cache 影响

无。主题不贡献请求内容,缓存身份不变。

## 已知限制与延期工作

<a id="known-limitations-and-deferred-work"></a>


这些限制定义主题的边界与未来工作的起点。它们是当前包约束,不是主题方法的比较或任务清单。

- **仅深色底** — 主题声明 `colorScheme: 'dark'`;浅色玻璃变体需要自己的令牌集,已延期。
- **主题选择是会话级持久** — `ThemeRuntime` 只持久化内置偏好,选择按浏览器从 `localStorage` 恢复。
- **结构选择器与布局类名前缀耦合** — 布局外壳类名重命名(如 `_sidebarCol_`)需同步更新玻璃样式表中的前缀。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者工作上下文——点击展开</summary>

此开发备注为非权威工作语境:维护者备注与开放问题。已交付行为与已接受的理由见上文各节、包代码与链接的 Agent Note。

- 玻璃样式表由本插件注入(而非加入 `ui-theme/src/styles/`),使效果的生命周期与主题注册严格一致,且基础主题包不携带主题专属的结构。

</details>
