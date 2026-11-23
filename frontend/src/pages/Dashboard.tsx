import { useEffect, useState } from "react";
import { Activity, ArrowUpRight, Clock3, Footprints, Leaf, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import StatCard from "../components/StatCard";
import { api } from "../services/api";
import type { Summary, Recommendation } from "../types";

export default function Dashboard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [guidance, setGuidance] = useState<Recommendation[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.summary(), api.recommendations()]).then(([nextSummary, nextGuidance]) => {
      setSummary(nextSummary);
      setGuidance(nextGuidance);
    }).catch(cause => setError(cause instanceof Error ? cause.message : "Workspace data could not be loaded."));
  }, []);

  const minutes = Math.round((summary?.total_duration_seconds || 0) / 60);
  return <>
    <div className="page-heading"><div><div className="eyebrow">A LITTLE SPACE TO RESET</div><h1>Your overview</h1><p className="muted">A simple view of the sessions and activity you choose to record.</p></div><Link className="primary-btn" to="/live"><Activity size={16}/> New session</Link></div>
    {error&&<div className="error-box">{error}</div>}
    <div className="stat-grid">
      <StatCard label="SESSIONS" value={summary?.session_count??"—"} detail="Recorded in your workspace" icon={<Activity/>}/>
      <StatCard label="TIME IN SESSION" value={`${minutes}m`} detail="Across completed sessions" icon={<Clock3/>}/>
      <StatCard label="OBSERVATIONS" value={summary?.event_count??"—"} detail="Movement notes saved" icon={<Footprints/>}/>
      <StatCard label="COMPLETED" value={summary?.completed_sessions??"—"} detail="Sessions wrapped up" icon={<ShieldCheck/>}/>
    </div>
    <div className="content-grid">
      <section className="panel"><div className="panel-head"><div><h3>Recent sessions</h3><p className="muted">Your latest check-ins</p></div><Link to="/sessions" className="text-link">All sessions <ArrowUpRight size={15}/></Link></div>
        {summary?.recent_sessions?.length?summary.recent_sessions.slice(0,5).map(session=><div className="session-row" key={session.id}><div className="row-icon"><Activity size={17}/></div><div className="row-main"><b>{session.title}</b><small>{new Date(session.started_at).toLocaleString()}</small></div><span className={session.status==="active"?"status active-status":"status"}>{session.status}</span><span className="row-time">{Math.round(session.duration_seconds/60)}m</span></div>):<div className="empty-state"><div className="empty-icon"><Activity/></div><b>Ready when you are</b><p>Start a short session to begin building a personal activity history.</p><Link to="/live" className="text-link">Set up a session <ArrowUpRight size={15}/></Link></div>}
      </section>
      <section className="panel"><div className="panel-head"><div><h3>Small things to notice</h3><p className="muted">Gentle prompts based on saved activity</p></div><Leaf size={18} className="accent-icon"/></div>
        {guidance.length?guidance.map((item,index)=><div className="insight-item" key={index}><div className="insight-dot"/><div><b>{item.title}</b><p>{item.message}</p><small>Based on: {item.evidence}</small></div></div>):<div className="empty-state"><b>Nothing to reflect on yet</b><p>After a few sessions, you’ll see optional prompts here.</p></div>}
      </section>
    </div>
    <div className="notice"><ShieldCheck size={18}/><div><b>Your video stays private</b><p>Live video is processed in this browser. FLOWSTATE keeps session times and small movement summaries you choose to record.</p></div></div>
  </>;
}
