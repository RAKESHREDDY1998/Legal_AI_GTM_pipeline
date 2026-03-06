import { EnrichedFirm } from './enricher';

export interface ScoredFirm extends EnrichedFirm {
  score: number;
  isQualified: boolean;
  isNurture: boolean;
}

export const scoreFirm = (firm: EnrichedFirm, config: any): ScoredFirm => {
  let score = 0;
  
  // Size criteria
  const lawyerCount = firm.firmographic.lawyerCount;
  if (lawyerCount > 100) score += config.scoring.weights.size * 100;
  else if (lawyerCount > 50) score += config.scoring.weights.size * 50;
  
  // Practice areas criteria
  const practiceAreas = firm.firmographic.practiceAreas;
  if (practiceAreas.includes('Corporate') || practiceAreas.includes('Litigation')) {
    score += config.scoring.weights.practice_areas * 100;
  }
  
  // Location criteria
  if (config.routing.regions.includes(firm.region)) {
    score += config.scoring.weights.location * 100;
  }
  
  const isQualified = score >= config.scoring.thresholds.qualified;
  const isNurture = score >= config.scoring.thresholds.nurture && !isQualified;
  
  return {
    ...firm,
    score,
    isQualified,
    isNurture
  };
};
