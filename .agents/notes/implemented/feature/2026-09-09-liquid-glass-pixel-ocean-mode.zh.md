# Agent Note: Pixel ocean mode

Status: implemented

## 问题

海面此前只有两条曲线：数据海（zeabur）与吉卜力波浪。老大要一个像素海洋模式——同一片活的海，渲染成复古像素画的质感，并且必须保住数字海的定义性卖点：重叠的浏览器窗口看到同一屏幕位置上完全相同的水。

## 决策

缓冲分辨率的路子不走：缩小画布 backing 再放大，像素网格会锚定到每个窗口自己的 device ratio 和视口原点上，跨窗口连续性直接碎掉。像素化放在 `ui-theme-liquid-glass` 内嵌 shader 里，用海面本就锚定的坐标系：

- `FRAG_ZEABUR` 新增 `uniform float uPixel`；为 1 时把采样 uv 吸附到屏幕锚定海洋上的 72×72 格，海面、色带、字符雨全部按格取平色；
- 最终色做每通道 6 级 posterize，得到有限调色板的观感；
- `uPixel` 注册进 `Z_NAMES`，每帧由 `activeStyle === "pixel"` 推送；`setStyle("pixel")` 路由到 zeabur 程序——ghibli 程序不动，保住三程序预编译降级结构。

接线只是加宽既有词汇：`seaStyle: 'zeabur' | 'ghibli' | 'pixel'`，设置页海面风格卡新增第五档「像素海洋」（`setMany({ seaStyle: 'pixel', seaTheme: 'dark' })`），每个词典各一条 key。Host 半的 `seaStyle` 本就是 `z.string()`——无迁移。

## 考虑过的替代方案

- **为什么不用低分辨率 backing store？** 像素观感免费拿到，但网格原点按窗口生成（dpr × 视口偏移）——相邻窗口在接缝处像素对不上。为不破坏插件卖出的一致性保证而否决。
- **单独的像素 fragment shader 程序？** 为一个 uniform 复制整份 zeabur shader，还要加第四条编译降级路径。用 uniform 保持一个程序、一条降级链。
- **调色板量化 + 有序抖动？** 抖动和按格平色逐像素互相打架。等实机效果说话再决定。

## 后果

- 像素网格跨窗口对齐（基于 uv 吸附），混合密度显示屏也成立；代价是像素块的物理尺寸跟随海面缩放——有意为之。
- 两行 GLSL 加一个 uniform；承载扩展不需要新的降级路径，风格词汇表直接吸收。
