import {Job} from "./Job";
import {Log, CONFIG} from "../../app";


// a single core

export class CPU {
  public frequency: number;
  private currentJob?: Job;

  constructor(s: number) {
    this.frequency = s;
  }

  process(
    startTime: number,
    runTimeMonitorPerClock: (j: Job | undefined, c: number) => void
  ) {
    for (let clock = 0; clock < this.frequency; clock++) {
      this.run(startTime, clock);
      runTimeMonitorPerClock(this.currentJob, clock);
    }
  }

  run(st: number, c: number): Job | undefined {
    const timeUnitTakenByEachClock = 1 / CONFIG.frequency;
    const start = Number((st + timeUnitTakenByEachClock * c).toFixed(1))
    const end = Number((st + timeUnitTakenByEachClock * (c +1)).toFixed(1))
    if (this.currentJob) {
      this.currentJob.execute(CONFIG.workDonePerClock, end);
      Log.printClock(c, start, end, this.currentJob);
    }
    return this.currentJob;
  }

  assign(newJob: Job, t: number) {
    if (this.currentJob && this.isPreemption(t, newJob)) Log.preemption(t, newJob, this.currentJob);
    this.currentJob = newJob;
  }

  private isPreemption(t: number, newJob: Job) {
    const isPreemption = newJob &&
      !this.currentJob?.isFinished() /* && !this.currentJob?.hasMissedDeadline(t)*/ &&
      newJob.id !== this.currentJob?.id;
    return isPreemption
  }

}