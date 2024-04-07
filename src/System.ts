import {CriticalityLevel, LO} from "./types";

// read-only values are denoted with _
export type SystemConfig = {
  level: CriticalityLevel;
  virtualDeadlineFactor: number;
  _traditional: boolean;
  // 1 for integers, 01 for floats
  _workDonePerClock: 0.1 | 1; // note that if you set this value to 1, all of the execution times in your system will also be set to integers. this is a kind of stepper for
  _frequency: number;
  _overrunWatchingMechanism: "per_clock" | "per_execution";
  _overrunProbabilityPercentage: number;
  _exactOverrunTime: number;
};
export const SYSTEM: SystemConfig = {
  level: LO,
  virtualDeadlineFactor: 1,
  // _actualExecutionTime: "random-with-high-cap",
  _overrunProbabilityPercentage: 40, // probability of actual C to be grater than C(LO)
  _exactOverrunTime: 1,
  _workDonePerClock: 0.1, // indicating amount of work done in each clock -> main purpose: customizing the simulation for floating point values (example: a CPU with speed less than one)
  _frequency: 5, // f clock per time unit => (f * wpc) operation done in time unit = CPU Speed
  _overrunWatchingMechanism: "per_clock",
  _traditional: false, // traditional EDF instead of EDF-VD
} as const;