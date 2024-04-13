import {Task} from "./base/Task";
import {Job} from "./base/Job";
import {ExecTimeGeneratorModes, HI, SimulationConfig, TaskSetInitiator} from "../types";
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
  private cpu!: CPU; // can be changed to an array of CPUs => in that case you may want to rename CPU to Core
  private scheduler: Scheduler;
  private readyQ!: ReadyQueue;
  private DURATION!: number;
  private taskSet!: {
    id: string;
    tasks: Task[];
  }
  private execTimeGenerator: ExecTimeGenerator;

  private generateTasksSet(set: TaskSetInitiator): { id: string; tasks: Task[] } {
    return {id: set.id, tasks: set.tasks.map(t => new Task(t, set.id))}
  }
  constructor(simulationConfig: SimulationConfig, taskSet: TaskSetInitiator) {
    SYSTEM.level = CONFIG.initialSystemLevel;
    this.DURATION = simulationConfig.duration;
    this.cpu = new CPU(CONFIG.frequency);
    this.readyQ = new ReadyQueue();
    this.taskSet = this.generateTasksSet(taskSet);
    this.scheduler = new Scheduler(this.readyQ, this.cpu);
    this.execTimeGenerator = new ExecTimeGenerator(this.taskSet, simulationConfig);
    Log.setUp(this.readyQ, this.scheduler, this.taskSet, simulationConfig);
  }

  run() {
    this.scheduler.analyse(this.taskSet.tasks); // analyse the task set for feasibilty and determining policy
    for (this.time; this.time < this.DURATION; this.time++) {
      Log.printDivider(this.time);
      this.checkForceOverrun();
      this.checkJobArrivals();
      this.cpu.process(this.time, this.runTimeMonitorPerClock(this));
      this.runTimeMonitorPerTimeUnit();
      Log.printDivider();
    }
    this.finishHandler('success');
  }

  overrunHandler(
    jobs: Job[],
    time: number,
    options: {
      dispatch: boolean;
      deadlineMiss?: boolean;
      forceOverrun?: boolean;
    }
  ) {
    const overrun = () => {
      SYSTEM.level = HI;
      this.readyQ.abortLoTasks();
      Log.overrun(time, jobs, options.deadlineMiss, options.forceOverrun);
      if (options.dispatch) {
        this.scheduler.schedule();
        this.scheduler.dispatch(time);
      }
    }

    if (!isModeChangePossible()) return;
    if(options.forceOverrun) {
      overrun();
      return;
    }
    overrun();
  }

  jobFinishHandler(job: Job, time: number, options: { dispatch: boolean }) {
    Log.jobFinish(time, job);
    this.readyQ.pop(job);
    if (options.dispatch) {
      this.scheduler.schedule();
      this.scheduler.dispatch(time);
    }
  }

  finishHandler(status: 'fail' | 'success', jobs?: Job[], time?: number) {
    const save = () => { this.execTimeGenerator.save(time || this.DURATION); Log.save(status, time);}
    if(status === 'fail' && jobs && time) {
      Log.failure(time, jobs);
      save();
      throw new Error("system failed!");
    } else {
      Log.schedule();
      save();
    }
  }

  // no need for calling schedule as it is called inside time loop for each execution
  // the purpose of this monitoring is pruning the ready Q by checking for deadline missed and overruns in overrun-per-execution watching mode
  runTimeMonitorPerTimeUnit() {
    const elapsedTime = Number((this.time + 1).toFixed(5));

    // check for system failure
    let highCriticalityDeadlineMisses = this.readyQ
      .getDeadlineMisses(elapsedTime)
      .filter((j) => j.level == HI);
    if (highCriticalityDeadlineMisses.length) {
      // jobs has missed actual deadline in edf mode
      // jobs has missed actual deadline in HI system
      if(!isModeChangePossible() || highCriticalityDeadlineMisses.some(j => j.actualDeadline === j.deadline)) this.finishHandler('fail', highCriticalityDeadlineMisses, elapsedTime);
    }

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
      const atLevelMisses = missedJobs.filter(job => job.level === SYSTEM.level);
      if(atLevelMisses.length) this.finishHandler('fail', atLevelMisses, elapsedTime);
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
    // this.taskSet.tasks.forEach(t => {console.log(t); t.jobs.forEach(j => console.log(j))})

    let anyJobArrived = false;
    this.taskSet.tasks.forEach((task) => {
      // condition for generating jobs is checked inside each task
      const job = task.generateJob(this.time, this.execTimeGenerator);
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

  private checkForceOverrun() {
    if(CONFIG.exactOverrunTime && this.time >= CONFIG.exactOverrunTime) this.overrunHandler([], this.time, {
      dispatch: false,
      forceOverrun: true,
    })
  }
}