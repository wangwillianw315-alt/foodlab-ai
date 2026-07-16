import {ArrowLeft} from 'lucide-react';
import {Link} from 'react-router-dom';
export function NotFoundPage(){return <div className="not-found"><span>404</span><h1>Page not found</h1><p>The requested FoodLab AI page does not exist.</p><Link className="button primary" to="/"><ArrowLeft/> Return home</Link></div>}
