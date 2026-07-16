import type { QualityStandardsMap } from '../types/quality';
export const defaultQualityStandards: QualityStandardsMap = {
  Milk: { productName:'Milk', ph:{min:6.5,max:6.8}, waterActivity:{max:0.99}, moisture:{min:85,max:90}, temperature:{max:5}, warningMarginPercent:10 },
  Yoghurt: { productName:'Yoghurt', ph:{min:4,max:4.6}, waterActivity:{max:0.98}, moisture:{min:75,max:88}, temperature:{max:5}, warningMarginPercent:10 },
  'Protein Bar': { productName:'Protein Bar', ph:{min:5.5,max:7}, waterActivity:{max:0.65}, moisture:{min:5,max:15}, temperature:{max:25}, warningMarginPercent:10 },
  'Fruit Juice': { productName:'Fruit Juice', ph:{min:2.8,max:4.2}, waterActivity:{max:0.99}, moisture:{min:85,max:95}, temperature:{max:8}, warningMarginPercent:10 },
};
// Backwards-compatible immutable defaults for pure utilities and tests.
export const qualityStandards=defaultQualityStandards;
export const standardsDisclaimer = 'These limits are demonstration values only and must not be used as official regulatory or commercial specifications.';
