export async function retryRequest<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (retries <= 0) throw err;

    const jitter = Math.random() * 300;
    await new Promise((res) => setTimeout(res, delay + jitter));

    return retryRequest(fn, retries - 1, delay * 2);
  }
}