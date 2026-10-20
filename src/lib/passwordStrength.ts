export type PasswordStrengthLevel = 'weak' | 'good' | 'strong'

export type PasswordStrength = {
  level: PasswordStrengthLevel
  label: 'Weak' | 'Getting there' | 'Strong'
  score: number
}

export function getPasswordStrength(password: string): PasswordStrength {
  const checks = [
    password.length >= 8,
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ]
  const score = checks.filter(Boolean).length

  if (score <= 2) return { level: 'weak', label: 'Weak', score }
  if (score < checks.length) return { level: 'good', label: 'Getting there', score }
  return { level: 'strong', label: 'Strong', score }
}
