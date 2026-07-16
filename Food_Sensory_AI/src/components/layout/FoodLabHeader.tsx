import {ArrowLeft, CircleCheck, ShieldCheck} from 'lucide-react';
import {Link} from 'react-router-dom';

export function FoodLabHeader() {
  return (
    <header className="foodlab-header">
      <div className="foodlab-header__identity">
        <a className="foodlab-header__portal" href="http://localhost:5173/">
          <ArrowLeft aria-hidden="true" />
          Back to Portal
        </a>
        <span className="foodlab-header__divider" />
        <div>
          <strong>FoodLab AI</strong>
          <span>Sensory Evaluation</span>
        </div>
      </div>
      <div className="foodlab-header__meta">
        <span className="module-status">
          <CircleCheck aria-hidden="true" /> Phase 2 ready
        </span>
        <Link to="/about">
          <ShieldCheck aria-hidden="true" /> Shared disclaimer
        </Link>
      </div>
    </header>
  );
}
