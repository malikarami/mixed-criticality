import {Job} from "./base/Job";
import {ReadyQueue} from "./base/ReadyQueue";
import {Scheduler} from "./base/Scheduler";
import {CONFIG} from "../app";
import {LogLevelSettings} from "../types";

export class Logger {
  rQ!: ReadyQueue;
  scheduler!: Scheduler;
  setting!: LogLevelSettings;
  off: boolean = false;

  constructor(settings: LogLevelSettings, on = true) {
    this.off = !on;
    this.setting = settings;
  }

  setUp(rQ: ReadyQueue, scheduler: Scheduler) {
    this.rQ = rQ;
    this.scheduler = scheduler;
  }

  utilization(us: { U11: number; U22: number; U21: number; u: number; U12: number, necessityCheck: boolean, feasibilityCheck: boolean }) {
    if (this.off || !this.setting.utilization) return;
    console.log(us);
  }

  arrival(time: number, job: Job, ignored: boolean){
    if(this.off || !this.setting.arrival) return;;
    if (this.off) return;
    console.log('→ job:', job.id, 'arrived at', time, ignored ? 'but is ignored': '');
  }

  feasibilityTest(isFeasible: boolean, policy: string){
    if(this.off || !this.setting.feasibilityTest) return;
    console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
    console.log(
      "This task set is",
      isFeasible ? "" : "not",
      CONFIG.traditional ? "Schedulable" : "MC-Schedulable"
    );
    console.log(
      "Strategy:",
      CONFIG.traditional ? "traditional-edf" : policy,
      "With",
      `"${CONFIG.overrunWatchingMechanism}"`,
      "as overrun watching mechanism",
      "And",
      `${CONFIG.overrunProbabilityPercentage}% chance of overrun for each job`,
    );
    console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
  }

  preemption(time: number, preempter: Job, preempted: Job){
    if(this.off || !this.setting.preemption) return;
    console.warn(
      "---> 🚫️ ",
      preempter.id,
      "with deadline:",
      preempter.deadline,
      "preempted",
      preempted?.id,
      "with deadline:",
      preempted.deadline
    );
  }

  overrun(time: number, overrunners: Job[], byDeadlineMiss = false){
    if(this.off || !this.setting.overrun) return;
    console.error(
      "---> 🧨 jobs",
      overrunners.map((j) => `${j.id} (reaching WCET: ${j.minimumExecutionTime} by ${j.overrun} units overrun | d: ${j.deadline})`),
      byDeadlineMiss
        ? "missed high criticality deadlines at:"
        : "overran at:",
      time
    );
    console.log("---> ❌ ~ MODE CHANGE ~ ❌");
    if (this.rQ && this.setting.readyQ) console.log("new readyQ:", this.rQ._toString());
  }

  jobFinish(time: number, job: Job){
    if(this.off || !this.setting.jobFinish) return;
    console.log("✅  job:", job.id, "is finished at time:", time);
  }

  deadlineMiss(time: number, jobs: Job[]){
    if(this.off || !this.setting.deadlineMiss) return;
    console.error(
      "---> ⌛️ DEADLINE MISS at time:",
      time,
      jobs.map(
        (j) =>
          j.id +
          " with remaining: " +
          j.remainingExecutionTime +
          " of " +
          j.expectedExecutionTime
      )
    );
  }

  dispatch(time: number, job: Job){
    if(this.off || !this.setting.dispatch) return;
    if(job) console.log('🏳️job:', job.id, 'dispatched at', time);
  }

  failure(time: number, jobs: Job[]){
    if(this.off || !this.setting.failure) return;
    console.error(
      "---> 🧨 jobs",
      jobs.map((j) => `${j.id} (reaching C(LO): ${j.minimumExecutionTime} by ${j.overrun} units overrun | d: ${j.deadline})`),
      "missed high criticality deadlines at:",
      time
    );
    console.log(
      "❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌"
    );
  }

  schedule(){
    if(this.off || !this.setting.schedule) return;
    if (this.scheduler) {
      console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~SCHEDULE~~~~~~~~~~~~~~~~~~~~~~~~~~");
      Object.keys(this.scheduler.mapping)
        .sort((a, b) => Number(a) - Number(b))
        .forEach((time) => {
          const job = this.scheduler.mapping[time]?.id?.split("-")?.[1];
          const task = this.scheduler.mapping[time]?.id?.split("-")?.[0];
          console.log(
            Number(time),
            `<-- ${!job || !task ? "IDLE" : `T${task} (J${job})`}`
          );
        });
    }
  }

  printReadyQueue(time: number, rQ: ReadyQueue) {
    if(this.off ||  !this.setting.readyQ) return;
    console.log(rQ._toString());
  }

  static printDivider(time?: number) {
    if (time !== undefined) {
      console.log(
        "****************************",
        time,
        "****************************"
      );
    }
    else console.log(
      "---------------------------------------------------------------------"
    );
  }

  printClock(c: number, startTime: number, job: Job) {
    if(this.off ||  !this.setting.clock) return;
    const timeUnitTakenByEachClock = 1 / CONFIG.frequency;
    console.log(
      `c${c}:`,
      "running",
      job?.id || "IDLE",
      "from",
      `${(startTime + timeUnitTakenByEachClock * c).toFixed(1)}`,
      "to",
      `${(startTime + timeUnitTakenByEachClock * (c +1)).toFixed(1)}`,
      `(remaining: ${job.remainingExecutionTime.toFixed(1)})`
    );
  }
}