import configurations from "./configurations";
import {Config, HI, LO, TaskSetConfig} from "./types";

const error = (message: string) => {
  throw new Error(`'Some of the configuration values are illegal: ${message}. Check your inputs in configurations.ts and try again!`);
}

function checkTasks(tasks: TaskSetConfig) {
  const {n, CP, CF, u, minPriority, maxPriority} = tasks;
  if(!(n && Number.isInteger(n))) error('tasks.n');
  if(!(CP && CP > 0 && CP < 1)) error('tasks.CP');
  if(!(CF && CF > 1)) error('tasks.CF');
  if(!(u && u > 0)) error('tasks.u');
  if( minPriority && !Number.isInteger(minPriority))  error('tasks.minPriority');
  if(maxPriority && !Number.isInteger(maxPriority)) error('tasks.maxPriority');
}

function checkSimulationSettings(duration: number, overrunProbabilityPercentage: number) {
  if(!(duration && Number.isInteger(duration))) error('duration');
  if(!(overrunProbabilityPercentage && overrunProbabilityPercentage >= 0 && overrunProbabilityPercentage <= 100)) error('overrunProbabilityPercentage');
}

function checkSchedulingSettings(scheduling: Config) {
 const {workDonePerClock, frequency, overrunWatchingMechanism, exactOverrunTime, initialSystemLevel} = scheduling;
 if(!(workDonePerClock && (workDonePerClock === 0.1 || workDonePerClock === 1))) error('workDonePerClock');
 if(!(frequency && frequency > 0 && Number.isInteger(frequency))) error('frequency');
 if(!(overrunWatchingMechanism && overrunWatchingMechanism === 'per_clock')) error('overrunWatchingMechanism');
 if(!(exactOverrunTime && Number.isInteger(exactOverrunTime) && exactOverrunTime >= 0)) error('exactOverrunTime');
 if(!(initialSystemLevel && (initialSystemLevel === HI || initialSystemLevel === LO))) error('initialSystemLevel');
}

const validate = () => {
  checkTasks(configurations.tasks);
  checkSimulationSettings(configurations.duration, configurations.overrunProbabilityPercentage);
  checkSchedulingSettings(configurations.scheduling);
};


export default validate;