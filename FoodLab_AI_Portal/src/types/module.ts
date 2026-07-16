import type {LucideIcon} from 'lucide-react';

export type ModuleStatus='COMPLETE'|'STABLE'|'IN DEVELOPMENT'|'NEEDS REVIEW'|'ERROR';
export type Availability='idle'|'checking'|'online'|'offline';

export interface FoodLabModule {
  id:string;
  name:string;
  shortName:string;
  description:string;
  longDescription:string;
  purpose:string;
  colour:string;
  icon:LucideIcon;
  status:ModuleStatus;
  localUrl:string;
  productionUrl:string;
  repositoryPath:string;
  technologies:string[];
  targetUsers:string[];
  mainFeatures:string[];
  completedFeatures:string[];
  limitations:string[];
  futureVersion:string[];
  portfolioValue:string;
  order:number;
}

export interface ModuleEnvironment {
  VITE_PRODUCT_DEVELOPMENT_URL?:string;
  VITE_SENSORY_URL?:string;
  VITE_SHELF_LIFE_URL?:string;
  VITE_QA_URL?:string;
}
