import {Job} from "./Job";

export const LO = "LO";
export const HI = "HI";
export type CriticalityLevel = "LO" | "HI";
export type SchedulingPolicy = "edf" | "edf-vd";
export type ExecutionTime = {
  LO: number;
  HI: number;
};
export type SystemLog = {
  arrivals?: Job[];
  preemptions?: Job[];
  executedJobs?: Job[];
  deadlineMisses?: Job[];
  finshedJobs?: Job[];
  overrun?: boolean;
};
export type TaskInitiator = {
  id: string;
  period: number; // Int
  c: ExecutionTime; // Float
  level: CriticalityLevel;
  deadline?: number; // Float
  phase?: number;
};
