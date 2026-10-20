export function isMacPlatform(platform?: string, userAgent?: string) {
  const value = `${platform ?? ''} ${userAgent ?? ''}`
  return /Mac|iPhone|iPad|iPod/i.test(value)
}

export function getShortcutModifier(platform?: string, userAgent?: string) {
  if (platform === undefined && userAgent === undefined && typeof navigator !== 'undefined') {
    return isMacPlatform(navigator.platform, navigator.userAgent) ? '⌘' : 'Ctrl'
  }
  return isMacPlatform(platform, userAgent) ? '⌘' : 'Ctrl'
}
