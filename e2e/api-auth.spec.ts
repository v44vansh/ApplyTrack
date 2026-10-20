import { expect, test } from '@playwright/test'

test('registers a real account and opens the protected workspace', async ({ page }) => {
  const email = `playwright-${Date.now()}@example.com`
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
  await page.getByRole('button', { name: /New to ApplyTrack/i }).click()
  await expect(page.getByRole('heading', { name: 'Create your workspace' })).toBeVisible()
  await page.getByPlaceholder('Jordan Davis').fill('Playwright User')
  await page.getByPlaceholder('you@example.com').fill(email)
  const password = page.getByPlaceholder('8+ characters')
  await password.fill('short')
  await expect(page.getByText('Weak', { exact: true })).toBeVisible()
  await password.fill('ApplyTrack9!')
  await expect(page.getByText('Strong', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: /Create account/i }).click()
  await expect(page.getByRole('heading', { name: /Good morning, Playwright/i })).toBeVisible()
  await expect(page.getByText('Your pipeline')).toBeVisible()

  await page.getByRole('button', { name: 'Add application' }).first().click()
  await page.getByPlaceholder('e.g. Figma').fill('API Company')
  await page.getByPlaceholder('e.g. Product Designer').fill('Product Designer')
  await page.getByPlaceholder('e.g. Remote · US').fill('Remote · US')
  await page.getByPlaceholder('e.g. $150k – $180k').fill('$150k – $180k')
  await page.getByPlaceholder('e.g. Send portfolio follow-up').fill('Follow up')
  await page.getByRole('button', { name: /Add to pipeline/i }).click()
  await expect(page.getByText('API Company', { exact: true })).toBeVisible()
  await page.waitForTimeout(800)
  await page.reload()
  await expect(page.getByText('API Company', { exact: true })).toBeVisible()
})

test('backend rejects invalid registration data and protects the workspace', async ({ request }) => {
  const invalidRegistration = await request.post('http://127.0.0.1:4000/api/auth/register', {
    data: { name: 'A', email: `invalid-${Date.now()}@example.com`, password: 'short' },
  })
  expect(invalidRegistration.status()).toBe(400)

  const protectedWorkspace = await request.get('http://127.0.0.1:4000/api/workspace')
  expect(protectedWorkspace.status()).toBe(401)
})
