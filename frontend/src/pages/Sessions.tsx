import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Activity, Clock3, Eye, Footprints, Smartphone, Timer, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../services/api";
import type { SessionDetail, SessionEvent, VisionSession } from "../types";

type PatternPoint={time:string;activity:string;posture:string;gaze:string;movement:number|null;postureScore:number|null;facing:number|null;blinkRate:number|null;staticSeconds:number|null;phone:boolean};
const value=(event:SessionEvent,key:string)=>event.metadata_json[key];
const text=(event:SessionEvent,key:string,fallback="Not available")=>typeof value(event,key)==="string"?String(value(event,key)):fallback;
const number=(event:SessionEvent,key:string)=>typeof value(event,key)==="number"?Number(value(event,key)):null;

function buildPoint(event:SessionEvent):PatternPoint{
  const facing=value(event,"screen_facing");
  const movement=number(event,"movement_proxy");
  const postureScore=number(event,"posture_score");
  return {
    time:new Date(event.recorded_at).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit",second:"2-digit"}),
    activity:text(event,"activity"),posture:text(event,"posture"),gaze:text(event,"gaze_direction"),
    movement:movement===null?null:Math.round(movement*100),postureScore:postureScore===null?null:Math.round(postureScore*100),
    facing:typeof facing==="boolean"?(facing?100:0):null,blinkRate:number(event,"blink_rate_per_minute"),
    staticSeconds:number(event,"static_seconds"),phone:value(event,"phone_use_likely")===true
  };
}

