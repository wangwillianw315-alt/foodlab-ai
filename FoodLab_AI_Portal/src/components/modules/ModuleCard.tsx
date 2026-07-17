import {ArrowUpRight,ChevronRight} from 'lucide-react';
import {Link} from 'react-router-dom';
import type {FoodLabModule} from '../../types/module';
import {getModuleUrl} from '../../utils/moduleUrl';
import {StatusBadge} from '../ui/StatusBadge';
export function ModuleCard({module}:{module:FoodLabModule}){const Icon=module.icon;const destination=getModuleUrl(module.localUrl,module.productionUrl);return <article className="module-card" style={{'--module-colour':module.colour} as React.CSSProperties}>
  <div className="module-card-top"><span className="module-icon"><Icon/></span><StatusBadge status={module.status}/></div>
  <p className="module-purpose">{module.purpose}</p><h3>{module.name}</h3><p className="module-description">{module.description}</p>
  <div className="module-meta"><div><span>Primary users</span><strong>{module.targetUsers.slice(0,2).join(' · ')}</strong></div><div><span>Core capabilities</span><strong>{module.mainFeatures.slice(0,2).join(' · ')}</strong></div></div>
  <div className="tech-list">{module.technologies.map(item=><span key={item}>{item}</span>)}</div>
  {destination.error&&<p className="url-warning">This module link is not configured for this deployment. Add its Vite URL in Netlify and redeploy the Portal.</p>}
  <div className="card-actions">{destination.url?<a className="button primary" href={destination.url} target="_blank" rel="noopener noreferrer">Open Module <ArrowUpRight/></a>:<button className="button primary" disabled>Module link unavailable</button>}<Link className="text-link" to={`/modules#${module.id}`}>View details <ChevronRight/></Link></div>
 </article>}
