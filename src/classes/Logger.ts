import {Job} from "./base/Job";
import {ReadyQueue} from "./base/ReadyQueue";
import {Scheduler} from "./base/Scheduler";
import {CONFIG} from "../app";
import {HI, LO, LogLevelSettings} from "../types";
import {writeToXMLFile} from "../utils";
import {Task} from "./base/Task";

const OUTPUT_DIRECTORY = './src/out';

export class Logger {
  rQ!: ReadyQueue;
  scheduler!: Scheduler;
  taskSet!: { id: string; tasks: Task[]};
  setting!: LogLevelSettings;
  simulationConfig!: { duration: number; overrunProbabilityPercentage: number; }
  off: boolean = false;
  stats: {
    analysis: {
      feasibility: boolean;
      schedulability: boolean;
      mechanism: string;
    } | {};
    modeChange: {
      time: number;
      reason: string;
    } | {};
    preemptions: {
      LObyLO: number;
      LObyHI: number;
      HIbyLO: number;
      HIbyHI: number;
    };
    deadlineMisses: {
      HI: number;
      LO: number;
    };
    totalJobs: {
      LO: number;
      HI: number;
      ignored: number;
    }
    finishedJobs: {
      HI: number;
      LO: number;
    };
    utilization: {
      totalUnitsOfWork?: number;
      expected: {} | {
        U11: number;
        U21: number;
        U22: number;
      };
      actual: {
        U11: number;
        U12: number; // expected 0
        U21: number;
        U22: number;
      };
    }
    responseTime: {} | Record<string, {
      min: number;
      max: number;
      avg: number;
    }>
  };

  constructor(settings: LogLevelSettings, on = true) {
    this.off = !on;
    this.setting = settings;
    this.stats =  {
      analysis: {},
      modeChange: {},
      preemptions: {
        LObyLO: 0,
        LObyHI: 0,
        HIbyLO: 0,
        HIbyHI: 0,
      },
      deadlineMisses: {
        HI: 0,
        LO: 0,
      },
      totalJobs: {
        LO: 0,
        HI: 0,
        ignored: 0,
      },
      finishedJobs: {
        HI: 0,
        LO: 0,
      },
      utilization: {
        expected: {},
        actual: {
          U11: 0,
          U12: 0, // expected 0
          U21: 0,
          U22: 0,
        },
      },
      responseTime: {},
    };
  }

  setUp(rQ: ReadyQueue, scheduler: Scheduler, ts: { id: string; tasks: Task[]}, c: { duration: number; overrunProbabilityPercentage: number; } ) {
    this.rQ = rQ;
    this.scheduler = scheduler;
    this.taskSet = ts;
    this.simulationConfig = c;
  }

  utilization(data: { speed: number, U11: number; U22: number; U21: number; u: number; U12: number, necessityCheck: boolean, schedulabilityCheck: boolean, taskSetFeasibilityCheck: boolean }) {
    this.stats.analysis = {
      ...this.stats.analysis,
      feasibility: data.necessityCheck && data.taskSetFeasibilityCheck,
      schedulability: data.schedulabilityCheck,
    };
    this.stats.utilization.expected = {U11: data.U11, U21: data.U21, U22: data.U22};
    if (this.off || !this.setting.utilization) return;
    console.log(data);
  }

  arrival(time: number, job: Job, ignored: boolean){
    if (ignored) this.stats.totalJobs.ignored = (this.stats.totalJobs.ignored || 0) + 1
    // @ts-ignore
    else this.stats.totalJobs[job.level] = (this.stats.totalJobs[job.level] || 0 ) + 1
    if(this.off || !this.setting.arrival) return;;
    if (this.off) return;
    console.log('→ job:', job.id, 'arrived at', time, ignored ? 'but is ignored': '');
  }

