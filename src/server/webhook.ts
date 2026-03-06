import { fetchWithRetry } from './utils';
import { ExperimentedFirm } from './experiment';

export const sendWebhooks = async (firm: ExperimentedFirm, baseUrl: string): Promise<void> => {
  if (firm.route === 'discard') return;
  
  try {
    const promises = [];
    
    // Send to CRM
    promises.push(fetchWithRetry(`${baseUrl}/api/mock/webhooks/crm`, {
      method: 'POST',
      data: { firmId: firm.id, route: firm.route, score: firm.score }
    }));
    
    // Send to Email Platform
    if (firm.experimentVariant) {
      promises.push(fetchWithRetry(`${baseUrl}/api/mock/webhooks/email`, {
        method: 'POST',
        data: { firmId: firm.id, variant: firm.experimentVariant, email: firm.contact.email }
      }));
    }
    
    await Promise.all(promises);
    console.log(`Webhooks sent successfully for firm ${firm.id}`);
  } catch (error: any) {
    console.error(`Failed to send webhooks for firm ${firm.id}:`, error.message);
  }
};
