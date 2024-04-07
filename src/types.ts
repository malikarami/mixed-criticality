export const LO = "LO";
export const HI = "HI";

export type CriticalityLevel = "LO" | "HI";
export type SchedulingPolicy = "edf" | "edf-vd";
export type ExecutionTime = {
  LO: number;
  HI: number;
};

export type TaskInitiator = {
  id: string;
  period: number; // Int
  c: ExecutionTime; // Float
  level: CriticalityLevel;
  deadline?: number; // Float
  phase?: number;
};

export type Config = {
  traditional: boolean;
  // 1 for integers, 01 for floats
  workDonePerClock: 0.1 | 1; // note that if you set this value to 1, all of the execution times in your system will also be set to integers. this is a kind of stepper for
  frequency: number;
  overrunWatchingMechanism: "per_clock" | "per_execution";
  overrunProbabilityPercentage: number;
  exactOverrunTime: number;
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