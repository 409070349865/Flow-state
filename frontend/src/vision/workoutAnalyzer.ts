import type { PoseLandmarkName, PoseLandmarkObservation } from "./visionEngine";

export const WORKOUT_EXERCISES = [
  { id: "pushups", label: "Push-ups" },
  { id: "dips", label: "Dips" },
  { id: "squats", label: "Squats" },
  { id: "lunges", label: "Lunges" },
  { id: "jumpingJacks", label: "Jumping jacks" },
  { id: "sitUps", label: "Sit-ups" },
  { id: "bicepCurls", label: "Bicep curls" }
] as const;

export type WorkoutExerciseId = typeof WORKOUT_EXERCISES[number]["id"];
export type WorkoutPhase = "ready" | "top" | "bottom" | "open" | "closed";
export type WorkoutMetrics = {
  repCounts: Record<WorkoutExerciseId, number>;
  phases: Record<WorkoutExerciseId, WorkoutPhase>;
  activeExercise: WorkoutExerciseId | null;
  lastRep: WorkoutExerciseId | null;
  totalReps: number;
};

type Joint = { x:number; y:number; visibility:number };
type Counter = { reps:number; phase:WorkoutPhase; lastActivityAt:number; lastRepAt:number };

function jointAngle(first:Joint,middle:Joint,last:Joint) {
  const ax=first.x-middle.x, ay=first.y-middle.y;
  const bx=last.x-middle.x, by=last.y-middle.y;
  const denominator=Math.hypot(ax,ay)*Math.hypot(bx,by);
  if(!denominator)return null;
  const cosine=Math.max(-1,Math.min(1,(ax*bx+ay*by)/denominator));
  return Math.acos(cosine)*180/Math.PI;
}

function mean(values:number[]) {
  return values.length?values.reduce((sum,value)=>sum+value,0)/values.length:null;
}

function newCounters():Record<WorkoutExerciseId,Counter>{
  return {
    pushups:{reps:0,phase:"ready",lastActivityAt:0,lastRepAt:0},
    dips:{reps:0,phase:"ready",lastActivityAt:0,lastRepAt:0},
    squats:{reps:0,phase:"ready",lastActivityAt:0,lastRepAt:0},
    lunges:{reps:0,phase:"ready",lastActivityAt:0,lastRepAt:0},
    jumpingJacks:{reps:0,phase:"ready",lastActivityAt:0,lastRepAt:0},
    sitUps:{reps:0,phase:"ready",lastActivityAt:0,lastRepAt:0},
    bicepCurls:{reps:0,phase:"ready",lastActivityAt:0,lastRepAt:0}
  };
}

export class WorkoutAnalyzer {
  private counters=newCounters();
  private lastRep:WorkoutExerciseId|null=null;

  reset(){
    this.counters=newCounters();
    this.lastRep=null;
  }

