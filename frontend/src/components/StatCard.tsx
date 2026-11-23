import type { ReactNode } from "react";
export default function StatCard({label,value,detail,icon}:{label:string;value:string|number;detail:string;icon:ReactNode}){
 return <div className="stat-card"><div className="stat-top"><span>{label}</span><div className="stat-icon">{icon}</div></div><div className="stat-value">{value}</div><div className="stat-detail">{detail}</div></div>
}
