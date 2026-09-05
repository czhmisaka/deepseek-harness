/** Typed locale dictionaries for the liquid glass toggle row. */

export type LiquidGlassLocaleKey =
  | 'row.title'
  | 'row.description'
  | 'row.enable'
  | 'row.disable'
  | 'row.enabledState'

export const en: Record<LiquidGlassLocaleKey, string> = {
  'row.title': 'Liquid Glass',
  'row.description': 'Translucent frosted surfaces with backdrop blur over a gradient wallpaper.',
  'row.enable': 'Enable',
  'row.disable': 'Disable',
  'row.enabledState': 'On',
}

export const zh: Record<LiquidGlassLocaleKey, string> = {
  'row.title': '液态玻璃',
  'row.description': '半透明磨砂表面与背景模糊,铺在渐变壁纸上。',
  'row.enable': '开启',
  'row.disable': '关闭',
  'row.enabledState': '已开启',
}