export default function Sessions(){
  const [items,setItems]=useState<VisionSession[]>([]);
  const [selectedId,setSelectedId]=useState<number|null>(null);
  const [detail,setDetail]=useState<SessionDetail|null>(null);
  const [loadingDetail,setLoadingDetail]=useState(false);
  const [error,setError]=useState("");
  const [deletingId,setDeletingId]=useState<number|null>(null);
  useEffect(()=>{api.sessions().then(setItems).catch(cause=>setError(cause.message));},[]);

  async function openSession(id:number){
    if(selectedId===id){setSelectedId(null);setDetail(null);return;}
    setSelectedId(id);setLoadingDetail(true);setDetail(null);setError("");
    try{setDetail(await api.session(id));}catch(cause){setError(cause instanceof Error?cause.message:"Session details could not be loaded.");}
    finally{setLoadingDetail(false);}
  }

  async function deleteSession(session:VisionSession){
    if(!window.confirm(`Delete "${session.title}" and its saved patterns? This cannot be undone.`))return;
    setDeletingId(session.id);setError("");
    try{
      await api.deleteSession(session.id);
      setItems(current=>current.filter(item=>item.id!==session.id));
      if(selectedId===session.id){setSelectedId(null);setDetail(null);}
    }catch(cause){setError(cause instanceof Error?cause.message:"The session could not be deleted.");}
    finally{setDeletingId(null);}
  }

  const snapshots=useMemo(()=>detail?.events.filter(event=>event.event_type==="vision_snapshot").map(buildPoint)??[],[detail]);
  const facingChecks=snapshots.filter(point=>point.facing!==null);
  const facingPercent=facingChecks.length?Math.round(facingChecks.reduce((sum,point)=>sum+(point.facing??0),0)/facingChecks.length):null;
  const blinkValues=snapshots.map(point=>point.blinkRate).filter((rate):rate is number=>rate!==null);
  const averageBlink=blinkValues.length?Math.round(blinkValues.reduce((sum,rate)=>sum+rate,0)/blinkValues.length):null;
  const phoneCount=snapshots.filter(point=>point.phone).length;
  const postureCount=snapshots.filter(point=>point.posture==="slouching"||point.posture==="leaning").length;

  return <>
    <div className="page-heading"><div><div className="eyebrow">YOUR PERSONAL HISTORY</div><h1>Sessions</h1><p className="muted">Review the activity indicators recorded during each check-in.</p></div><Link to="/live" className="primary-btn"><Activity size={16}/> New session</Link></div>
    {error&&<div className="error-box" role="alert">{error}</div>}
    <section className="panel sessions-list">
      {items.length?items.map(session=><div className="session-record" key={session.id}>
        <div className="session-row"><div className="row-icon"><Activity size={17}/></div><div className="row-main"><b>{session.title}</b><small>{new Date(session.started_at).toLocaleString()}</small></div><span className={session.status==="active"?"status active-status":"status"}>{session.status}</span><span className="row-time"><Clock3 size={14}/> {Math.round(session.duration_seconds/60)}m</span><div className="session-actions"><button className="secondary-btn details-toggle" aria-expanded={selectedId===session.id} onClick={()=>void openSession(session.id)}>{selectedId===session.id?"Close":"View patterns"}</button><button className="secondary-btn delete-session-btn" aria-label={`Delete session ${session.title}`} disabled={deletingId!==null} onClick={()=>void deleteSession(session)}><Trash2 size={13}/>{deletingId===session.id?"Deleting…":"Delete"}</button></div></div>
        {selectedId===session.id&&<div className="session-detail">
          {loadingDetail?<div className="empty-state detail-empty"><Timer className="spin"/><b>Loading session patterns…</b></div>:detail&&<>
            <div className="pattern-summary"><PatternStat icon={<Eye size={16}/>} label="Facing-camera checks" value={facingPercent===null?"—":`${facingPercent}%`}/><PatternStat icon={<Activity size={16}/>} label="Average blink estimate" value={averageBlink===null?"—":`${averageBlink}/min`}/><PatternStat icon={<Footprints size={16}/>} label="Lean / slouch checks" value={postureCount}/><PatternStat icon={<Smartphone size={16}/>} label="Phone-near-hand checks" value={phoneCount}/></div>
            {snapshots.length>1?<ResponsiveContainer width="100%" height={230}><LineChart data={snapshots} margin={{top:8,right:10,left:-18,bottom:0}}><CartesianGrid strokeDasharray="3 3" stroke="#e5e9e3"/><XAxis dataKey="time" stroke="#87938a" tick={{fontSize:9}}/><YAxis domain={[0,100]} stroke="#87938a" tick={{fontSize:9}}/><Tooltip contentStyle={{background:"#fff",border:"1px solid #e4e8e1",borderRadius:10,color:"#34473a"}}/><Line type="monotone" dataKey="movement" name="Movement" stroke="#b88760" strokeWidth={2} dot={false}/><Line type="monotone" dataKey="postureScore" name="Posture estimate" stroke="#66866c" strokeWidth={2} dot={false} connectNulls/><Line type="monotone" dataKey="facing" name="Facing camera" stroke="#7799a1" strokeWidth={2} dot={false} connectNulls/></LineChart></ResponsiveContainer>:<div className="empty-state detail-empty"><Activity/><b>{snapshots.length?"One visual check was saved":"No visual checks were saved"}</b><p>Camera indicators are saved every 15 seconds while analysis is available.</p></div>}
            <div className="pattern-log">{snapshots.slice().reverse().slice(0,8).map((point,index)=><div className="pattern-log-row" key={`${point.time}-${index}`}><b>{point.time}</b><span>{point.activity}</span><span>{point.posture} posture</span><span>{point.gaze} gaze</span><small>{point.phone?"Phone near hand · ":""}{point.staticSeconds===null?"":`${Math.floor(point.staticSeconds/60)}m still`}</small></div>)}</div>
          </>}
        </div>}
      </div>):<div className="empty-state"><Activity/><b>No sessions yet</b><p>Start your first short check-in whenever you’re ready.</p><Link to="/live" className="text-link">Start a session</Link></div>}
    </section>
    <div className="notice"><Eye size={18}/><div><b>Patterns are estimates</b><p>Face direction, posture, and activity can be affected by camera angle and visibility. The chart is not a score of attention or work quality.</p></div></div>
  </>;
}

function PatternStat({icon,label,value}:{icon:ReactNode;label:string;value:string|number}){
  return <div className="pattern-stat"><span>{icon}</span><small>{label}</small><b>{value}</b></div>;
}
