import {Config, ExecTimeGeneratorModes, LO, LogLevelSettings, SimulationConfig, TaskSetConfig} from "./types";

type Configurations = {
  simulation: SimulationConfig,
  scheduling: Config,
  tasks: TaskSetConfig,
  log: {
    enabled: boolean;
    setting: LogLevelSettings;
  },
}

const configurations : Configurations=  {
  simulation: {
    duration: 5, // duration for which the simulation would run
    overrunProbabilityPercentage: 0,  // probability of actual C to be grater than C(LO)
    ExecTimeGeneratorMode: "level",
  },
  scheduling: {
    exactOverrunTime: 2, // some integer time greater than 0, when this value is greater than 0, the overrunPossibility is ignored
    overrunWatchingMechanism: "per_clock", // deprecated -> ignore
    traditional: false, // traditional EDF instead of EDF-VD
    workDonePerClock: 0.1, // indicating amount of work done in each clock -> main purpose: customizing the simulation for floating point values (example: a CPU with speed less than one)
    frequency: 10, // f clock per time unit => (f * wpc) operation done in time unit = CPU Speed
    initialSystemLevel: LO,
  },
  tasks: {
    n: 4, // number of tasks
    u: 0.8, // total system utilization
    CF: 4, // criticality factor, > 1
    CP: 0.44, // criticality proportion, < 1
    minPeriod: 5,
    maxPeriod: 20,
  },
  log: {
    enabled: true,
    setting: {
      time: true,
      utilization: true,
      arrival: true,
      feasibilityTest: true,
      preemption: true,
      overrun: true,
      jobFinish: true,
      deadlineMiss: true,
      dispatch: true,
      failure: true,
      schedule: true,
      readyQ: true,
      clock: true,
    }
  }
}

export default configurations;