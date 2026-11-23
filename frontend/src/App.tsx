import { Navigate, Route, Routes } from "react-router-dom";
import { Activity, RefreshCw } from "lucide-react";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import LiveVision from "./pages/LiveVision";
import Sessions from "./pages/Sessions";
import Analytics from "./pages/Analytics";
import Insights from "./pages/Insights";
import Reports from "./pages/Reports";
import Privacy from "./pages/Privacy";
import { useAuth } from "./state/AuthContext";

function WorkspaceShell() {
  const {user, loading, error, connect} = useAuth();
  if (loading) return <div className="loading-screen"><Activity size={22}/> Opening your FLOWSTATE workspace…</div>;
  if (error || !user) return <div className="connection-screen"><div className="connection-card"><div className="brand-mark"><Activity size={22}/></div><span className="eyebrow">FLOWSTATE WORKSPACE</span><h1>Workspace unavailable</h1><p>{error || "We couldn't open your local workspace."}</p><button className="primary-btn" onClick={() => void connect()}><RefreshCw size={16}/> Try again</button></div></div>;
  return <Layout/>;
}

export default function App() {
  return <Routes>
    <Route element={<WorkspaceShell/>}>
      <Route index element={<Dashboard/>}/>
      <Route path="live" element={<LiveVision/>}/>
      <Route path="sessions" element={<Sessions/>}/>
      <Route path="analytics" element={<Analytics/>}/>
      <Route path="insights" element={<Insights/>}/>
      <Route path="reports" element={<Reports/>}/>
      <Route path="privacy" element={<Privacy/>}/>
      <Route path="*" element={<Navigate to="/" replace/>}/>
    </Route>
  </Routes>;
}
