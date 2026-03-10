import { RoutedFirm } from './router';

export interface ExperimentedFirm extends RoutedFirm {
  experimentVariant: string | null;
}

export const assignExperiment = (firm: RoutedFirm, config: any): ExperimentedFirm => {
  if (firm.route === 'discard') {
    return { ...firm, experimentVariant: null };
  }
  
  const variants = config.experiment.variants;
  const weights = config.experiment.weights;
  
  const random = Math.random();
  let cumulativeWeight = 0;
  let assignedVariant = variants[0];
  
  for (let i = 0; i < variants.length; i++) {
    cumulativeWeight += weights[i];
    if (random < cumulativeWeight) {
      assignedVariant = variants[i];
      break;
    }
  }
  
  return {
    ...firm,
    experimentVariant: assignedVariant
  };
};
