import { fetchWithRetry } from './utils';
import { enrichFirm, EnrichedFirm } from './enricher';
import { scoreFirm, ScoredFirm } from './scorer';
import { routeFirm, RoutedFirm } from './router';
import { assignExperiment, ExperimentedFirm } from './experiment';
import { sendWebhooks } from './webhook';
import * as stringSimilarity from 'string-similarity';

export const runPipeline = async (baseUrl: string, config: any, onProgress: (msg: string, data?: any) => void) => {
  onProgress('Starting pipeline execution...');
  
  try {
    // 1. Fetch Firms
    let page = 1;
    let allFirms: any[] = [];
    let totalPages = 1;
    
    while (page <= totalPages) {
      onProgress(`Fetching firms page ${page}...`);
      const response = await fetchWithRetry(`${baseUrl}/api/mock/firms?page=${page}&limit=10`, { method: 'GET' });
      allFirms = allFirms.concat(response.data.data);
      totalPages = response.data.meta.totalPages;
      page++;
    }
    
    onProgress(`Fetched ${allFirms.length} total firms.`);
    
    // 2. Deduplication
    onProgress('Deduplicating firms...');
    const uniqueFirms: any[] = [];
    const duplicates: any[] = [];
    
    for (const firm of allFirms) {
      const isDuplicate = uniqueFirms.some(uf => {
        if (uf.domain === firm.domain) {
          const similarity = stringSimilarity.compareTwoStrings(uf.name.toLowerCase(), firm.name.toLowerCase());
          return similarity > 0.8;
        }
        return false;
      });
      
      if (isDuplicate) {
        duplicates.push(firm);
      } else {
        uniqueFirms.push(firm);
      }
    }
    
    onProgress(`Deduplication complete. Found ${duplicates.length} duplicates. Processing ${uniqueFirms.length} unique firms.`);
    
    // Process each firm
    const processedFirms: ExperimentedFirm[] = [];
    
    for (const [index, firm] of uniqueFirms.entries()) {
      onProgress(`Processing firm ${index + 1}/${uniqueFirms.length}: ${firm.name}...`);
      
      // 3. Enrichment
      const enriched = await enrichFirm(firm, baseUrl);
      
      // 4. Scoring
      const scored = scoreFirm(enriched, config);
      
      // 5. Routing
      const routed = routeFirm(scored, config);
      
      // 6. Experiment Assignment
      const experimented = assignExperiment(routed, config);
      
      // 7. Webhooks
      await sendWebhooks(experimented, baseUrl);
      
      processedFirms.push(experimented);
      onProgress(`Successfully processed ${firm.name}. Route: ${experimented.route}, Score: ${experimented.score}`);
    }
    
    onProgress('Pipeline execution completed successfully.', { processedFirms, duplicates });
    return { processedFirms, duplicates };
  } catch (error: any) {
    onProgress(`Pipeline failed: ${error.message}`);
    throw error;
  }
};