  update(landmarks:PoseLandmarkObservation[],now:number):WorkoutMetrics{
    const points=new Map(landmarks.filter(point=>point.visible).map(point=>[point.name,point]));
    const get=(name:PoseLandmarkName)=>points.get(name);
    const angle=(a:PoseLandmarkName,b:PoseLandmarkName,c:PoseLandmarkName)=>{
      const first=get(a),middle=get(b),last=get(c);
      return first&&middle&&last?jointAngle(first,middle,last):null;
    };
    const meanAngles=(triples:[PoseLandmarkName,PoseLandmarkName,PoseLandmarkName][])=>mean(triples.map(([a,b,c])=>angle(a,b,c)).filter((value):value is number=>value!==null));
    const elbowAngle=meanAngles([["leftShoulder","leftElbow","leftWrist"],["rightShoulder","rightElbow","rightWrist"]]);
    const leftKnee=angle("leftHip","leftKnee","leftAnkle");
    const rightKnee=angle("rightHip","rightKnee","rightAnkle");
    const knees=mean([leftKnee,rightKnee].filter((value):value is number=>value!==null));
    const leftShoulder=get("leftShoulder"),rightShoulder=get("rightShoulder");
    const leftHip=get("leftHip"),rightHip=get("rightHip");
    const shoulders=leftShoulder&&rightShoulder
      ?{x:(leftShoulder.x+rightShoulder.x)/2,y:(leftShoulder.y+rightShoulder.y)/2}
      :null;
    const hips=leftHip&&rightHip
      ?{x:(leftHip.x+rightHip.x)/2,y:(leftHip.y+rightHip.y)/2}
      :null;
    const trunkTilt=shoulders&&hips
      ?Math.atan2(Math.abs(shoulders.y-hips.y),Math.abs(shoulders.x-hips.x))*180/Math.PI
      :null;
    const wrists=[get("leftWrist"),get("rightWrist")].filter((point):point is NonNullable<typeof point>=>!!point);
    const elbowPoints=[get("leftElbow"),get("rightElbow")].filter((point):point is NonNullable<typeof point>=>!!point);
    const hipsPoints=[get("leftHip"),get("rightHip")].filter((point):point is NonNullable<typeof point>=>!!point);
    const meanY=(items:Joint[])=>mean(items.map(point=>point.y));
    const wristY=meanY(wrists),elbowY=meanY(elbowPoints),hipY=meanY(hipsPoints);
    const upright=trunkTilt!==null&&trunkTilt>55;
    const horizontal=trunkTilt!==null&&trunkTilt<35;
    const verticalWristsNearHips=wristY!==null&&hipY!==null&&wristY>hipY-.12;
    const wristAboveElbow=wristY!==null&&elbowY!==null&&wristY<elbowY-.015;

    const leftArm=get("leftShoulder")&&get("leftElbow")&&get("leftWrist")
      ?jointAngle(get("leftShoulder")!,get("leftElbow")!,get("leftWrist")!):null;
    const rightArm=get("rightShoulder")&&get("rightElbow")&&get("rightWrist")
      ?jointAngle(get("rightShoulder")!,get("rightElbow")!,get("rightWrist")!):null;
    const openArms=!!shoulders&&wrists.length===2&&wrists.every(point=>point.y<shoulders.y-.08);
    const shoulderWidth=get("leftShoulder")&&get("rightShoulder")
      ?Math.abs(get("leftShoulder")!.x-get("rightShoulder")!.x):null;
    const ankleWidth=get("leftAnkle")&&get("rightAnkle")
      ?Math.abs(get("leftAnkle")!.x-get("rightAnkle")!.x):null;
    const openLegs=shoulderWidth!==null&&ankleWidth!==null&&ankleWidth>shoulderWidth*1.25;
    const closedLegs=shoulderWidth!==null&&ankleWidth!==null&&ankleWidth<shoulderWidth*1.05;
    const closedArms=!!shoulders&&wrists.length===2&&wrists.every(point=>point.y>shoulders.y-.02);

    const pushup=this.counters.pushups;
    const pushupValid=horizontal&&knees!==null&&knees>135&&elbowAngle!==null;
    this.advance(pushup,"pushups",pushupValid,elbowAngle!==null&&elbowAngle<95,elbowAngle!==null&&elbowAngle>150,now);

    const dip=this.counters.dips;
    const dipContext=upright&&verticalWristsNearHips&&elbowAngle!==null;
    const dipBottom=dipContext&&elbowAngle<105&&wristY!==null&&elbowY!==null&&wristY>=elbowY-.02;
    const dipTop=dipContext&&elbowAngle>150;
    this.advance(dip,"dips",dipContext,dipBottom,dipTop,now);

    const squat=this.counters.squats;
    const situp=this.counters.sitUps;
    const situpRecentlyActive=situp.lastActivityAt>0&&now-situp.lastActivityAt<5000;
    const kneeDifference=leftKnee!==null&&rightKnee!==null?Math.abs(leftKnee-rightKnee):0;
    const squatValid=upright&&knees!==null&&!situpRecentlyActive&&situp.phase!=="bottom"&&(leftKnee===null||rightKnee===null||kneeDifference<38);
    this.advance(squat,"squats",squatValid,knees!==null&&knees<105,knees!==null&&knees>155,now);

    const lunge=this.counters.lunges;
    const lungeBottom=leftKnee!==null&&rightKnee!==null&&Math.min(leftKnee,rightKnee)<105&&Math.max(leftKnee,rightKnee)>125;
    const lungeTop=leftKnee!==null&&rightKnee!==null&&leftKnee>150&&rightKnee>150;
    this.advance(lunge,"lunges",upright&&leftKnee!==null&&rightKnee!==null,lungeBottom,lungeTop,now);

    const situpValid=trunkTilt!==null&&knees!==null&&knees<145;
    this.advance(situp,"sitUps",situpValid,trunkTilt!==null&&trunkTilt<22,trunkTilt!==null&&trunkTilt>55,now);

    const curl=this.counters.bicepCurls;
    const curledArm=[leftArm,rightArm].some(value=>value!==null&&value<78);
    const curlContext=upright&&elbowAngle!==null&&(wristAboveElbow||curl.phase==="bottom");
    this.advance(curl,"bicepCurls",curlContext,curledArm&&wristAboveElbow,elbowAngle!==null&&elbowAngle>150,now);

    const jack=this.counters.jumpingJacks;
    const jackValid=shoulderWidth!==null&&ankleWidth!==null&&wrists.length===2;
    const jackOpen=jackValid&&openArms&&openLegs;
    const jackClosed=jackValid&&closedArms&&closedLegs;
    if(jackValid){
      if(jackOpen){jack.phase="open";jack.lastActivityAt=now;}
      else if(jackClosed){
        if(jack.phase==="open"&&now-jack.lastRepAt>=350){
          jack.reps++;jack.lastRepAt=now;jack.lastActivityAt=now;this.lastRep="jumpingJacks";
        }
        jack.phase="closed";
      }
    }

    const repCounts:WorkoutMetrics["repCounts"]={
      pushups:0,dips:0,squats:0,lunges:0,jumpingJacks:0,sitUps:0,bicepCurls:0
    };
    const phases:WorkoutMetrics["phases"]={
      pushups:"ready",dips:"ready",squats:"ready",lunges:"ready",jumpingJacks:"ready",sitUps:"ready",bicepCurls:"ready"
    };
    let activeExercise:WorkoutExerciseId|null=null;
    let latestActivity=0;
    let totalReps=0;
    for(const exercise of WORKOUT_EXERCISES){
      const counter=this.counters[exercise.id];
      repCounts[exercise.id]=counter.reps;
      phases[exercise.id]=counter.phase;
      totalReps+=counter.reps;
      if(counter.lastActivityAt>latestActivity&&now-counter.lastActivityAt<5000){
        latestActivity=counter.lastActivityAt;
        activeExercise=exercise.id;
      }
    }
    return {repCounts,phases,activeExercise,lastRep:this.lastRep,totalReps};
  }

  private advance(counter:Counter,id:WorkoutExerciseId,valid:boolean,bottom:boolean,top:boolean,now:number){
    if(!valid)return;
    if(bottom){
      if(counter.phase!=="bottom")counter.lastActivityAt=now;
      counter.phase="bottom";
      return;
    }
    if(top){
      if(counter.phase==="bottom"&&now-counter.lastRepAt>=350){
        counter.reps++;
        counter.lastRepAt=now;
        counter.lastActivityAt=now;
        counter.phase="top";
        this.lastRep=id;
      }else if(counter.phase==="ready"){
        counter.phase="top";
      }else if(counter.phase!=="bottom"){
        counter.phase="top";
      }
    }
  }
}
