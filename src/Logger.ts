import {Job} from "./Job";
import {ReadyQueue} from "./ReadyQueue";
import {SYSTEM} from "./System";
import {Scheduler} from "./Scheduler";

const logOff = false;
const logLevelSetting = {
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
} as const;

export class Logger {
  rQ!: ReadyQueue;
  scheduler!: Scheduler;

  constructor() {
  }

  setUp(rQ: ReadyQueue, scheduler: Scheduler) {
    this.rQ = rQ;
    this.scheduler = scheduler;
  }

  utilization(us: { U11: number; U22: number; U21: number; u: number; U12: number }) {
    if (logOff || !logLevelSetting.utilization) return;
    console.log(us);
  }

  arrival(time: number, job: Job, ignored: boolean){
    if(logOff || !logLevelSetting.arrival) return;;
    if (logOff) return;
    console.log('→ job:', job.id, 'arrived at', time, ignored ? 'but is ignored': '');
  }

  feasibilityTest(isFeasible: boolean, policy: string){
    if(logOff || !logLevelSetting.feasibilityTest) return;
    console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
    console.log(
      "This task set is",
      isFeasible ? "" : "not",
      SYSTEM._traditional ? "Schedulable" : "MC-Schedulable"
    );
    console.log(
      "Strategy:",
      SYSTEM._traditional ? "traditional-edf" : policy,
      "With",
      `"${SYSTEM._overrunWatchingMechanism}"`,
      "as overrun watching mechanism",
      "And",
      `${SYSTEM._overrunProbabilityPercentage}% chance of overrun for each job`,
    );
    console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
  }

  preemption(time: number, preempter: Job, preempted: Job){
    if(logOff || !logLevelSetting.preemption) return;
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
    if(logOff || !logLevelSetting.overrun) return;
    console.error(
      "---> 🧨 jobs",
      overrunners.map((j) => `${j.id} (reaching WCET: ${j.minimumExecutionTime} by ${j.overrun} units overrun | d: ${j.deadline})`),
      byDeadlineMiss
        ? "missed high criticality deadlines at:"
        : "overran at:",
      time
    );
    console.log("---> ❌ ~ MODE CHANGE ~ ❌");
    if (this.rQ && logLevelSetting.readyQ) console.log("new readyQ:", this.rQ._toString());
  }

  jobFinish(time: number, job: Job){
    if(logOff || !logLevelSetting.jobFinish) return;
    console.log("✅  job:", job.id, "is finished at time:", time);
  }

  deadlineMiss(time: number, jobs: Job[]){
    if(logOff || !logLevelSetting.deadlineMiss) return;
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
    if(logOff || !logLevelSetting.dispatch) return;
    if(job) console.log('🏳️job:', job.id, 'dispatched at', time);
  }

  failure(time: number, jobs: Job[]){
    if(logOff || !logLevelSetting.failure) return;
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
    if(logOff || !logLevelSetting.schedule) return;
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

  static printReadyQueue(time: number, rQ: ReadyQueue) {
    if(logOff ||  !logLevelSetting.readyQ) return;
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

  static printClock(c: number, startTime: number, job: Job) {
    if(logOff ||  !logLevelSetting.clock) return;
    const timeUnitTakenByEachClock = 1 / SYSTEM._frequency;
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