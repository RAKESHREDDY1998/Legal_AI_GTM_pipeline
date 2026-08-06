import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const fetchWithRetry = async (
  url: string,
  options: AxiosRequestConfig,
  retries = 3,
  backoff = 1000,
  // Rate-limit windows can last up to a minute, so 429s retry on a time
  // budget instead of consuming the retry count reserved for real errors.
  rateLimitBudgetMs = 90_000
): Promise<AxiosResponse> => {
  try {
    const response = await axios(url, options);
    return response;
  } catch (error: any) {
    if (error.response?.status === 429 && rateLimitBudgetMs > 0) {
      const retryAfter = parseInt(error.response.headers['retry-after'] || '5');
      console.log(`Rate limited on ${url}. Retrying after ${retryAfter} seconds...`);
      await sleep(retryAfter * 1000);
      return fetchWithRetry(url, options, retries, backoff, rateLimitBudgetMs - retryAfter * 1000);
    }
    if (retries > 0 && (error.response?.status >= 500 || error.code === 'ECONNABORTED')) {
      console.log(`Server error on ${url}. Retrying in ${backoff}ms...`);
      await sleep(backoff);
      return fetchWithRetry(url, options, retries - 1, backoff * 2, rateLimitBudgetMs);
    }
    throw error;
  }
};
