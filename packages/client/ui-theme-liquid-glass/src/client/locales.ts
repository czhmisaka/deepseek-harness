/** Typed locale dictionaries for the liquid glass settings page. */

export type LiquidGlassLocaleKey =
  | 'nav'
  | 'page.title'
  | 'page.intro'
  | 'enable.title'
  | 'enable.description'
  | 'enable.on'
  | 'enable.off'
  | 'seaTheme.title'
  | 'seaTheme.dark'
  | 'seaTheme.light'
  | 'speed.title'
  | 'colorWave.title'
  | 'opacity.title'
  | 'blur.title'
  | 'blur.hint'

export const en: Record<LiquidGlassLocaleKey, string> = {
  nav: 'Liquid Glass',
  'page.title': 'Liquid Glass',
  'page.intro': 'Translucent frosted surfaces with backdrop blur over a live sea background. Changes apply immediately.',
  'enable.title': 'Enable liquid glass',
  'enable.description': 'Glass panes, wallpaper, and blur effects across the whole interface.',
  'enable.on': 'On',
  'enable.off': 'Off',
  'seaTheme.title': 'Sea palette',
  'seaTheme.dark': 'Dark violet',
  'seaTheme.light': 'Warm orange',
  'speed.title': 'Band flow speed',
  'colorWave.title': 'Color wave',
  'opacity.title': 'Wallpaper opacity',
  'blur.title': 'Glass blur strength',
  'blur.hint': 'Applies to the sidebar, dialogs, overlays, and cards.',
}

export const zh: Record<LiquidGlassLocaleKey, string> = {
  nav: '液态玻璃',
  'page.title': '液态玻璃',
  'page.intro': '半透明磨砂表面与背景模糊,铺在流动的海面背景上,修改立即生效。',
  'enable.title': '启用液态玻璃',
  'enable.description': '全局玻璃面板、壁纸与模糊效果。',
  'enable.on': '开',
  'enable.off': '关',
  'seaTheme.title': '海面配色',
  'seaTheme.dark': '暗紫',
  'seaTheme.light': '暖橙',
  'speed.title': '色带流速',
  'colorWave.title': '色彩波动',
  'opacity.title': '壁纸不透明度',
  'blur.title': '玻璃模糊强度',
  'blur.hint': '作用于侧栏、对话框、浮层与卡片。',
}
