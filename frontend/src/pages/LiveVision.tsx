import { useEffect, useRef, useState } from "react";
import { Activity, Camera, CameraOff, Check, CircleStop, LoaderCircle, Play, ShieldCheck, Sparkles, Timer, Footprints, Hand, Dumbbell } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../services/api";
import { BODY_REGIONS, HAND_CONNECTIONS, HAND_LANDMARKS, POSE_CONNECTIONS, POSE_LANDMARKS, VisionEngine, type VisionMetrics } from "../vision/visionEngine";
import { WORKOUT_EXERCISES, type WorkoutExerciseId, type WorkoutPhase } from "../vision/workoutAnalyzer";
import { readVisionPreferences } from "../state/visionPreferences";

type TrendPoint = {
  time:string;
  movement:number;
  action:string;
  posture:number|null;
  screenFacing:number|null;
  activity:string;
  gaze:string;
  blinkRate:number|null;
  phone:boolean;
  cvMotion:number|null;
  cvChanged:number|null;
  workoutTotal:number;
};

const activityLabel:Record<VisionMetrics["activity"],string>={
  sitting:"Sitting (estimated)",standing:"Standing (estimated)",walking:"Walking (estimated)",typing:"Typing-like hand movement",
  away:"Away / not visible",moving:"Moving",present:"Present; activity unclear",unknown:"Waiting for a clear view"
};
const actionLabel:Record<VisionMetrics["action"],string>={
  "no person detected":"No person detected",
  "mostly still":"Mostly still",
  "head movement":"Head movement",
  "left hand movement":"Left hand movement",
  "right hand movement":"Right hand movement",
  "both hands moving":"Both hands moving",
  "left arm movement":"Left arm movement",
  "right arm movement":"Right arm movement",
  "both arms moving":"Both arms moving",
  "torso movement":"Torso movement",
  "left leg movement":"Left leg movement",
  "right leg movement":"Right leg movement",
  "legs moving":"Legs moving",
  "body movement":"Body movement",
  walking:"Walking",
  "motion in view":"Motion in view"
};
const postureLabel:Record<VisionMetrics["posture"],string>={upright:"Upright",slouching:"Slouched",leaning:"Leaning",unknown:"Not enough landmarks"};
const gazeLabel:Record<VisionMetrics["gazeDirection"],string>={center:"Near center",left:"Left",right:"Right",up:"Up",down:"Down",unknown:"Unavailable"};
const workoutPhaseLabel:Record<WorkoutPhase,string>={ready:"Ready",top:"Top",bottom:"Bottom",open:"Open",closed:"Closed"};

function cameraMessage(error:unknown){
  if(!(error instanceof DOMException))return error instanceof Error?error.message:"Camera could not be started.";
  if(error.name==="NotAllowedError"||error.name==="SecurityError")return "Camera permission is blocked. Allow camera access for this page, then try again.";
  if(error.name==="NotFoundError"||error.name==="DevicesNotFoundError")return "No camera was found. Connect a camera and try again.";
  if(error.name==="NotReadableError"||error.name==="TrackStartError")return "The camera is already in use by another app. Close that app and try again.";
  return `Camera could not be started: ${error.message}`;
}

function duration(seconds:number|null|undefined){
  if(seconds===null||seconds===undefined)return "—";
  const total=Math.floor(seconds);
  return total>=60?`${Math.floor(total/60)}m ${total%60}s`:`${total}s`;
}

function motionPercent(value:number|null|undefined){
  return value===null||value===undefined?"—":`${Math.round(value*100)}%`;
}

function workoutLabel(id:WorkoutExerciseId|null|undefined){
  return id?WORKOUT_EXERCISES.find(exercise=>exercise.id===id)?.label??null:null;
}