  feasibilityTest(isFeasible: boolean, policy: string){
    this.stats.analysis = {...this.stats.analysis, mechanism: policy};
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
    );
    console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
  }

  preemption(time: number, preempter: Job, preempted: Job){
    const mode = `${preempted.level}by${preempter.level}`;
    // @ts-ignore
    this.stats.preemptions[mode] = (this.stats.preemptions[mode] || 0) + 1;
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

  overrun(time: number, overrunners: Job[], byDeadlineMiss = false, forceOverrun = false){
    this.stats.modeChange = {...this.stats.modeChange, time, reason: forceOverrun ? 'forced' : (byDeadlineMiss ? 'high criticality deadline miss' : 'overrun')}
    if(this.off || !this.setting.overrun) return;
    if (forceOverrun) console.error("---> 🧨 FORCE OVERRUN at:", time);
    else console.error(
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
    this.stats.finishedJobs[job.level] = (this.stats.finishedJobs[job.level] || 0) + 1;
    if(this.off || !this.setting.jobFinish) return;
    console.log("✅  job:", job.id, "is finished at time:", time, "with responseTime:", job.responseTime);
  }

  deadlineMiss(time: number, jobs: Job[]){
    jobs.forEach((job) => {this.stats.deadlineMisses[job.level] = (this.stats.deadlineMisses[job.level] || 0) + 1;});
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

  printClock(c:number, st: number, et: number, job: Job) {
    if(this.off ||  !this.setting.clock) return;
    console.log(
      `c${c}:`,
      "running",
      job?.id || "IDLE",
      "from",
      `${st}`,
      "to",
      `${et}`,
      `(remaining: ${job.remainingExecutionTime.toFixed(1)})`
    );
  }

  save(status: "fail" | "success") {
    this.computeStatistics();
    const path = `${OUTPUT_DIRECTORY}/${this.taskSet.id}(${this.simulationConfig?.overrunProbabilityPercentage}%)(${this.simulationConfig.duration}).xml`;
    const log = {
      taskSet: this.taskSet.id,
      configs: {...this.simulationConfig, ...CONFIG},
      result: status,
      statistics: this.stats,
    }
    if (this.scheduler) {
      console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~SCHEDULE~~~~~~~~~~~~~~~~~~~~~~~~~~");
      // @ts-ignore
      log.schedule = Object.keys(this.scheduler.mapping)
        .sort((a, b) => Number(a) - Number(b)) // @ts-ignore
        .reduce((schedule= {} , time) => {
          const job = this.scheduler.mapping[time]?.id?.split("-")?.[1];
          const task = this.scheduler.mapping[time]?.id?.split("-")?.[0];
          // @ts-ignore
          schedule[`t-${time}`] = `${!job || !task ? "IDLE" : `T${task} (J${job})`}`
          return schedule;
        }, {});
      writeToXMLFile(path, log);
    }
  }

  computeStatistics() {
    const totalUnitsOfWork = this.simulationConfig?.duration * CONFIG.workDonePerClock * CONFIG.frequency;
    this.stats.utilization.totalUnitsOfWork = totalUnitsOfWork;
    this.taskSet.tasks.forEach((task) => {
      const executedJobs = task.jobs.filter(j => j.executedTime > 0); // executedTime is not time actually (it is work unit)
      const executionInLevel = executedJobs.filter(j => j.level == j.executedAtLevel).map(j => j.executedTime).reduce((acc, curr) => acc + curr, 0) ;
      const executionOutOfLevel = executedJobs.filter(j => j.level != j.executedAtLevel).map(j => j.executedTime).reduce((acc, curr) => acc + curr, 0) ;
      const responseTimes = task.jobs.map(j => j.responseTime).sort((a, b) => Number(a) - Number(b)) // min to max
      const min = responseTimes[0];
      const max = responseTimes[responseTimes.length - 1];
      const avg = responseTimes.reduce((acc, curr) => acc + curr, 0) / responseTimes.length; // @ts-ignore
      this.stats.responseTime[`T-${task.id}`] = {min, max, avg};
      if(task.level === LO) {
        this.stats.utilization.actual.U11 = this.stats.utilization.actual.U11 + executionInLevel / totalUnitsOfWork;
        this.stats.utilization.actual.U12 = this.stats.utilization.actual.U12 + executionOutOfLevel / totalUnitsOfWork;
      }
      if(task.level === HI) {
        this.stats.utilization.actual.U21 = this.stats.utilization.actual.U21 + executionOutOfLevel / totalUnitsOfWork;
        this.stats.utilization.actual.U22 = this.stats.utilization.actual.U22 + executionInLevel / totalUnitsOfWork;
      }
    })
  }
}