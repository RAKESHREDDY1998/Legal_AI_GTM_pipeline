import { fetchWithRetry } from './utils';
import { ExperimentedFirm } from './experiment';

export const sendWebhooks = async (firm: ExperimentedFirm, baseUrl: string): Promise<void> => {
  if (firm.route === 'discard') return;
  
  try {
    const webhooks: { name: string; promise: ReturnType<typeof fetchWithRetry> }[] = [];
    
    // Send to CRM
    webhooks.push({
      name: 'CRM',
      promise: fetchWithRetry(`${baseUrl}/api/mock/webhooks/crm`, {
        method: 'POST',
        data: { firmId: firm.id, route: firm.route, score: firm.score }
      })
    });
    
    // Send to Email Platform only when a variant is assigned and an email address is available
    if (firm.experimentVariant && firm.contact.email) {
      webhooks.push({
        name: 'Email',
        promise: fetchWithRetry(`${baseUrl}/api/mock/webhooks/email`, {
          method: 'POST',
          data: { firmId: firm.id, variant: firm.experimentVariant, email: firm.contact.email }
        })
      });
    }
    
    const results = await Promise.allSettled(webhooks.map(w => w.promise));
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`${webhooks[index].name} webhook failed for firm ${firm.id}:`, result.reason?.message);
      }
    });
    console.log(`Webhooks processed for firm ${firm.id}`);
  } catch (error: any) {
    console.error(`Failed to send webhooks for firm ${firm.id}:`, error.message);
  }
};
