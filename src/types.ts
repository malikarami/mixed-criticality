import {Task} from "./classes/base/Task";

export const LO = "LO";
export const HI = "HI";

export type CriticalityLevel = "LO" | "HI";
export type SchedulingPolicy = "edf" | "edf-vd";
export type ExecutionTime = {
  LO: number;
  HI: number;
};

export type TaskInitiator = Pick<Task, 'period' | 'utilization' | 'c' | 'id' | 'deadline' | 'level'> & {phase?: number};

export type TaskSetInitiator = {
  tasks: TaskInitiator[];
  id: string;
}

export type Config = {
  traditional: boolean;
  // 1 for integers, 01 for floats
  workDonePerClock: 0.1 | 1; // note that if you set this value to 1, all of the execution times in your system will also be set to integers. this is a kind of stepper for
  frequency: number;
  overrunWatchingMechanism: "per_clock" | "per_execution";
  exactOverrunTime: number;
  initialSystemLevel: CriticalityLevel;
};

export type LogLevelSettings = {
  utilization: boolean;
  arrival: boolean;
  feasibilityTest: boolean;
  preemption: boolean;
  overrun: boolean;
  jobFinish: boolean;
  deadlineMiss: boolean;
  dispatch: boolean;
  failure: boolean;
  schedule: boolean;
  readyQ: boolean;
  clock: boolean;
};

export type TaskSetConfig = {
  n: number; // number of tasks
  u: number; // total system utilization
  CP: number; // criticality proportion
  CF: number; // criticality factor, > 1
}