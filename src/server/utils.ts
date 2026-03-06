import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const fetchWithRetry = async (
  url: string,
  options: AxiosRequestConfig,
  retries = 3,
  backoff = 1000
): Promise<AxiosResponse> => {
  try {
    const response = await axios(url, options);
    return response;
  } catch (error: any) {
    if (retries > 0) {
      if (error.response?.status === 429) {
        const retryAfter = parseInt(error.response.headers['retry-after'] || '5');
        console.log(`Rate limited on ${url}. Retrying after ${retryAfter} seconds...`);
        await sleep(retryAfter * 1000);
        return fetchWithRetry(url, options, retries - 1, backoff);
      } else if (error.response?.status >= 500 || error.code === 'ECONNABORTED') {
        console.log(`Server error on ${url}. Retrying in ${backoff}ms...`);
        await sleep(backoff);
        return fetchWithRetry(url, options, retries - 1, backoff * 2);
      }
    }
    throw error;
  }
};
