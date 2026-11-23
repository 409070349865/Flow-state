import { useState } from "react";
import { Camera, Database, ShieldCheck, SlidersHorizontal, Trash2 } from "lucide-react";
import { readVisionPreferences, saveVisionPreferences, type VisionPreferences } from "../state/visionPreferences";

export default function Privacy(){
  const [preferences,setPreferences]=useState(readVisionPreferences);
  const [error,setError]=useState("");
  const [saved,setSaved]=useState(false);

  function update<K extends keyof VisionPreferences>(key:K,value:VisionPreferences[K]){
    const next={...preferences,[key]:value};
    try{
      saveVisionPreferences(next);
      setPreferences(next);
      setError("");
      setSaved(true);
    }catch{
      setSaved(false);
      setError("Your browser could not save these preferences. Check its local storage settings and try again.");
    }
  }

  return <>
    <div className="page-heading"><div><div className="eyebrow">YOUR CHOICES</div><h1>Preferences</h1><p className="muted">Tune how FLOWSTATE reads motion and previews your camera.</p></div></div>
    <div className="settings-grid">
      <section className="panel setting-card setting-controls">
        <div className="setting-title"><SlidersHorizontal/><div><h3>Camera & detection</h3><p>Preferences are saved in this browser and apply the next time you open the camera.</p></div></div>
        <div className="preference-controls">
          <label className="preference-control"><span><b>Motion sensitivity</b><small>Higher sensitivity picks up smaller movements, but may react to background changes.</small></span><select value={preferences.motionSensitivity} onChange={event=>update("motionSensitivity",event.target.value as VisionPreferences["motionSensitivity"])}><option value="low">Low</option><option value="balanced">Balanced</option><option value="high">High</option></select></label>
          <label className="preference-control"><span><b>Camera quality</b><small>Higher resolution may use more device resources.</small></span><select value={preferences.cameraResolution} onChange={event=>update("cameraResolution",event.target.value as VisionPreferences["cameraResolution"])}><option value="720p">720p · recommended</option><option value="1080p">1080p · high detail</option></select></label>
          <label className="preference-control mirror-control"><span><b>Mirror camera preview</b><small>Flip the preview like a mirror; this does not change what is analyzed.</small></span><input type="checkbox" checked={preferences.mirrorPreview} onChange={event=>update("mirrorPreview",event.target.checked)}/></label>
          <label className="preference-control mirror-control"><span><b>Pose tracking overlay</b><small>Show visible body landmarks over the live preview. The overlay is not recorded.</small></span><input type="checkbox" checked={preferences.showPoseOverlay} onChange={event=>update("showPoseOverlay",event.target.checked)}/></label>
        </div>
        <div className="settings-feedback" role={error?"alert":"status"}>{error|| (saved?"Preferences saved.":"Settings are stored locally.")}</div>
      </section>
      <section className="panel setting-card"><Camera/><h3>Camera privacy</h3><p>Camera access starts only when you choose to begin a session. Video and analysis stay in this browser and are not uploaded.</p><span className="status active-status">ON THIS DEVICE</span></section>
      <section className="panel setting-card"><Database/><h3>Saved activity</h3><p>Session times and compact movement observations are saved to this FLOWSTATE workspace. Camera frames are not stored.</p><span className="status">SESSION DETAILS</span></section>
      <section className="panel setting-card"><Trash2/><h3>Clear your workspace</h3><p>Workspace data is stored in the local application database. To clear it during development, stop the app and remove its database file.</p><span className="status">LOCAL DATA</span></section>
      <section className="panel setting-card"><ShieldCheck/><h3>Responsible use</h3><p>Movement observations are approximate. Do not use FLOWSTATE for diagnosis, emotion detection, employment decisions, or other high-stakes assessment.</p><span className="status active-status">USER-CENTRED</span></section>
    </div>
  </>;
}
