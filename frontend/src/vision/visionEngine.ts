import { FaceLandmarker, FilesetResolver, HandLandmarker, ObjectDetector, PoseLandmarker, type HandLandmarkerResult, type NormalizedLandmark } from "@mediapipe/tasks-vision";
import { OpenCvMotionAnalyzer } from "./openCvMotion";
import { WorkoutAnalyzer, type WorkoutMetrics } from "./workoutAnalyzer";

export const POSE_LANDMARKS = [
  { index: 0, name: "nose", label: "Nose", region: "head" },
  { index: 1, name: "leftEyeInner", label: "Left eye inner", region: "head" },
  { index: 2, name: "leftEye", label: "Left eye", region: "head" },
  { index: 3, name: "leftEyeOuter", label: "Left eye outer", region: "head" },
  { index: 4, name: "rightEyeInner", label: "Right eye inner", region: "head" },
  { index: 5, name: "rightEye", label: "Right eye", region: "head" },
  { index: 6, name: "rightEyeOuter", label: "Right eye outer", region: "head" },
  { index: 7, name: "leftEar", label: "Left ear", region: "head" },
  { index: 8, name: "rightEar", label: "Right ear", region: "head" },
  { index: 9, name: "mouthLeft", label: "Left mouth", region: "head" },
  { index: 10, name: "mouthRight", label: "Right mouth", region: "head" },
  { index: 11, name: "leftShoulder", label: "Left shoulder", region: "torso" },
  { index: 12, name: "rightShoulder", label: "Right shoulder", region: "torso" },
  { index: 13, name: "leftElbow", label: "Left elbow", region: "leftArm" },
  { index: 14, name: "rightElbow", label: "Right elbow", region: "rightArm" },
  { index: 15, name: "leftWrist", label: "Left wrist", region: "leftArm" },
  { index: 16, name: "rightWrist", label: "Right wrist", region: "rightArm" },
  { index: 17, name: "leftPinky", label: "Left pinky", region: "leftArm" },
  { index: 18, name: "rightPinky", label: "Right pinky", region: "rightArm" },
  { index: 19, name: "leftIndex", label: "Left index finger", region: "leftArm" },
  { index: 20, name: "rightIndex", label: "Right index finger", region: "rightArm" },
  { index: 21, name: "leftThumb", label: "Left thumb", region: "leftArm" },
  { index: 22, name: "rightThumb", label: "Right thumb", region: "rightArm" },
  { index: 23, name: "leftHip", label: "Left hip", region: "torso" },
  { index: 24, name: "rightHip", label: "Right hip", region: "torso" },
  { index: 25, name: "leftKnee", label: "Left knee", region: "leftLeg" },
  { index: 26, name: "rightKnee", label: "Right knee", region: "rightLeg" },
  { index: 27, name: "leftAnkle", label: "Left ankle", region: "leftLeg" },
  { index: 28, name: "rightAnkle", label: "Right ankle", region: "rightLeg" },
  { index: 29, name: "leftHeel", label: "Left heel", region: "leftLeg" },
  { index: 30, name: "rightHeel", label: "Right heel", region: "rightLeg" },
  { index: 31, name: "leftFootIndex", label: "Left foot", region: "leftLeg" },
  { index: 32, name: "rightFootIndex", label: "Right foot", region: "rightLeg" }
] as const;

