import { fetchWithRetry } from './utils';

export interface Firm {
  id: string;
  name: string;
  domain: string;
  region: string;
}

export interface EnrichedFirm extends Firm {
  firmographic: any;
  contact: any;
}

export const enrichFirm = async (firm: Firm, baseUrl: string): Promise<EnrichedFirm> => {
  try {
    const [firmographicRes, contactRes] = await Promise.all([
      fetchWithRetry(`${baseUrl}/api/mock/firms/${firm.id}/firmographic`, { method: 'GET' }),
      fetchWithRetry(`${baseUrl}/api/mock/firms/${firm.id}/contact`, { method: 'GET' })
    ]);
    
    // Normalize firmographic data
    const firmographic = firmographicRes.data;
    const lawyerCount = firmographic.num_lawyers || firmographic.lawyer_count || 0;
    
    return {
      ...firm,
      firmographic: {
        ...firmographic,
        lawyerCount,
        practiceAreas: firmographic.practice_areas || []
      },
      contact: contactRes.data
    };
  } catch (error: any) {
    console.error(`Failed to enrich firm ${firm.id}:`, error.message);
    return {
      ...firm,
      firmographic: { lawyerCount: 0, practiceAreas: [] },
      contact: {}
    };
  }
};
