import { fetchWithRetry } from './utils';
import { enrichFirm, EnrichedFirm } from './enricher';
import { scoreFirm, ScoredFirm } from './scorer';
import { routeFirm, RoutedFirm } from './router';
import { assignExperiment, ExperimentedFirm } from './experiment';
import { sendWebhooks } from './webhook';
import * as stringSimilarity from 'string-similarity';

const BATCH_SIZE = 5;

export const runPipeline = async (baseUrl: string, config: any, onProgress: (msg: string, data?: any) => void) => {
  onProgress('Starting pipeline execution...');

  try {
    // 1. Fetch Firms (parallel page fetching)
    let allFirms: any[] = [];
    onProgress('Fetching firms...');

    const first = await fetchWithRetry(`${baseUrl}/api/mock/firms?page=1&limit=10`, { method: 'GET' });
    allFirms = allFirms.concat(first.data.data);
    const totalPages = first.data.meta.totalPages;

    if (totalPages > 1) {
      const pageRefs = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
      const responses = await Promise.all(
        pageRefs.map(p => fetchWithRetry(`${baseUrl}/api/mock/firms?page=${p}&limit=10`, { method: 'GET' }))
      );
      for (const res of responses) {
        allFirms = allFirms.concat(res.data.data);
      }
    }

    onProgress(`Fetched ${allFirms.length} total firms across ${totalPages} pages.`);

    // 2. Deduplication (O(n) using Map instead of O(n^2))
    onProgress('Deduplicating firms...');
    // Punctuation-insensitive so "Law Firm 1 LLC" matches "Law Firm 1 L.L.C."
    const normalizeName = (name: string) =>
      name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

    const firmsByDomain = new Map<string, any[]>();
    const duplicates: any[] = [];

    for (const firm of allFirms) {
      const sameDomain = firmsByDomain.get(firm.domain);
      if (sameDomain) {
        const isDuplicate = sameDomain.some(existing =>
          stringSimilarity.compareTwoStrings(
            normalizeName(existing.name),
            normalizeName(firm.name)
          ) > 0.8
        );
        if (isDuplicate) {
          duplicates.push(firm);
          continue;
        }
        // Same domain but genuinely different name: keep both firms
        sameDomain.push(firm);
      } else {
        firmsByDomain.set(firm.domain, [firm]);
      }
    }
    const uniqueFirms = [...firmsByDomain.values()].flat();

    onProgress(`Deduplication complete. Found ${duplicates.length} duplicates. Processing ${uniqueFirms.length} unique firms.`);

    // Process firms in parallel batches
    const processedFirms: ExperimentedFirm[] = [];
    const totalBatches = Math.ceil(uniqueFirms.length / BATCH_SIZE);

    for (let i = 0; i < uniqueFirms.length; i += BATCH_SIZE) {
      const batch = uniqueFirms.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;

      const results = await Promise.all(
        batch.map(async (firm) => {
          const enriched = await enrichFirm(firm, baseUrl);
          const scored = scoreFirm(enriched, config);
          const routed = routeFirm(scored, config);
          const experimented = assignExperiment(routed, config);
          await sendWebhooks(experimented, baseUrl);
          return experimented;
        })
      );

      processedFirms.push(...results);
      onProgress(`Processed batch ${batchNum}/${totalBatches} (${results.length} firms).`);
    }

    onProgress('Pipeline execution completed successfully.', { processedFirms, duplicates });
    return { processedFirms, duplicates };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    onProgress(`Pipeline failed: ${msg}`);
    throw error;
  }
};
