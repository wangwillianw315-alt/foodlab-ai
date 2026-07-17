import {Beaker,Menu,X} from 'lucide-react';
import {useState} from 'react';
import {NavLink,Outlet} from 'react-router-dom';

const nav=[['/','Home'],['/modules','Modules'],['/workflow','Lifecycle'],['/portfolio','Portfolio'],['/about','About']] as const;

export function SiteLayout(){const[open,setOpen]=useState(false);return <div className="site-shell">
  <a className="skip-link" href="#main-content">Skip to content</a>
  <header className="site-header"><div className="nav-wrap"><NavLink to="/" className="brand"><span className="brand-mark"><Beaker/></span><span><strong>FoodLab AI</strong><small>From Formula to Quality</small></span></NavLink><button className="menu-button" aria-label="Toggle navigation" onClick={()=>setOpen(!open)}>{open?<X/>:<Menu/>}</button><nav className={open?'main-nav open':'main-nav'}>{nav.map(([to,label])=><NavLink key={to} to={to} end={to==='/' } onClick={()=>setOpen(false)}>{label}</NavLink>)}</nav></div></header>
  <main id="main-content"><Outlet/></main>
  <footer><div><div><strong>FoodLab AI V1.0</strong><p>A modular food science portfolio platform.</p></div><div className="footer-note">Educational and research-planning use only · © 2026 Tianyi Wang</div></div></footer>
</div>}
