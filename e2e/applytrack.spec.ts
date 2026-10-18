import { expect, test } from '@playwright/test'

test('shows the seeded dashboard and supports adding an application', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Good morning, Jordan/i })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Your pipeline' })).toBeVisible()

  await page.getByRole('button', { name: 'Add application' }).first().click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByPlaceholder('e.g. Figma').fill('Acme Labs')
  await page.getByPlaceholder('e.g. Product Designer').fill('Product Designer')
  await page.getByPlaceholder('e.g. Remote · US').fill('Remote · US')
  await page.getByPlaceholder('e.g. $150k – $180k').fill('$140k – $165k')
  await page.getByPlaceholder('e.g. Send portfolio follow-up').fill('Send portfolio')
  await page.getByRole('button', { name: /Add to pipeline/i }).click()
  await expect(page.getByText('Application added to your pipeline')).toBeVisible()
  await expect(page.getByText('Acme Labs', { exact: true })).toBeVisible()
})

test('validates required fields in the application form', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add application' }).first().click()
  await page.getByRole('button', { name: /Add to pipeline/i }).click()
  await expect(page.getByText('Company is required')).toBeVisible()
  await expect(page.getByText('Role is required')).toBeVisible()
})
