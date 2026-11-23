import { useEffect, useState } from "react";
import { Download, FileText } from "lucide-react";
import { api } from "../services/api";
import type { Summary } from "../types";

export default function Reports() {
  const [data, setData] = useState<Summary | null>(null);
  useEffect(() => { api.summary().then(setData).catch(() => {}); }, []);

  function download() {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "flowstate-summary.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return <>
    <div className="page-heading"><div><div className="eyebrow">YOUR DATA</div><h1>Reports</h1><p className="muted">Take a copy of your saved session summary.</p></div><button className="primary-btn" onClick={download} disabled={!data}><Download size={16}/> Export summary</button></div>
    <section className="panel"><FileText className="accent-icon"/><h3>Personal activity summary</h3><p className="muted">Session totals, durations, and saved movement observations. Webcam footage is never included.</p><pre className="json-preview">{JSON.stringify(data||{status:"Loading report…"},null,2)}</pre></section>
  </>;
}
