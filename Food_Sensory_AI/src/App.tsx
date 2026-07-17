import {NavLink, Route, Routes} from 'react-router-dom';
import {
  Activity,
  ArrowLeftRight,
  BarChart3,
  Beaker,
  BookOpen,
  ClipboardList,
  Columns3,
  FileText,
  FlaskConical,
  LayoutDashboard,
  Menu,
  TestTubes,
  Users,
  X,
} from 'lucide-react';
import {useState} from 'react';
import {Disclaimer} from './components/layout/Disclaimer';
import {FoodLabHeader} from './components/layout/FoodLabHeader';
import {
  AboutPage,
  AnalysisPage,
  ComparePage,
  DashboardPage,
  PanelistsPage,
  ProjectsPage,
  ReportPage,
  ResponsesPage,
  SamplesPage,
  TestDesignPage,
} from './pages/Pages';
import {TransfersPage} from './pages/TransfersPage';

const nav = [
  ['/', 'Dashboard', LayoutDashboard],
  ['/projects', 'Projects', ClipboardList],
  ['/transfers', 'Lifecycle Transfers', ArrowLeftRight],
  ['/test-design', 'Test Design', FlaskConical],
  ['/samples', 'Samples', TestTubes],
  ['/panelists', 'Panelists', Users],
  ['/responses', 'Responses', Activity],
  ['/analysis', 'Analysis', BarChart3],
  ['/compare', 'Compare', Columns3],
  ['/reports', 'Reports', FileText],
  ['/about', 'About', BookOpen],
] as const;

export default function App() {
  const [open, setOpen] = useState(false);
  return (
    <div className="app">
      <button className="mobile-menu" onClick={() => setOpen(!open)}>
        {open ? <X /> : <Menu />}
      </button>
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark"><Beaker /></div>
          <div><strong>FoodLab AI</strong><span>Sensory Evaluation</span></div>
        </div>
        <nav>
          {nav.map(([to, label, Icon]) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setOpen(false)}
            >
              <Icon />{label}
            </NavLink>
          ))}
        </nav>
        <div className="side-foot">
          <span>V1.0 · Local-first</span>
          <small>Educational & research planning</small>
          <small>
            Tianyi Wang · Bachelor of Food Science · Lincoln University, New
            Zealand
          </small>
        </div>
      </aside>
      <main>
        <FoodLabHeader />
        <div className="content">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/transfers" element={<TransfersPage />} />
            <Route path="/test-design" element={<TestDesignPage />} />
            <Route path="/samples" element={<SamplesPage />} />
            <Route path="/panelists" element={<PanelistsPage />} />
            <Route path="/responses" element={<ResponsesPage />} />
            <Route path="/analysis" element={<AnalysisPage />} />
            <Route path="/compare" element={<ComparePage />} />
            <Route path="/reports" element={<ReportPage />} />
            <Route path="/about" element={<AboutPage />} />
          </Routes>
        </div>
        <Disclaimer />
      </main>
    </div>
  );
}
