import {Task} from "./base/Task";
import {Job} from "./base/Job";
import {HI, LO} from "../types";
import {ReadyQueue} from "./base/ReadyQueue";
import {Scheduler} from "./base/Scheduler";
import {CPU} from "./base/CPU";
import {SYSTEM} from "./System";
import {ExecTimeGenerator} from "../jobs_data/ExecTimeGenerator";
import {Logger} from "./Logger";
import {Log, CONFIG} from "../app";
import {isModeChangePossible} from "../utils";

export class Simulator {
  private time: number = 0; // system time
  private taskSet!: Task[];
  private cpu!: CPU; // can be changed to an array of CPUs => in that case you may want to rename CPU to Core
  private scheduler: Scheduler;
  private readyQ!: ReadyQueue;
  private DURATION!: number;
  private taskSetId: string;
  private execTimeGenerator: ExecTimeGenerator;

  constructor(duration: number, taskSet: { tasks: Task[]; id: string }) {
    this.DURATION = duration;
    this.cpu = new CPU(CONFIG.frequency);
    this.readyQ = new ReadyQueue();
    this.taskSet = taskSet.tasks;
    this.taskSetId = taskSet.id;
    this.scheduler = new Scheduler(this.readyQ, this.cpu);
    this.execTimeGenerator = new ExecTimeGenerator(taskSet, CONFIG.overrunProbabilityPercentage);
    Log.setUp(this.readyQ, this.scheduler);
  }

  run() {
    this.scheduler.analyse(this.taskSet); // analyse the task set for feasibilty and determining policy
    for (this.time; this.time < this.DURATION; this.time++) {
      Logger.printDivider(this.time);
      this.checkJobArrivals();
      this.cpu.process(this.time, this.runTimeMonitorPerClock(this));
      this.runTimeMonitorPerTimeUnit();
      Logger.printDivider();
    }
    Log.schedule();
    this.execTimeGenerator.save(this.DURATION);
  }

  overrunHandler(
    jobs: Job[],
    time: number,
    options: {
      dispatch: boolean;
      deadlineMiss?: boolean;
    }
  ) {
    if (!isModeChangePossible()) return;
    SYSTEM.level = HI;
    this.readyQ.abortLoTasks();
    if (options.dispatch) {
      this.scheduler.schedule();
      this.scheduler.dispatch(time);
    }
    Log.overrun(time, jobs, options.deadlineMiss);
  }

  jobFinishHandler(job: Job, time: number, options: { dispatch: boolean }) {
    Log.jobFinish(time, job);
    this.readyQ.pop(job);
    if (options.dispatch) {
      this.scheduler.schedule();
      this.scheduler.dispatch(time);
    }
  }

  failureHandler(jobs: Job[], time: number) {
    Log.failure(time, jobs);
    this.execTimeGenerator.save(this.DURATION);
    throw new Error("system failed!");
  }

  // no need for calling schedule as it is called inside time loop for each execution
  // the purpose of this monitoring is pruning the ready Q by checking for deadline missed and overruns in overrun-per-execution watching mode
  runTimeMonitorPerTimeUnit() {
    const elapsedTime = Number((this.time + 1).toFixed(5));

    // check for system failure
    let highCriticalityDeadlineMisses = this.readyQ
      .getDeadlineMisses(elapsedTime)
      .filter((j) => j.level == HI);
    if (highCriticalityDeadlineMisses.length && !isModeChangePossible())
      this.failureHandler(highCriticalityDeadlineMisses, elapsedTime);

    // check for overruns
    if (isModeChangePossible()) {
      if (highCriticalityDeadlineMisses.length)
        this.overrunHandler(highCriticalityDeadlineMisses, elapsedTime, {
          dispatch: false,
          deadlineMiss: true,
        });
      if (CONFIG.overrunWatchingMechanism == "per_execution") {
        const overrunners = this.readyQ.getOverrunners();
        if (overrunners.length)
          this.overrunHandler(overrunners, elapsedTime, { dispatch: false });
      }
    }

    // if mode change happened, you should reevaluate missed jobs
    const missedJobs = this.readyQ.getDeadlineMisses(elapsedTime);
    // check if the job has missed deadline (all jobs must be checked)
    if (missedJobs.length) {
      Log.deadlineMiss(elapsedTime, missedJobs);
      this.readyQ.batchPop(missedJobs);
    }
  }

  runTimeMonitorPerClock(simulator: Simulator) {
    const timeUnitTakenByEachClock = 1 / this.cpu.frequency;

    return function (job: Job | undefined, clock: number) {
      const elapsedTime = Number(
        (simulator.time + timeUnitTakenByEachClock * (clock + 1)).toFixed(5)
      );

      if (!job) return; // CPU is Idle

      // checking for overrun should happen before checking for finished jobs
      if (CONFIG.overrunWatchingMechanism == "per_clock") {
        if (isModeChangePossible()) {
          if (job.hasOverruned()) {
            if (job.isFinished())
              simulator.jobFinishHandler(job, elapsedTime, { dispatch: false });
            simulator.overrunHandler([job], elapsedTime, { dispatch: true });
            return;
          }
        }
      }

      if (job.isFinished()) {
        simulator.jobFinishHandler(job, elapsedTime, { dispatch: true });
      }
    };
  }

  checkJobArrivals() {
    let anyJobArrived = false;
    this.taskSet.forEach((task) => {
      // condition for generating jobs is checked inside each task
      const job =  task.generateJob(this.time, this.execTimeGenerator);
      if(job) {
        // task level < SYSTEM_LEVEL
        if (SYSTEM.level == HI) {
          if (task.level == HI) {
            Log.arrival(this.time, job, false);
            this.readyQ.push(job);
            anyJobArrived = true;
          } else  {
            Log.arrival(this.time, job, true)
          }
        } else {
          Log.arrival(this.time, job, false);
          this.readyQ.push(job);
          anyJobArrived = true;
        }
      }

    });
    if(anyJobArrived) {
      Log.printReadyQueue(this.time, this.readyQ);
      this.scheduler.schedule();
      this.scheduler.dispatch(this.time);
    }
  }


}