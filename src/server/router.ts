import { ScoredFirm } from './scorer';

export interface RoutedFirm extends ScoredFirm {
  route: 'enterprise' | 'mid-market' | 'smb' | 'nurture' | 'discard';
}

export const routeFirm = (firm: ScoredFirm, config: any): RoutedFirm => {
  let route: RoutedFirm['route'] = 'discard';
  
  if (firm.isQualified) {
    if (firm.firmographic.lawyerCount >= config.routing.enterprise_threshold) {
      route = 'enterprise';
    } else if (firm.firmographic.lawyerCount >= config.routing.mid_market_threshold) {
      route = 'mid-market';
    } else {
      route = 'smb';
    }
  } else if (firm.isNurture) {
    route = 'nurture';
  }
  
  return {
    ...firm,
    route
  };
};
