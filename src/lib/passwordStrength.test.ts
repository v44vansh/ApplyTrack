import { getPasswordStrength } from './passwordStrength'

describe('password strength feedback', () => {
  it('marks short passwords as weak', () => {
    expect(getPasswordStrength('hello').label).toBe('Weak')
  })

  it('recognizes a password with mixed character types as strong', () => {
    expect(getPasswordStrength('ApplyTrack9!').label).toBe('Strong')
  })

  it('keeps the middle state useful while a password is being completed', () => {
    expect(getPasswordStrength('applytrack9').label).toBe('Getting there')
  })
})
