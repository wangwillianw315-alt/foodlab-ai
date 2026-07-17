import {ArrowLeft, CircleCheck, ShieldCheck} from 'lucide-react';
import {Link} from 'react-router-dom';
import {resolvePortalUrl} from '../../utils/portalUrl';

export function FoodLabHeader() {
  const portalUrl = resolvePortalUrl();
  return (
    <header className="foodlab-header">
      <div className="foodlab-header__identity">
        {portalUrl ? (
          <a
            className="foodlab-header__portal"
            href={portalUrl}
            rel="noopener noreferrer"
          >
            <ArrowLeft aria-hidden="true" />
            Back to Portal
          </a>
        ) : (
          <span
            className="foodlab-header__portal"
            title="Set VITE_PORTAL_URL to enable the Portal link"
            aria-disabled="true"
          >
            <ArrowLeft aria-hidden="true" />
            Portal link not configured
          </span>
        )}
        <span className="foodlab-header__divider" />
        <div>
          <strong>FoodLab AI</strong>
          <span>Sensory Evaluation</span>
        </div>
      </div>
      <div className="foodlab-header__meta">
        <span className="module-status">
          <CircleCheck aria-hidden="true" /> V1.0 ready
        </span>
        <Link to="/about">
          <ShieldCheck aria-hidden="true" /> Shared disclaimer
        </Link>
      </div>
    </header>
  );
}
