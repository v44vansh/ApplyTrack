import { getShortcutModifier } from './shortcuts'

describe('device shortcut labels', () => {
  it('uses the command symbol on Apple devices', () => {
    expect(getShortcutModifier('MacIntel', 'Mozilla/5.0 (Macintosh)')).toBe('⌘')
  })

  it('uses Ctrl on Windows devices', () => {
    expect(getShortcutModifier('Win32', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('Ctrl')
  })
})
