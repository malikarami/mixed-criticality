import configurations from "./configurations";
import {Config, HI, LO, SimulationConfig, TaskSetConfig} from "./types";

const error = (message: string) => {
  const e = `Some of the configuration values are illegal: ${message}. Check your inputs in configurations.ts and try again!`;
  throw new Error(e);
}

function checkTasks(tasks: TaskSetConfig) {
  const {n, CP, CF, u, minPeriod, maxPeriod} = tasks;
  if(!(n && Number.isInteger(n))) error('tasks.n');
  if(!(CP && CP > 0 && CP < 1)) error('tasks.CP');
  if(!(CF && CF > 1)) error('tasks.CF');
  if(!(u && u > 0)) error('tasks.u');
  if( minPeriod && !Number.isInteger(minPeriod))  error('tasks.minPeriod');
  if( maxPeriod&& !Number.isInteger(maxPeriod)) error('tasks.maxPeriod');
}

function checkSimulationSettings(config: SimulationConfig) {
  const {duration, overrunProbabilityPercentage} = config;
  if(!(Number.isInteger(duration) && duration >= 0)) error('duration');
  if(!(overrunProbabilityPercentage >= 0 && overrunProbabilityPercentage <= 100)) error('overrunProbabilityPercentage');
}

function checkSchedulingSettings(scheduling: Config) {
 const {workDonePerClock, frequency, overrunWatchingMechanism, exactOverrunTime, initialSystemLevel} = scheduling;
 if(!(workDonePerClock && (workDonePerClock === 0.1 || workDonePerClock === 1))) error('workDonePerClock');
 if(!(frequency && frequency > 0 && Number.isInteger(frequency))) error('frequency');
 if(!(overrunWatchingMechanism && overrunWatchingMechanism === 'per_clock')) error('overrunWatchingMechanism');
 if(!(Number.isInteger(exactOverrunTime) && exactOverrunTime >= 0)) error('exactOverrunTime');
 if(!(initialSystemLevel && (initialSystemLevel === HI || initialSystemLevel === LO))) error('initialSystemLevel');
}

const validate = () => {
  checkTasks(configurations.tasks);
  checkSimulationSettings(configurations.simulation);
  checkSchedulingSettings(configurations.scheduling);
};


export default validate;