export const BODY_REGIONS = [
  { id: "head", label: "Head", indices: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
  { id: "torso", label: "Torso", indices: [11, 12, 23, 24] },
  { id: "leftArm", label: "Left arm & hand", indices: [13, 15, 17, 19, 21] },
  { id: "rightArm", label: "Right arm & hand", indices: [14, 16, 18, 20, 22] },
  { id: "leftLeg", label: "Left leg & foot", indices: [25, 27, 29, 31] },
  { id: "rightLeg", label: "Right leg & foot", indices: [26, 28, 30, 32] }
] as const;

export const POSE_CONNECTIONS: readonly [PoseLandmarkName, PoseLandmarkName][] = [
  ["nose", "leftEyeInner"], ["leftEyeInner", "leftEye"], ["leftEye", "leftEyeOuter"], ["leftEyeOuter", "leftEar"],
  ["nose", "rightEyeInner"], ["rightEyeInner", "rightEye"], ["rightEye", "rightEyeOuter"], ["rightEyeOuter", "rightEar"],
  ["mouthLeft", "mouthRight"], ["leftEar", "leftShoulder"], ["rightEar", "rightShoulder"],
  ["leftShoulder", "rightShoulder"], ["leftShoulder", "leftElbow"], ["leftElbow", "leftWrist"],
  ["leftWrist", "leftPinky"], ["leftWrist", "leftIndex"], ["leftWrist", "leftThumb"],
  ["rightShoulder", "rightElbow"], ["rightElbow", "rightWrist"], ["rightWrist", "rightPinky"],
  ["rightWrist", "rightIndex"], ["rightWrist", "rightThumb"], ["leftShoulder", "leftHip"],
  ["rightShoulder", "rightHip"], ["leftHip", "rightHip"], ["leftHip", "leftKnee"],
  ["leftKnee", "leftAnkle"], ["leftAnkle", "leftHeel"], ["leftHeel", "leftFootIndex"],
  ["rightHip", "rightKnee"], ["rightKnee", "rightAnkle"], ["rightAnkle", "rightHeel"],
  ["rightHeel", "rightFootIndex"]
];

export const HAND_LANDMARKS = [
  "Wrist", "Thumb CMC", "Thumb MCP", "Thumb IP", "Thumb tip",
  "Index MCP", "Index PIP", "Index DIP", "Index tip",
  "Middle MCP", "Middle PIP", "Middle DIP", "Middle tip",
  "Ring MCP", "Ring PIP", "Ring DIP", "Ring tip",
  "Pinky MCP", "Pinky PIP", "Pinky DIP", "Pinky tip"
] as const;
export const HAND_CONNECTIONS: readonly [number, number][] = [
  [0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],
  [9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]
];

export type BodyRegion = typeof BODY_REGIONS[number]["id"];
export type PoseLandmarkName = typeof POSE_LANDMARKS[number]["name"];
export type HandSide = "left" | "right";
export type PoseLandmarkObservation = {
  name: PoseLandmarkName;
  label: string;
  region: BodyRegion;
  x: number;
  y: number;
  visibility: number;
  visible: boolean;
  motion: number;
};
export type BodyPartMotion = Record<BodyRegion, number>;
export type HandLandmarkObservation = {
  side: HandSide;
  index: number;
  label: string;
  x: number;
  y: number;
  visible: boolean;
  visibility: number;
  motion: number;
};

export type VisionMetrics = {
  personVisible: boolean;
  action: "no person detected" | "mostly still" | "head movement" | "left hand movement" | "right hand movement" | "both hands moving" | "left arm movement" | "right arm movement" | "both arms moving" | "torso movement" | "left leg movement" | "right leg movement" | "legs moving" | "body movement" | "walking" | "motion in view";
  poseLandmarks: PoseLandmarkObservation[];
  handLandmarks: HandLandmarkObservation[];
  handTrackingAvailable: boolean;
  bodyPartMotion: BodyPartMotion | null;
  handMotion: Record<HandSide, number | null> | null;
  bodyPartVisibility: Record<BodyRegion, number> | null;
  activity: "sitting" | "standing" | "walking" | "typing" | "away" | "moving" | "present" | "unknown";
  posture: "upright" | "slouching" | "leaning" | "unknown";
  postureScore: number | null;
  staticSeconds: number | null;
  movementProxy: number;
  workout: WorkoutMetrics;
  screenFacing: boolean | null;
  gazeDirection: "center" | "left" | "right" | "up" | "down" | "unknown";
  blinkCount: number;
  blinkRatePerMinute: number | null;
  phoneVisible: boolean;
  phoneUseLikely: boolean;
  phoneConfidence: number | null;
  objectDetectionAvailable: boolean;
  openCvStatus: "loading" | "ready" | "unavailable";
  openCvMotionScore: number | null;
  openCvChangedPercent: number | null;
  confidence: number;
};

type Point = {x:number;y:number;z:number;visibility:number};
type PoseState = {x:number;y:number;z:number;visibility:number};
type PhoneBox = {left:number;top:number;right:number;bottom:number;score:number};
type MotionSample = {at:number;value:number};

const POSE_MODEL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
const FACE_MODEL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const OBJECT_MODEL = "https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float32/1/efficientdet_lite0.tflite";
const HAND_MODEL = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

const midpoint = (a:Point,b:Point):Point => ({x:(a.x+b.x)/2,y:(a.y+b.y)/2,z:(a.z+b.z)/2,visibility:Math.min(a.visibility,b.visibility)});
const visible = (point:NormalizedLandmark|undefined):point is Point => !!point && (point.visibility ?? 1) > .4;
const average = (values:number[]) => values.length ? values.reduce((sum,value)=>sum+value,0)/values.length : 0;
const clamp = (value:number,min=0,max=1) => Math.max(min,Math.min(max,value));

function jointAngle(hip:Point,knee:Point,ankle:Point) {
  const ax=hip.x-knee.x, ay=hip.y-knee.y, bx=ankle.x-knee.x, by=ankle.y-knee.y;
  const denominator=Math.hypot(ax,ay)*Math.hypot(bx,by);
  if (!denominator) return null;
  return Math.acos(clamp((ax*bx+ay*by)/denominator,-1,1))*180/Math.PI;
}

export class VisionEngine {
  private pose?: PoseLandmarker;
  private face?: FaceLandmarker;
  private hands?: HandLandmarker;
  private objects?: ObjectDetector;
  private lastRun = 0;
  private lastObjectRun = 0;
  private lastPresenceAt = 0;
  private lastMeaningfulMovementAt = 0;
  private lastBlinkAt = 0;
  private trackingStartedAt = 0;
  private previousPose?: PoseState[];
  private previousPoseMotion: number[] = [];
  private previousHands: Partial<Record<HandSide, PoseState[]>> = {};
  private previousHandMotion: Partial<Record<HandSide, number[]>> = {};
  private previousTorso?: Point;
  private previousWrists?: Point;
  private previousLeftAnkle?: Point;
  private previousRightAnkle?: Point;
  private wasBlinking = false;
  private blinkTimes: number[] = [];
  private handMotion: MotionSample[] = [];
  private walkingSince = 0;
  private phoneBox: PhoneBox | null = null;
  private phoneLastSeenAt = 0;
  private phoneDetectionAvailable = false;
  private handTrackingAvailable = false;
  private motionAnalyzer?: OpenCvMotionAnalyzer;
  private openCvUnavailable = false;
  private sensitivity = 1;
  private workoutAnalyzer = new WorkoutAnalyzer();

  constructor(private readonly motionSensitivity: "low" | "balanced" | "high" = "balanced") {}

  get supportsObjectDetection(){return this.phoneDetectionAvailable;}
  get supportsHandTracking(){return this.handTrackingAvailable;}

  async initialize() {
    this.motionAnalyzer = new OpenCvMotionAnalyzer();
    this.sensitivity = this.motionSensitivity === "high" ? 1.5 : this.motionSensitivity === "low" ? .7 : 1;
    void this.motionAnalyzer.initialize(this.sensitivity).catch(() => {
      this.motionAnalyzer?.close();
      this.motionAnalyzer = undefined;
      this.openCvUnavailable = true;
    });
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
    );
    let delegate: "GPU" | "CPU" = "GPU";
    try {
      await this.initializeLandmarkers(vision, delegate);
    } catch {
      this.closeLandmarkers();
      delegate = "CPU";
      await this.initializeLandmarkers(vision, delegate);
    }
    try {
      this.objects = await ObjectDetector.createFromOptions(vision, {
        baseOptions:{modelAssetPath:OBJECT_MODEL,delegate},
        runningMode:"VIDEO",scoreThreshold:.45,maxResults:5,categoryAllowlist:["cell phone"]
      });
      this.phoneDetectionAvailable = true;
    } catch {
      try {
        this.objects = await ObjectDetector.createFromOptions(vision, {
          baseOptions:{modelAssetPath:OBJECT_MODEL,delegate:delegate==="GPU"?"CPU":"GPU"},
          runningMode:"VIDEO",scoreThreshold:.45,maxResults:5,categoryAllowlist:["cell phone"]
        });
        this.phoneDetectionAvailable = true;
      } catch {
        this.objects = undefined;
        this.phoneDetectionAvailable = false;
      }
    }
    try {
      this.hands = await HandLandmarker.createFromOptions(vision, {
        baseOptions:{modelAssetPath:HAND_MODEL,delegate},
        runningMode:"VIDEO",numHands:2,minHandDetectionConfidence:.45,minHandPresenceConfidence:.45,minTrackingConfidence:.45
      });
      this.handTrackingAvailable = true;
    } catch {
      try {
        this.hands = await HandLandmarker.createFromOptions(vision, {
          baseOptions:{modelAssetPath:HAND_MODEL,delegate:delegate==="GPU"?"CPU":"GPU"},
          runningMode:"VIDEO",numHands:2,minHandDetectionConfidence:.45,minHandPresenceConfidence:.45,minTrackingConfidence:.45
        });
        this.handTrackingAvailable = true;
      } catch {
        this.hands = undefined;
        this.handTrackingAvailable = false;
      }
    }
  }

  private async initializeLandmarkers(vision:Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>,delegate:"GPU"|"CPU") {
    const pose=await PoseLandmarker.createFromOptions(vision,{baseOptions:{modelAssetPath:POSE_MODEL,delegate},runningMode:"VIDEO",numPoses:1});
    try {
      const face=await FaceLandmarker.createFromOptions(vision,{baseOptions:{modelAssetPath:FACE_MODEL,delegate},runningMode:"VIDEO",numFaces:1,outputFaceBlendshapes:true});
      this.pose=pose;
      this.face=face;
    } catch(error) {
      pose.close();
      throw error;
    }
  }

  detect(video:HTMLVideoElement):VisionMetrics|null {
    const now=performance.now();
    if(now-this.lastRun<220||!this.pose||!this.face||video.readyState<2)return null;
    this.lastRun=now;
    if(!this.trackingStartedAt)this.trackingStartedAt=now;

    const poseResult=this.pose.detectForVideo(video,now);
    const faceResult=this.face.detectForVideo(video,now);
    const body=poseResult.landmarks?.[0];
    const face=faceResult.faceLandmarks?.[0];
    const poseLandmarks:PoseLandmarkObservation[]=[];
    const currentPose:PoseState[]=[];
    const currentPoseMotion:number[]=[];
    if(body){
      for(const landmark of POSE_LANDMARKS){
        const point=body[landmark.index];
        if(!point)continue;
        const visibility=point.visibility??1;
        const previous=this.previousPose?.[landmark.index];
        const rawMotion=previous&&visibility>.4&&previous.visibility>.4
          ?clamp(Math.hypot(point.x-previous.x,point.y-previous.y,(point.z-previous.z)*.5)*32*this.sensitivity)
          :0;
        const motion=clamp((this.previousPoseMotion[landmark.index]??0)*.55+rawMotion*.45);
        currentPose[landmark.index]={x:point.x,y:point.y,z:point.z,visibility};
        currentPoseMotion[landmark.index]=motion;
        poseLandmarks.push({
          name:landmark.name,label:landmark.label,region:landmark.region,
          x:point.x,y:point.y,visibility,visible:visibility>.4,motion
        });
      }
      this.previousPose=currentPose;
      this.previousPoseMotion=currentPoseMotion;
    }else{
      this.previousPose=undefined;
      this.previousPoseMotion=[];
    }
    let handResult:HandLandmarkerResult|undefined;
    if(this.hands){
      try{
        handResult=this.hands.detectForVideo(video,now);
      }catch{
        this.hands.close();
        this.hands=undefined;
        this.handTrackingAvailable=false;
      }
    }
    const handLandmarks:HandLandmarkObservation[]=[];
    const currentHands:Partial<Record<HandSide,PoseState[]>>={};
    const currentHandMotion:Partial<Record<HandSide,number[]>>={};
    const handMotion:Record<HandSide,number|null>|null=this.handTrackingAvailable?{left:null,right:null}:null;
    for(let handIndex=0;handIndex<(handResult?.landmarks.length??0);handIndex++){
      const points=handResult!.landmarks[handIndex];
      const handedness=handResult!.handedness[handIndex]?.[0]?.categoryName?.toLowerCase();
      const side:HandSide=handedness==="right"?"right":handedness==="left"?"left":handIndex===0?"left":"right";
      const previous=this.previousHands[side];
      const previousMotion=this.previousHandMotion[side]??[];
      const nextState:PoseState[]=[];
      const nextMotion:number[]=[];
      for(let index=0;index<Math.min(points.length,HAND_LANDMARKS.length);index++){
        const point=points[index];
        const visibility=point.visibility??1;
        const old=previous?.[index];
        const rawMotion=old&&visibility>.4&&old.visibility>.4
          ?clamp(Math.hypot(point.x-old.x,point.y-old.y,(point.z-old.z)*.5)*36*this.sensitivity)
          :0;
        const motion=clamp((previousMotion[index]??0)*.55+rawMotion*.45);
        nextState[index]={x:point.x,y:point.y,z:point.z,visibility};
        nextMotion[index]=motion;
        handLandmarks.push({
          side,index,label:HAND_LANDMARKS[index],x:point.x,y:point.y,visible:visibility>.4,visibility,motion
        });
      }
      currentHands[side]=nextState;
      currentHandMotion[side]=nextMotion;
      const highestMotion=nextMotion.slice().sort((a,b)=>b-a).slice(0,5);
      if(handMotion)handMotion[side]=average(highestMotion);
    }
    this.previousHands=currentHands;
    this.previousHandMotion=currentHandMotion;
    const bodyPartMotion:BodyPartMotion|null=body?{head:0,torso:0,leftArm:0,rightArm:0,leftLeg:0,rightLeg:0}:null;
    const bodyPartVisibility:Record<BodyRegion,number>|null=body?{head:0,torso:0,leftArm:0,rightArm:0,leftLeg:0,rightLeg:0}:null;
    if(bodyPartMotion&&bodyPartVisibility){
      for(const region of BODY_REGIONS){
        const tracked=poseLandmarks.filter(point=>point.region===region.id&&point.visible);
        const highestMotion=tracked.map(point=>point.motion).sort((a,b)=>b-a).slice(0,2);
        bodyPartMotion[region.id]=average(highestMotion);
        bodyPartVisibility[region.id]=tracked.length;
      }
      bodyPartMotion.leftArm=Math.max(bodyPartMotion.leftArm,handMotion?.left??0);
      bodyPartMotion.rightArm=Math.max(bodyPartMotion.rightArm,handMotion?.right??0);
    }
    const bodyMotion=bodyPartMotion
      ?Math.max(...Object.values(bodyPartMotion),handMotion?.left??0,handMotion?.right??0)
      :Math.max(handMotion?.left??0,handMotion?.right??0);
    const facePresent=!!face;
    const shoulders=body&&visible(body[11])&&visible(body[12])?midpoint(body[11],body[12]):null;
    const hips=body&&visible(body[23])&&visible(body[24])?midpoint(body[23],body[24]):null;
    const torso=shoulders&&hips?midpoint(shoulders,hips):null;
    const nose=body&&visible(body[0])?body[0]:face?.[1];
    const personVisible=facePresent||!!shoulders||!!body?.some(point=>visible(point))||handLandmarks.some(point=>point.visible);
    if(personVisible){
      if(this.lastPresenceAt&&now-this.lastPresenceAt>8000)this.lastMeaningfulMovementAt=now;
      this.lastPresenceAt=now;
    }

    let movementProxy=0;
    if(torso&&this.previousTorso){
      const movement=Math.hypot(torso.x-this.previousTorso.x,torso.y-this.previousTorso.y, (torso.z-this.previousTorso.z)*.5);
      movementProxy=clamp(movement*24*this.sensitivity);
      if(movementProxy>.075)this.lastMeaningfulMovementAt=now;
    } else if(personVisible&&!this.lastMeaningfulMovementAt){
      this.lastMeaningfulMovementAt=now;
    }
    if(torso)this.previousTorso=torso;
    const poseMovementProxy=movementProxy;
    if(bodyMotion>.16&&personVisible)this.lastMeaningfulMovementAt=now;
    movementProxy=Math.max(movementProxy,bodyMotion*.72);

    let openCvMotionScore:number|null=null;
    let openCvChangedPercent:number|null=null;
    const openCvSample=this.motionAnalyzer?.analyze(video)??null;
    if(openCvSample){
      openCvMotionScore=openCvSample.score;
      openCvChangedPercent=openCvSample.changedPercent;
      movementProxy=Math.max(movementProxy,openCvSample.score);
      if(personVisible&&openCvSample.score>.19)this.lastMeaningfulMovementAt=now;
    }

    const leftWrist=body&&visible(body[15])?body[15]:null;
    const rightWrist=body&&visible(body[16])?body[16]:null;
    const wrists=leftWrist&&rightWrist?midpoint(leftWrist,rightWrist):null;
    let wristMotion=0;
    if(wrists&&this.previousWrists)wristMotion=clamp(Math.hypot(wrists.x-this.previousWrists.x,wrists.y-this.previousWrists.y)*30*this.sensitivity);
    if(wrists)this.previousWrists=wrists;
    this.handMotion.push({at:now,value:wristMotion});
    this.handMotion=this.handMotion.filter(sample=>now-sample.at<5000);

    const kneeAngles:number[]=[];
    if(body){
      for(const [hipIndex,kneeIndex,ankleIndex] of [[23,25,27],[24,26,28]]){
        const hip=body[hipIndex],knee=body[kneeIndex],ankle=body[ankleIndex];
        if(visible(hip)&&visible(knee)&&visible(ankle)){
          const angle=jointAngle(hip,knee,ankle);
          if(angle!==null)kneeAngles.push(angle);
        }
      }
    }
    const meanKneeAngle=kneeAngles.length?average(kneeAngles):null;
    const sitting=meanKneeAngle!==null&&meanKneeAngle<125;
    const standing=meanKneeAngle!==null&&meanKneeAngle>145;
    const leftAnkle=body&&visible(body[27])?body[27]:null;
    const rightAnkle=body&&visible(body[28])?body[28]:null;
    const ankleDeltas=[
      leftAnkle&&this.previousLeftAnkle?Math.hypot(leftAnkle.x-this.previousLeftAnkle.x,leftAnkle.y-this.previousLeftAnkle.y):0,
      rightAnkle&&this.previousRightAnkle?Math.hypot(rightAnkle.x-this.previousRightAnkle.x,rightAnkle.y-this.previousRightAnkle.y):0
    ];
    const ankleMotion=clamp(average(ankleDeltas)*30*this.sensitivity);
    if(leftAnkle)this.previousLeftAnkle=leftAnkle;
    if(rightAnkle)this.previousRightAnkle=rightAnkle;
    if(ankleMotion>.17&&meanKneeAngle!==null){
      if(!this.walkingSince)this.walkingSince=now;
    }else this.walkingSince=0;
    const walking=!!this.walkingSince&&now-this.walkingSince>1400;
    const typing=this.handMotion.filter(sample=>sample.value>.06).length>=3&&!!wrists&&wrists.y>.52&&poseMovementProxy<.18;

    let posture:"upright"|"slouching"|"leaning"|"unknown"="unknown";
    let postureScore:number|null=null;
    if(shoulders&&hips&&nose){
      const trunkHeight=Math.max(.08,hips.y-shoulders.y);
      const trunkLean=Math.abs(Math.atan2(shoulders.x-hips.x,trunkHeight))*180/Math.PI;
      const forwardHead=clamp((shoulders.z-nose.z)/trunkHeight);
      postureScore=clamp(1-forwardHead*2.1-trunkLean/70);
      posture=postureScore<.48?"slouching":trunkLean>18?"leaning":"upright";
    }

    let screenFacing:boolean|null=null;
    let gazeDirection:VisionMetrics["gazeDirection"]="unknown";
    if(face&&face.length>263){
      const leftEye=face[33],rightEye=face[263],eyeSpan=Math.max(.025,Math.abs(rightEye.x-leftEye.x));
      const eyeCenter=(leftEye.x+rightEye.x)/2;
      const headTurn=Math.abs(face[1].x-eyeCenter)/eyeSpan;
      screenFacing=headTurn<.32;
      const irisCenter=(indices:number[])=>{
        const points=indices.map(index=>face[index]).filter(Boolean);
        return points.length?{x:average(points.map(point=>point.x)),y:average(points.map(point=>point.y))}:null;
      };
      const leftIris=irisCenter([468,469,470,471,472]);
      const rightIris=irisCenter([473,474,475,476,477]);
      if(leftIris&&rightIris){
        const irisX=average([leftIris.x,rightIris.x]);
        const irisY=average([leftIris.y,rightIris.y]);
        const horizontal=(irisX-eyeCenter)/eyeSpan;
        const upper=average([face[159].y,face[386].y]);
        const lower=average([face[145].y,face[374].y]);
        const vertical=(irisY-(upper+lower)/2)/Math.max(.012,lower-upper);
        if(vertical<-.25)gazeDirection="up";
        else if(vertical>.25)gazeDirection="down";
        else if(horizontal<-.14)gazeDirection="left";
        else if(horizontal>.14)gazeDirection="right";
        else gazeDirection="center";
      } else if(screenFacing)gazeDirection="center";
    }

    const blendshapes=faceResult.faceBlendshapes?.[0]?.categories??[];
    const blendshape=(name:string)=>blendshapes.find(category=>category.categoryName===name)?.score??0;
    const blinkLevel=average([blendshape("eyeBlinkLeft"),blendshape("eyeBlinkRight")]);
    if(blinkLevel>.58&&!this.wasBlinking&&now-this.lastBlinkAt>180){
      this.blinkTimes.push(now);
      this.lastBlinkAt=now;
    }
    this.wasBlinking=blinkLevel>.58;
    this.blinkTimes=this.blinkTimes.filter(time=>now-time<=60000);
    const observedMinutes=Math.max(1/6,(now-this.trackingStartedAt)/60000);
    const blinkRatePerMinute=facePresent?this.blinkTimes.length/Math.min(1,observedMinutes):null;

    if(this.objects&&now-this.lastObjectRun>=1200){
      this.lastObjectRun=now;
      try{
        const detections=this.objects.detectForVideo(video,now).detections;
        const phone=detections.flatMap(detection=>detection.categories.map(category=>({category,detection})))
          .filter(item=>/cell ?phone/i.test(`${item.category.categoryName} ${item.category.displayName}`))
          .sort((a,b)=>b.category.score-a.category.score)[0];
        if(phone?.detection.boundingBox){
          const box=phone.detection.boundingBox;
          this.phoneBox={left:box.originX/video.videoWidth,top:box.originY/video.videoHeight,right:(box.originX+box.width)/video.videoWidth,bottom:(box.originY+box.height)/video.videoHeight,score:phone.category.score};
          this.phoneLastSeenAt=now;
        }else if(now-this.phoneLastSeenAt>3200)this.phoneBox=null;
      }catch{
        this.objects.close();this.objects=undefined;this.phoneDetectionAvailable=false;this.phoneBox=null;
      }
    }
    const phoneBox=this.phoneBox;
    const phoneVisible=!!phoneBox&&now-this.phoneLastSeenAt<=3200;
    const phoneNearHand=phoneVisible&&!!phoneBox&&[leftWrist,rightWrist].some(wrist=>!!wrist&&wrist.x>=phoneBox.left-.1&&wrist.x<=phoneBox.right+.1&&wrist.y>=phoneBox.top-.1&&wrist.y<=phoneBox.bottom+.1);

    const staticSeconds=personVisible?Math.max(0,(now-this.lastMeaningfulMovementAt)/1000):null;
    const jointMotion=new Map(poseLandmarks.map(point=>[point.name,point.motion]));
    const getJointMotion=(name:PoseLandmarkName)=>jointMotion.get(name)??0;
    const leftHandMotion=Math.max(handMotion?.left??0,getJointMotion("leftWrist"),getJointMotion("leftPinky"),getJointMotion("leftIndex"),getJointMotion("leftThumb"));
    const rightHandMotion=Math.max(handMotion?.right??0,getJointMotion("rightWrist"),getJointMotion("rightPinky"),getJointMotion("rightIndex"),getJointMotion("rightThumb"));
    const leftArmMotion=bodyPartMotion?.leftArm??0;
    const rightArmMotion=bodyPartMotion?.rightArm??0;
    const leftLegMotion=bodyPartMotion?.leftLeg??0;
    const rightLegMotion=bodyPartMotion?.rightLeg??0;
    let action:VisionMetrics["action"]="mostly still";
    if(!personVisible)action="no person detected";
    else if(walking)action="walking";
    else if(leftHandMotion>.16&&rightHandMotion>.16)action="both hands moving";
    else if(leftHandMotion>.16)action="left hand movement";
    else if(rightHandMotion>.16)action="right hand movement";
    else if(leftArmMotion>.17&&rightArmMotion>.17)action="both arms moving";
    else if(leftArmMotion>.17)action="left arm movement";
    else if(rightArmMotion>.17)action="right arm movement";
    else if((bodyPartMotion?.head??0)>.16)action="head movement";
    else if(leftLegMotion>.18&&rightLegMotion>.18)action="legs moving";
    else if(leftLegMotion>.18)action="left leg movement";
    else if(rightLegMotion>.18)action="right leg movement";
    else if((bodyPartMotion?.torso??0)>.17||poseMovementProxy>.14)action="torso movement";
    else if(bodyMotion>.12)action="body movement";
    else if((openCvMotionScore??0)>.22)action="motion in view";
    const workout=this.workoutAnalyzer.update(poseLandmarks,now);
    let activity:VisionMetrics["activity"]="unknown";
    if(!personVisible)activity=now-Math.max(this.lastPresenceAt,this.trackingStartedAt)>10000?"away":"unknown";
    else if(phoneNearHand)activity="moving";
    else if(walking)activity="walking";
    else if(typing)activity="typing";
    else if(sitting)activity="sitting";
    else if(standing)activity="standing";
    else if(movementProxy>.14)activity="moving";
    else activity="present";

    return {
      personVisible,action,poseLandmarks,handLandmarks,handTrackingAvailable:this.handTrackingAvailable,
      bodyPartMotion,bodyPartVisibility,handMotion,activity,posture,postureScore,staticSeconds,movementProxy,screenFacing,gazeDirection,
      workout,
      blinkCount:this.blinkTimes.length,blinkRatePerMinute,phoneVisible,phoneUseLikely:phoneNearHand,
      phoneConfidence:phoneVisible?this.phoneBox?.score??null:null,objectDetectionAvailable:this.phoneDetectionAvailable,
      openCvStatus:this.motionAnalyzer?.ready?"ready":this.openCvUnavailable?"unavailable":"loading",
      openCvMotionScore,openCvChangedPercent,
      confidence:personVisible ? .75 : .2
    };
  }

  private closeLandmarkers(){this.pose?.close();this.face?.close();this.pose=undefined;this.face=undefined;}

  beginSession(){
    const now=performance.now();
    this.trackingStartedAt=now;
    this.lastMeaningfulMovementAt=now;
    this.blinkTimes=[];
    this.workoutAnalyzer.reset();
  }

  close(){
    this.closeLandmarkers();
    this.hands?.close();this.hands=undefined;this.handTrackingAvailable=false;
    this.objects?.close();this.objects=undefined;
    this.motionAnalyzer?.close();this.motionAnalyzer=undefined;
    this.openCvUnavailable=false;
    this.previousPose=undefined;this.previousPoseMotion=[];this.previousHands={};this.previousHandMotion={};
    this.previousTorso=undefined;this.previousWrists=undefined;this.previousLeftAnkle=undefined;this.previousRightAnkle=undefined;
    this.blinkTimes=[];this.handMotion=[];this.phoneBox=null;
    this.workoutAnalyzer.reset();
  }
}
