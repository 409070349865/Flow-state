import { NavLink, Outlet } from "react-router-dom";
import { Activity, BarChart3, Camera, FileText, LayoutDashboard, Lightbulb, ShieldCheck, Timer } from "lucide-react";

const links = [
  {to:"/", label:"Overview", icon:LayoutDashboard},
  {to:"/live", label:"Live session", icon:Camera},
  {to:"/sessions", label:"Sessions", icon:Timer},
  {to:"/analytics", label:"Activity patterns", icon:BarChart3},
  {to:"/insights", label:"Session guidance", icon:Lightbulb},
  {to:"/reports", label:"Reports", icon:FileText},
  {to:"/privacy", label:"Preferences", icon:ShieldCheck}
];

export default function Layout() {
  return <div className="app-shell">
    <aside className="sidebar">
      <NavLink to="/" className="brand" aria-label="FLOWSTATE home">
        <div className="brand-mark"><img src="/flowstate-logo.svg" alt="" /></div>
        <div><b>FLOWSTATE</b><small>PERSONAL WORKSPACE</small></div>
      </NavLink>
      <div className="workspace-label">YOUR SPACE</div>
      <nav aria-label="Main navigation">{links.map(({to,label,icon:Icon})=><NavLink end={to==="/"} key={to} to={to} className={({isActive})=>isActive?"nav-link active":"nav-link"}><Icon size={17}/><span>{label}</span></NavLink>)}</nav>
      <div className="sidebar-bottom">
        <div className="privacy-mini"><ShieldCheck size={18}/><span><b>Private by default</b><small>Video stays on this device</small></span></div>
        <div className="workspace-user"><div className="avatar"><Activity size={15}/></div><span><b>Local workspace</b><small>Your personal space</small></span></div>
      </div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div className="breadcrumb"><span className="breadcrumb-brand"><img src="/flowstate-logo.svg" alt="" /> FLOWSTATE</span><span className="breadcrumb-divider">/</span><span>Personal workspace</span></div><div className="topbar-right"><span className="workspace-indicator"><i/> Workspace ready</span><span className="avatar small"><Activity size={13}/></span></div></header>
      <div className="page-wrap"><Outlet/></div>
    </main>
  </div>;
}