export default function LiveVision(){
  const [preferences]=useState(readVisionPreferences);
  const videoRef=useRef<HTMLVideoElement>(null);
  const engineRef=useRef<VisionEngine|null>(null);
  const streamRef=useRef<MediaStream|null>(null);
  const timerRef=useRef<number|null>(null);
  const sessionRef=useRef<number|null>(null);
  const writeRef=useRef<Promise<void>|null>(null);
  const lastSavedAtRef=useRef(0);
  const sessionStartedAtRef=useRef<number|null>(null);
  const [camera,setCamera]=useState(false);
  const [cameraLoading,setCameraLoading]=useState(false);
  const [analyzing,setAnalyzing]=useState(false);
  const [startingSession,setStartingSession]=useState(false);
  const [endingSession,setEndingSession]=useState(false);
  const [elapsed,setElapsed]=useState(0);
  const [error,setError]=useState("");
  const [modelNote,setModelNote]=useState("");
  const [metrics,setMetrics]=useState<VisionMetrics|null>(null);
  const [sessionId,setSessionId]=useState<number|null>(null);
  const [history,setHistory]=useState<TrendPoint[]>([]);
  const [title,setTitle]=useState("Focus session");

  function releaseCamera(){
    if(timerRef.current!==null)window.cancelAnimationFrame(timerRef.current);
    timerRef.current=null;
    streamRef.current?.getTracks().forEach(track=>track.stop());
    streamRef.current=null;
    engineRef.current?.close();
    engineRef.current=null;
  }
  function stopCamera(){releaseCamera();setCamera(false);setAnalyzing(false);setMetrics(null);}

  useEffect(()=>()=>{
    const activeSession=sessionRef.current;
    if(activeSession!==null)void api.finishSession(activeSession).catch(()=>{});
    releaseCamera();
  },[]);
  useEffect(()=>{
    if(!sessionId||sessionStartedAtRef.current===null)return;
    const interval=window.setInterval(()=>setElapsed(Math.floor((Date.now()-sessionStartedAtRef.current!)/1000)),1000);
    return ()=>window.clearInterval(interval);
  },[sessionId]);

  function toTrendPoint(current:VisionMetrics):TrendPoint{
    return {
      time:new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}),
      movement:Math.round(current.movementProxy*100),
      action:actionLabel[current.action],
      posture:current.postureScore===null?null:Math.round(current.postureScore*100),
      screenFacing:current.screenFacing===null?null:current.screenFacing?100:0,
      activity:activityLabel[current.activity],gaze:gazeLabel[current.gazeDirection],
      blinkRate:current.blinkRatePerMinute===null?null:Math.round(current.blinkRatePerMinute),phone:current.phoneUseLikely,
      cvMotion:current.openCvMotionScore===null?null:Math.round(current.openCvMotionScore*100),
      cvChanged:current.openCvChangedPercent===null?null:Math.round(current.openCvChangedPercent),
      workoutTotal:current.workout.totalReps
    };
  }
  async function saveMetrics(id:number,current:VisionMetrics){
    const snapshot={
      person_visible:current.personVisible,action:current.action,activity:current.activity,posture:current.posture,posture_score:current.postureScore,
      static_seconds:current.staticSeconds,movement_proxy:current.movementProxy,screen_facing:current.screenFacing,
      gaze_direction:current.gazeDirection,blink_count:current.blinkCount,blink_rate_per_minute:current.blinkRatePerMinute,
      phone_visible:current.phoneVisible,phone_use_likely:current.phoneUseLikely,phone_confidence:current.phoneConfidence,
      object_detection_available:current.objectDetectionAvailable,opencv_status:current.openCvStatus,
      opencv_motion_score:current.openCvMotionScore,opencv_changed_percent:current.openCvChangedPercent,
      pose_landmarks_visible:current.poseLandmarks.filter(point=>point.visible).length,
      body_part_motion:current.bodyPartMotion,body_part_visibility:current.bodyPartVisibility,
      hand_tracking_available:current.handTrackingAvailable,hand_landmarks_visible:current.handLandmarks.filter(point=>point.visible).length,
      hand_motion:current.handMotion,
      workout_reps:current.workout.repCounts,workout_phases:current.workout.phases,
      workout_active_exercise:current.workout.activeExercise,workout_last_rep:current.workout.lastRep,
      workout_total_reps:current.workout.totalReps,
      confidence:current.confidence,captured_at:new Date().toISOString()
    };
    await api.addEvent(id,"vision_snapshot",current.movementProxy,current.confidence,snapshot);
    setHistory(previous=>[...previous,toTrendPoint(current)].slice(-40));
    lastSavedAtRef.current=Date.now();
  }

  function beginAnalysis(stream:MediaStream){
    setAnalyzing(true);setModelNote("");
    void (async()=>{
      const engine=new VisionEngine(preferences.motionSensitivity);
      try{
        await engine.initialize();
        if(streamRef.current!==stream){engine.close();return;}
        engineRef.current=engine;
        if(sessionRef.current!==null)engine.beginSession();
        const modelNotes:string[]=[];
        if(!engine.supportsObjectDetection)modelNotes.push("Phone detection could not load on this device.");
        if(!engine.supportsHandTracking)modelNotes.push("Detailed finger tracking could not load; body pose tracking remains available.");
        if(modelNotes.length)setModelNote(modelNotes.join(" "));
        const loop=()=>{
          const video=videoRef.current,activeEngine=engineRef.current;
          if(!video||!activeEngine||streamRef.current!==stream)return;
          try{
            const result=activeEngine.detect(video);
            if(result){
              setMetrics(result);
              const activeSession=sessionRef.current;
              if(activeSession!==null&&Date.now()-lastSavedAtRef.current>=15000&&!writeRef.current){
                lastSavedAtRef.current=Date.now();
                const pending=saveMetrics(activeSession,result);
                writeRef.current=pending;
                void pending.catch(cause=>setError(cause instanceof Error?cause.message:"Session observations could not be saved."))
                  .finally(()=>{if(writeRef.current===pending)writeRef.current=null;});
              }
            }
          }catch{
            setModelNote("The camera is on, but live analysis stopped. You can still save the session duration.");
            engineRef.current?.close();engineRef.current=null;setAnalyzing(false);return;
          }
          timerRef.current=window.requestAnimationFrame(loop);
        };
        loop();
      }catch{
        engine.close();
        if(streamRef.current===stream)setModelNote("Camera preview is ready, but one or more signal models could not load. Check internet access and reload to retry.");
      }finally{if(streamRef.current===stream)setAnalyzing(false);}
    })();
  }

  async function startCamera(){
    if(streamRef.current)return true;
    setCameraLoading(true);setError("");setModelNote("");
    try{
      if(!navigator.mediaDevices?.getUserMedia)throw new Error("Camera access needs a modern browser on localhost or a secure HTTPS page.");
      const resolution=preferences.cameraResolution==="1080p"?{width:1920,height:1080}:{width:1280,height:720};
      const stream=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:resolution.width},height:{ideal:resolution.height}},audio:false});
      streamRef.current=stream;
      const video=videoRef.current;
      if(!video)throw new Error("The camera preview is not ready. Reload the page and try again.");
      video.srcObject=stream;await video.play();setCamera(true);beginAnalysis(stream);return true;
    }catch(cause){releaseCamera();setCamera(false);setError(cameraMessage(cause));return false;}
    finally{setCameraLoading(false);}
  }

  async function startSession(){
    setStartingSession(true);setError("");setHistory([]);setElapsed(0);
    try{
      if(!streamRef.current&&!(await startCamera()))return;
      const session=await api.createSession(title.trim()||"Focus session");
      sessionRef.current=session.id;setSessionId(session.id);sessionStartedAtRef.current=Date.now();lastSavedAtRef.current=Date.now();
      engineRef.current?.beginSession();
    }catch(cause){setError(cause instanceof Error?cause.message:"The session could not be started.");}
    finally{setStartingSession(false);}
  }

  async function sendSnapshot(){
    if(sessionId===null||!metrics)return;
    try{
      if(writeRef.current)await writeRef.current;
      const pending=saveMetrics(sessionId,metrics);writeRef.current=pending;await pending;setError("");
    }catch(cause){setError(cause instanceof Error?cause.message:"Session observations could not be saved.");}
    finally{writeRef.current=null;}
  }

  async function endSession(){
    if(sessionId===null)return;
    setEndingSession(true);setError("");
    try{
      if(writeRef.current)await writeRef.current;
      if(metrics)await saveMetrics(sessionId,metrics);
      await api.finishSession(sessionId);
      sessionRef.current=null;sessionStartedAtRef.current=null;setSessionId(null);stopCamera();
    }catch(cause){setError(cause instanceof Error?cause.message:"The session could not be finished.");}
    finally{setEndingSession(false);}
  }

  const posturePrompt=metrics?.posture==="slouching"?"Try a comfortable reset: let your shoulders relax and bring your screen closer to eye level.":null;
  const breakPrompt=(metrics?.staticSeconds??0)>=180?"You have been fairly still for a while. Consider standing, stretching, or taking a short walk.":null;
  const phonePrompt=metrics?.phoneUseLikely?"A phone appears close to a hand. If it is pulling you away, try placing it just out of reach.":null;
  const intervention=posturePrompt||breakPrompt||phonePrompt;
  const chartData=history.map(point=>({...point,posture:point.posture,screenFacing:point.screenFacing}));
  const posePoints=new Map((metrics?.poseLandmarks??[]).map(point=>[point.name,point]));
  const handPoints=new Map((metrics?.handLandmarks??[]).map(point=>[`${point.side}-${point.index}`,point]));
  const visiblePoseCount=metrics?.poseLandmarks.filter(point=>point.visible).length??0;
  const visibleHandCount=metrics?.handLandmarks.filter(point=>point.visible).length??0;
  const activeWorkoutLabel=workoutLabel(metrics?.workout.activeExercise);
  const lastWorkoutLabel=workoutLabel(metrics?.workout.lastRep);

  return <div className="live-experience">
    <div className="page-heading"><div><div className="eyebrow">FLOWSTATE / WORKSPACE</div><h1>Live session</h1><p className="muted">A clear, private read on movement, posture, and focus patterns.</p></div><div className="privacy-pill"><ShieldCheck size={15}/> Video stays on this device</div></div>
    <div className="live-layout">
      <section className="panel camera-panel">
        <div className="panel-head"><div><h3>Session space</h3>        <p className="muted">For workout counts, keep your full body—including hips, knees, and ankles—in frame with good lighting.</p></div><span className={camera?"status active-status":"status"}>{camera?"CAMERA ON":"CAMERA OFF"}</span></div>
        <div className="video-stage">
          <video ref={videoRef} className={`video-feed${!camera?" video-hidden":""}${preferences.mirrorPreview?"":" video-unmirrored"}`} muted playsInline autoPlay/>
          {camera&&preferences.showPoseOverlay&&(visiblePoseCount>0||visibleHandCount>0)&&<svg className={`pose-overlay${preferences.mirrorPreview?" mirrored":""}`} viewBox="0 0 1 1" preserveAspectRatio="none" aria-label="Estimated full-body and hand landmarks">
            {POSE_CONNECTIONS.map(([from,to])=>{
              const start=posePoints.get(from),end=posePoints.get(to);
              return start?.visible&&end?.visible?<line className={`pose-edge region-${start.region}`} key={`${from}-${to}`} x1={start.x} y1={start.y} x2={end.x} y2={end.y}/>:null;
            })}
            {metrics?.poseLandmarks.filter(point=>point.visible).map(point=><circle className={`pose-node region-${point.region}`} key={point.name} cx={point.x} cy={point.y} r=".006"/> )}
            {(["left","right"] as const).flatMap(side=>HAND_CONNECTIONS.map(([from,to])=>{
              const start=handPoints.get(`${side}-${from}`),end=handPoints.get(`${side}-${to}`);
              return start?.visible&&end?.visible?<line className={`hand-edge ${side}-hand`} key={`${side}-${from}-${to}`} x1={start.x} y1={start.y} x2={end.x} y2={end.y}/>:null;
            }))}
            {metrics?.handLandmarks.filter(point=>point.visible).map(point=><circle className={`hand-node ${point.side}-hand`} key={`${point.side}-${point.index}`} cx={point.x} cy={point.y} r=".004"/> )}
          </svg>}
          {camera&&<div className="video-overlay"><span className="live-dot"/> PRIVATE LIVE PREVIEW</div>}
          {!camera&&<div className="camera-placeholder"><div className="camera-orb"><Camera size={28}/></div><b>Your workspace is ready</b><p>Start a session and allow camera access when your browser asks.</p><small>Frames are analyzed here and are never uploaded.</small></div>}
          {camera&&<div className="camera-timestamp"><span className="live-dot"/> Live preview</div>}
        </div>
        <div className="camera-signal-strip">
          <div><small>BODY + HAND LANDMARKS</small><b>{metrics?`${visiblePoseCount}/33 body · ${visibleHandCount}/42 hand`:camera?"Searching…":"Ready"}</b></div>
          <div><small>DETECTED ACTION</small><b>{metrics?actionLabel[metrics.action]:"Waiting for camera"}</b></div>
          <div><small>FRAME MOTION</small><b>{metrics?.openCvStatus==="ready"&&metrics.openCvMotionScore!==null?`${Math.round(metrics.openCvMotionScore*100)}% intensity`:"Warming up"}</b></div>
        </div>
        <div className="camera-actions">
          {!sessionId&&<input className="session-title-input" value={title} onChange={event=>setTitle(event.target.value)} aria-label="Session name" maxLength={160}/>}
          {!sessionId?<button className="primary-btn" onClick={startSession} disabled={startingSession||cameraLoading}>{startingSession||cameraLoading?<LoaderCircle className="spin" size={16}/>:<Play size={16}/>} {startingSession?"Starting session…":cameraLoading?"Opening camera…":"Start session"}</button>:<><span className="recording-label"><span className="record-dot"/> SESSION IN PROGRESS</span><button className="secondary-btn" onClick={sendSnapshot} disabled={!metrics}><Check size={16}/> Save now</button><button className="primary-btn end-session-btn" onClick={endSession} disabled={endingSession}>{endingSession?<LoaderCircle className="spin" size={16}/>:<CircleStop size={16}/>} {endingSession?"Finishing…":"End session"}</button></>}
          {!sessionId&&<button className="secondary-btn" onClick={camera?stopCamera:startCamera} disabled={cameraLoading||startingSession}>{camera?<CameraOff size={16}/>:<Camera size={16}/>} {camera?"Stop preview":cameraLoading?"Opening…":"Preview camera"}</button>}
        </div>
        {sessionId!==null&&<div className="session-elapsed"><Timer size={15}/> Session time <b>{duration(elapsed)}</b></div>}
        {error&&<div className="error-box" role="alert">{error}</div>}
        {modelNote&&<div className="inline-note" role="status">{modelNote}</div>}
      </section>

      <section className="panel metrics-panel"><div className="panel-head"><div><h3>Live indicators</h3><p className="muted">Actions and visual signals, as detected</p></div><Activity size={18} className="accent-icon"/></div>
        <div className="activity-status"><span className="activity-icon"><Footprints size={18}/></span><div><small>DETECTED ACTION</small><b>{metrics?actionLabel[metrics.action]:analyzing?"Loading local models…":"Waiting for camera"}</b><small className="activity-context">{metrics?`Context: ${activityLabel[metrics.activity]}`:"Actions are estimated from motion and pose cues."}</small></div></div>
        <section className="workout-panel" aria-label="Workout repetition counter">
          <div className="workout-heading"><span className="workout-icon"><Dumbbell size={16}/></span><div><b>Workout counter</b><small>{!camera?"Turn on camera to detect":activeWorkoutLabel?`${activeWorkoutLabel} detected`:metrics?"Move through a complete rep":"Finding body landmarks…"}</small></div><span className={activeWorkoutLabel?"status active-status":"status"}>{!camera?"OFF":activeWorkoutLabel?"ACTIVE":"AUTO"}</span></div>
          <div className="workout-total"><strong>{metrics?.workout.totalReps??0}</strong><span>reps {sessionId!==null?"this session":"in preview"}</span><small>{!camera?"Turn on camera to count reps":lastWorkoutLabel?`Last rep: ${lastWorkoutLabel}`:"Counts update after a complete movement"}</small></div>
          <div className="workout-exercise-grid">{WORKOUT_EXERCISES.map(exercise=><div className={`workout-exercise${metrics?.workout.activeExercise===exercise.id?" is-active":""}`} key={exercise.id}>
            <strong>{metrics?.workout.repCounts[exercise.id]??0}</strong><b>{exercise.label}</b><small>{workoutPhaseLabel[metrics?.workout.phases[exercise.id]??"ready"]}</small>
          </div>)}</div>
          <p className="workout-hint">Counts push-ups, dips, squats, lunges, jumping jacks, sit-ups, and curls. Keep your full body visible; a side view helps for push-ups, dips, and sit-ups.</p>
        </section>
        <div className="opencv-card"><div className="opencv-card-head"><span><i className={metrics?.openCvStatus==="ready"?"engine-light is-ready":"engine-light"}/><b>OpenCV motion</b></span><small>{metrics?.openCvStatus===undefined||metrics.openCvStatus==="loading"?"LOADING":metrics.openCvStatus==="ready"?"LIVE":"UNAVAILABLE"}</small></div><div className="motion-track"><i style={{width:`${Math.round((metrics?.openCvMotionScore??0)*100)}%`}}/></div><div className="opencv-card-foot"><b>{metrics?.openCvMotionScore===null||metrics?.openCvMotionScore===undefined?"Waiting":`${Math.round(metrics.openCvMotionScore*100)}% motion`}</b><span>{metrics?.openCvChangedPercent===null||metrics?.openCvChangedPercent===undefined?"Analyzing frames":`${metrics.openCvChangedPercent.toFixed(1)}% frame change`}</span></div></div>
        <div className="body-part-panel">
          <div className="body-part-heading"><div><b>Whole-body movement</b><small>{metrics?`${visiblePoseCount} of 33 pose points · ${visibleHandCount} of 42 finger points visible`:"Tracking body and detailed hand landmarks"}</small></div><span className="status">{metrics?.personVisible?"TRACKING":"WAITING"}</span></div>
          <div className="body-region-grid">{BODY_REGIONS.map(region=>{
            const score=metrics?.bodyPartMotion?.[region.id]??null;
            const visible=metrics?.bodyPartVisibility?.[region.id]??0;
            return <div className={`body-region region-${region.id}`} key={region.id}>
              <div><b>{region.label}</b><small>{visible}/{region.indices.length} points</small></div>
              <strong>{score===null?"—":`${Math.round(score*100)}%`}</strong>
              <div className="region-track"><i style={{width:`${Math.round((score??0)*100)}%`}}/></div>
            </div>;
          })}</div>
          <details className="landmark-details">
            <summary>Inspect all 33 landmarks</summary>
            <div className="landmark-grid">{POSE_LANDMARKS.map(landmark=>{
              const point=posePoints.get(landmark.name);
              return <span className={`landmark-chip region-${landmark.region}${point?.visible?"":" is-hidden"}`} key={landmark.name} title={`${landmark.label} · ${landmark.region}`}>
                <i/><b>{landmark.label}</b><small>{point?.visible?`${Math.round(point.motion*100)}% motion`:"Not visible"}</small>
              </span>;
            })}</div>
          </details>
          <div className="hand-tracking-row"><Hand size={14}/><span><b>Finger tracking</b><small>{metrics?metrics.handTrackingAvailable?"21 landmarks per hand":"Hand landmark model unavailable":analyzing?"Loading hand model…":"Loads when camera starts"}</small></span><strong>{motionPercent(metrics?.handMotion?.left)} / {motionPercent(metrics?.handMotion?.right)}</strong></div>
          <details className="landmark-details">
            <summary>Inspect 42 hand landmarks</summary>
            <div className="landmark-grid">{(["left","right"] as const).flatMap(side=>HAND_LANDMARKS.map((label,index)=>{
              const point=handPoints.get(`${side}-${index}`);
              return <span className={`landmark-chip hand-landmark-chip ${side}-hand${point?.visible?"":" is-hidden"}`} key={`${side}-${index}`} title={`${side} ${label}`}>
                <i/><b>{side==="left"?"L":"R"} · {label}</b><small>{point?.visible?`${Math.round(point.motion*100)}% motion`:metrics?metrics.handTrackingAvailable?"Not visible":"Unavailable":analyzing?"Loading":"Waiting"}</small>
              </span>;
            }))}</div>
          </details>
        </div>
        <Metric label="Posture" value={metrics?postureLabel[metrics.posture]:"Waiting"} good={metrics?.posture==="upright"}/>
        <Metric label="Still posture" value={duration(metrics?.staticSeconds)}/>
        <Metric label="Facing camera" value={metrics?.screenFacing===null||metrics?.screenFacing===undefined?"Unavailable":metrics.screenFacing?"Likely":"Not detected"} good={!!metrics?.screenFacing}/>
        <Metric label="Gaze direction" value={metrics?gazeLabel[metrics.gazeDirection]:"Waiting"}/>
        <Metric label="Blink estimate" value={metrics?.blinkRatePerMinute===null||metrics?.blinkRatePerMinute===undefined?"Unavailable":`${metrics.blinkRatePerMinute.toFixed(0)} / min`}/>
        <Metric label="Phone visible" value={metrics?.phoneVisible?"Detected":metrics?.objectDetectionAvailable?"Not detected":"Model unavailable"}/>
        <Metric label="Phone near hand" value={metrics?.phoneUseLikely?"Possible":metrics?.objectDetectionAvailable?"Not detected":"Model unavailable"} good={false}/>
        <div className="metric-disclaimer">MediaPipe estimates up to 33 body and 21 landmarks per hand; OpenCV measures overall frame motion. Occluded or out-of-frame parts cannot be tracked, and these estimates cannot read intent or work quality.</div>
      </section>
    </div>

    <section className="panel trends-panel"><div className="panel-head"><div><h3>Session patterns</h3><p className="muted">Movement, posture, and workout counts recorded during this session.</p></div><span className="status">{history.length} SAVED CHECKS</span></div>
      {history.length>1?<ResponsiveContainer width="100%" height={240}><LineChart data={chartData} margin={{top:8,right:12,left:-15,bottom:0}}><CartesianGrid strokeDasharray="3 3" stroke="#263441"/><XAxis dataKey="time" stroke="#7f909f" tick={{fontSize:10}}/><YAxis domain={[0,100]} stroke="#7f909f" tick={{fontSize:10}}/><Tooltip contentStyle={{background:"#101a24",border:"1px solid #2a3a47",borderRadius:10,color:"#d5e0e7"}}/><Line type="monotone" dataKey="movement" name="Movement" stroke="#44d5c1" strokeWidth={2} dot={false}/><Line type="monotone" dataKey="posture" name="Posture estimate" stroke="#70a9ff" strokeWidth={2} dot={false} connectNulls/><Line type="monotone" dataKey="screenFacing" name="Facing camera" stroke="#b38aff" strokeWidth={2} dot={false} connectNulls/></LineChart></ResponsiveContainer>:<div className="empty-state trend-empty"><Activity/><b>{sessionId!==null?"Collecting session patterns":"Start a session to build a timeline"}</b><p>FLOWSTATE saves a compact local summary every 15 seconds. Camera frames are not stored.</p></div>}
      {history.length>0&&<div className="trend-events">{history.slice(-6).reverse().map((point,index)=><span className="trend-chip" key={`${point.time}-${index}`}><b>{point.time}</b>{point.action}<small>{point.activity}</small><small>Workout total: {point.workoutTotal} reps</small><small>OpenCV {point.cvMotion===null?"pending":`${point.cvMotion}% motion`}</small></span>)}</div>}
    </section>

    {intervention&&<div className="intervention-card"><div className="intervention-icon"><Sparkles size={17}/></div><div><small>OPTIONAL CHECK-IN</small><b>{posturePrompt?"Posture reset":breakPrompt?"A moment to move":"Phone nearby"}</b><p>{intervention}</p></div></div>}
    <div className="notice"><ShieldCheck size={18}/><div><b>Use these signals as prompts, not verdicts</b><p>Estimates can be affected by camera angle, clothing, lighting, and visibility. Sitting, typing, phone use, and attention are not reliably determined from every webcam view.</p></div></div>
  </div>;
}

function Metric({label,value,good}:{label:string;value:string;good?:boolean}){
  return <div className="metric-row"><span>{label}</span><b className={good?"good-text":""}>{value}</b></div>;
}
