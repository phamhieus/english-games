import { expect, test } from '@playwright/test';

test('create vocabulary, play a session, answer correctly and keep the results', async ({ page }) => {
  await page.goto('/');

  // 1. Create a collection with one word.
  await page.getByRole('navigation').getByRole('button', { name: 'Library' }).click();
  await page.getByRole('button', { name: 'New', exact: true }).click();
  await page.getByLabel('Collection name').fill('E2E Words');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'E2E Words' })).toBeVisible();
  await page.getByRole('button', { name: 'Add word' }).click();
  await page.getByLabel('English *').fill('apple');
  await page.getByLabel('Vietnamese *').fill('quả táo');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByTestId('word-list')).toContainText('quả táo');

  // 2. Start a Vietnamese → English practice session with all words.
  await page.getByRole('button', { name: 'Play this' }).click();
  await page.getByRole('radio', { name: /Vietnamese → English/ }).click();
  await page.getByRole('radio', { name: 'All', exact: true }).click();
  await page.getByRole('button', { name: 'Start game' }).click();

  // 3. Wait for the balloon (prompt shows the Vietnamese meaning), then answer.
  await expect(page.getByTestId('active-balloons')).toContainText('quả táo', { timeout: 15_000 });
  const input = page.getByTestId('answer-input');
  await input.fill('wrong answer');
  await input.press('Enter');
  await input.fill('  APPLE ');
  await input.press('Enter');

  // 4. The single-word session completes.
  await expect(page.getByTestId('results-title')).toHaveText(/Session complete/, { timeout: 15_000 });
  await expect(page.getByTestId('result-correct')).toHaveText('1');
  // Counted as a wrong attempt, but not attributed to "apple" (not similar), so the word isn't replayed.
  await expect(page.getByTestId('result-wrong-attempts')).toHaveText('1');

  // 5. Results are saved and survive a reload.
  await page.reload();
  await page.getByRole('navigation').getByRole('button', { name: 'Stats' }).click();
  await expect(page.getByTestId('stat-game-sessions')).toHaveText('1');
  await expect(page.getByTestId('stat-words-learned')).toHaveText('1');
  await expect(page.getByText('E2E Words').first()).toBeVisible();
});
