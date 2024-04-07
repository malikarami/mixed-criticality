import {CriticalityLevel, LO} from "../types";

// system can also be defined as a class
type System = {
  level: CriticalityLevel;
  virtualDeadlineFactor: number;
}
export const SYSTEM: System = {
  level: LO,
  virtualDeadlineFactor: 1,
}