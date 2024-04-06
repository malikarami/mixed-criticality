import * as fs from "fs";
import * as xml2js from "xml-js";

const PATH_TO_SAVED_ACTUAL_EXEC_TIMES = "./actual-execution-times.xml";

type SavedActualExecTimes = {
  taskSetId: string;
  duration: number;
  jobs: {
    id: string;
    actualExecTime: number;
  }[];
} | null;
let savedActualExecTimes: SavedActualExecTimes = null;

const saveCurrentRunToXmlForNextRetries = (
  taskSetId: string,
  duration: number
) => {
  try {
    const obj = savedActualExecTimes;

    if (
      !obj ||
      obj.taskSetId != taskSetId ||
      obj.duration != duration ||
      !obj.jobs?.length
    )
      throw new Error("unsufficient data");

    // convert object to XML
    // @ts-ignore
    const xml = xml2js.js2xml(obj, { compact: true, spaces: 4 });

    // Write the XML to a file
    fs.writeFileSync(PATH_TO_SAVED_ACTUAL_EXEC_TIMES, xml);
    console.log("XML file written.");
  } catch (e) {
    // @ts-ignore
    console.log("unsuccessful write to saved task set: Error: ", e?.message);
  }
};

const saveJobActualExecutionTimeForNextRetries = (
  id: string,
  actualExecTime: number
) => {
  savedActualExecTimes?.jobs.push({ id, actualExecTime });
};

const readFromSavedActualExecutionTimes = (
  taskSetId: string,
  duration: number
) => {
  try {
    // Read the XML from the file
    const xmlFromFile = fs.readFileSync(
      PATH_TO_SAVED_ACTUAL_EXEC_TIMES,
      "utf8"
    );

    // Convert the XML back to a JavaScript object
    // @ts-ignore
    const objFromXml: SavedActualExecTimes = xml2js.xml2js(xmlFromFile, {
      compact: true,
    });
    console.log("Object read from XML:", objFromXml);
    if (
      !objFromXml?.duration ||
      !objFromXml?.jobs?.length ||
      !objFromXml?.taskSetId
    )
      throw new Error("xml object misses data");
    if (taskSetId != objFromXml.taskSetId) throw new Error("not your task set");
    if (duration != objFromXml.duration)
      console.warn(
        "the saved task set only contains jobs data from 0 to",
        objFromXml.duration
      );

    savedActualExecTimes = objFromXml;
    SYSTEM._readExecTimesFromPreviousRun = true;
  } catch (e) {
    // @ts-ignore
    console.log("unsuccessful read from saved task set: Error: ", e?.message);
    SYSTEM._readExecTimesFromPreviousRun = false;
    return [];
  }
};

const LO = "LO";
const HI = "HI";
type CriticalityLevel = "LO" | "HI";
type SchedulingPolicy = "edf" | "edf-vd";
type ExecutionTime = {
  LO: number;
  HI: number;
};
type SystemLog = {
  arrivals?: Job[];
  preemptions?: Job[];
  executedJobs?: Job[];
  deadlineMisses?: Job[];
  finshedJobs?: Job[];
  overrun?: boolean;
};
type TaskInitiator = {
  id: string;
  period: number; // Int
  c: ExecutionTime; // Float
  level: CriticalityLevel;
  deadline?: number; // Float
};

// read-only values are denoted with _
type SystemConfig = {
  level: CriticalityLevel;
  virtualDeadlineFactor: number;
  _traditional: boolean;
  _actualExecutionTime:
    | "random-with-low-cap"
    | "random-with-high-cap"
    | "low"
    | "high";
  // 1 for integers, 01 for floats
  _workDonePerClock: 0.1 | 1; // note that if you set this value to 1, all of the execution times in your system will also be set to integers. this is a kind of stepper for
  _cpuSpeed: number;
  _overrunWatchingMechanism: "per_clock" | "per_execution";
  _overrunProbabilityPercentage: number;
  _readExecTimesFromPreviousRun: boolean;
};

const SYSTEM: SystemConfig = {
  level: LO,
  virtualDeadlineFactor: 1,
  _actualExecutionTime: "random-with-high-cap",
  _overrunProbabilityPercentage: 40, // probability of actual C to be grater than C(LO)
  _workDonePerClock: 0.1, // indicating amount of work done in each clock -> main purpose: customizing the simulation for floating point values (example: a CPU with speed less than one)
  _cpuSpeed: 5, // x clock per time unit => (x * wpc) operation done in time unit
  _overrunWatchingMechanism: "per_clock",
  _traditional: false, // traditional EDF instead of EDF-VD
  _readExecTimesFromPreviousRun: false,
} as const;

const log: SystemLog[][] = []; // time // clock

// const savedJobs

class ReadyQueue {
  private jobs: Job[] = [];

  push(job: Job) {
    this.jobs.push(job);
  }

  pop(job: Job) {
    this.jobs = this.jobs.filter((j) => j.id !== job.id);
  }

  batchPop(jobs: Job[]) {
    const ids = jobs.map((j) => j.id);
    this.jobs = this.jobs.filter((j) => !ids.includes(j.id));
  }

  sort(sortFunction: (a: Job, b: Job) => number) {
    this.jobs = this.jobs.sort(sortFunction);
  }

  get lastJob() {
    return this.jobs[0];
  }

  getDeadlineMisses(time: number): Job[] {
    return this.jobs.filter((j) => j.hasMissedDeadline(time));
  }

  abortLoTasks() {
    const los = this.jobs.filter((j) => j.level === LO);
    this.batchPop(los);
  }

  getOverrunners() {
    return this.jobs.filter((j) => j.hasOverruned());
  }

  _print() {
    return !this.jobs.length
      ? []
      : this.jobs.map(
          (j) =>
            `[id: ${j.id}, deadline: ${j.deadline}, actualDeadline: ${j.actualDeadline}, level: ${j.level}, executed: ${j.executedTime}, releasedAt: ${j.releaseTime}, actualC: ${j.actualExecutionTime}, WCET: ${j.expectedExecutionTime}]`
        );
  }
}

const Utilization =
  (taskSet: Task[]) =>
  (ofLevel: CriticalityLevel, inLevel: CriticalityLevel): number => {
    const tasks = taskSet.filter((t) => t.level === ofLevel);
    return tasks.reduce((utilization: number, task: Task) => {
      const taskUtilization = task.c[inLevel] / task.period;
      return utilization + taskUtilization;
    }, 0);
  };

class Task {
  public period!: number;
  public id!: string;
  public level!: CriticalityLevel;
  public c!: ExecutionTime;
  public deadline!: number;
  private jobs: Job[] = [];

  constructor(initiator: TaskInitiator) {
    this.id = initiator.id;
    this.period = initiator.period;
    this.level = initiator.level;
    this.c = initiator.c;
    this.deadline = initiator.deadline || initiator.period;
  }

  // can be customized to generate jobs with a setInterval
  generateJob(time: number) {
    const j = new Job(time, this.jobs.length, this);
    this.jobs.push(j);
    return j;
  }
}

class Job {
  public id!: string;
  public actualDeadline!: number;
  public releaseTime!: number;
  public executedTime!: number; // remaining execution units
  public actualExecutionTime: number; // random number to simulate real-life behavior
  private virtualDeadline: number; // for Debuging purpose
  private _task!: Task;

  constructor(time: number, instance: number, task: Task) {
    this._task = task;
    this.id = task.id + "-" + instance;
    this.actualDeadline = time + task.period;
    this.virtualDeadline =
      this._task.level == HI
        ? Number(
            (this._task.period * SYSTEM.virtualDeadlineFactor + time).toFixed(1)
          )
        : time + task.period;
    this.releaseTime = time;
    this.executedTime = 0;
    this.actualExecutionTime = this.generateActualExecutionTime();
    saveJobActualExecutionTimeForNextRetries(this.id, this.actualExecutionTime);
  }

  private generateActualExecutionTime() {
    let saved = undefined;
    if (SYSTEM._readExecTimesFromPreviousRun)
      saved = savedActualExecTimes?.jobs?.find((j) => j.id == this.id)?.actualExecTime;

    function getRandomBetweenInclusive(min: number, max: number) {
      const rand = Math.random() * (max - min) + min;
      return Number(rand.toFixed(1));
    }

    const safeExecTime = getRandomBetweenInclusive(
      SYSTEM._workDonePerClock,
      this._task.c.LO
    );

    function chooseWithProbability(overrunningActualExecTime: number) {
      const random = Math.random();
      return random <= SYSTEM._overrunProbabilityPercentage / 100
        ? overrunningActualExecTime
        : safeExecTime;
    }

    switch (SYSTEM._actualExecutionTime) {
      case "high": {
        return saved || chooseWithProbability(this._task.c.HI);
      }
      case "low": {
        return saved || this._task.c.LO;
      }
      case "random-with-high-cap": {
        return saved || chooseWithProbability(
          getRandomBetweenInclusive(SYSTEM._workDonePerClock, this._task.c.HI)
        );
      }
      case "random-with-low-cap": {
        return saved || safeExecTime;
      }
    }
  }

  get remainingExecutionTime(): number {
    const remaining = this.actualExecutionTime - this.executedTime;
    return remaining < 0 ? 0 : remaining;
  }

  get expectedExecutionTime(): number {
    return this._task.c[SYSTEM.level];
  }

  get deadline(): number {
    // scheduling based on EDF-VD
    if (
      SYSTEM.virtualDeadlineFactor !== 1 &&
      SYSTEM.level == LO &&
      this.level === HI
    ) {
      return this.virtualDeadline;
    }

    return this.actualDeadline;
  }

  get level(): CriticalityLevel {
    return this._task.level;
  }

  isFinished() {
    return this.remainingExecutionTime <= 0;
  }

  hasMissedDeadline(time: number): boolean {
    if (time >= this.deadline && !this.isFinished()) return true;
    else return false;
  }

  execute(workDone: number) {
    this.executedTime = Number((this.executedTime + workDone).toFixed(5));
  }

  hasOverruned(): boolean {
    if (SYSTEM.level == LO && !SYSTEM._traditional) {
      // detect overrun at the exact time
      if (this.executedTime > this.expectedExecutionTime) return true;
      if (this.executedTime == this.expectedExecutionTime)
        return !this.isFinished();
      return false;
    }
    return false;
  }

  get overrun() {
    return this.executedTime - this._task.c.LO;
  }
}

// a single core
class CPU {
  public speed: number;
  private currentJob?: Job;

  constructor(s: number) {
    this.speed = s;
  }

  process(
    startTime: number,
    runTimeMonitorPerClock: (j: Job | undefined, c: number) => void
  ) {
    for (let clock = 0; clock < this.speed; clock++) {
      this.run(startTime, clock);
      runTimeMonitorPerClock(this.currentJob, clock);
    }
  }

  run(st: number, c: number): Job | undefined {
    const timeUnitTakenByEachClock = 1 / this.speed;
    if (this.currentJob) {
      this.currentJob.execute(SYSTEM._workDonePerClock);
      console.log(
        `c${c}:`,
        "running",
        this.currentJob?.id || "IDLE",
        "at",
        `${st + timeUnitTakenByEachClock * c}`,
        `(${SYSTEM._workDonePerClock} work done)`
      );
    }
    return this.currentJob;
  }

  assign(newJob: Job, t: number) {
    this._logPreemptions(t, newJob);
    this.currentJob = newJob;
  }

  private _logPreemptions(t: number, newJob: Job) {
    const isPreemption =
      this.currentJob &&
      newJob &&
      !this.currentJob.isFinished() /* && !this.currentJob?.hasMissedDeadline(t)*/ &&
      newJob.id !== this.currentJob.id;
    if (isPreemption)
      console.warn(
        "---> 📤 ",
        newJob.id,
        "with deadline:",
        newJob.deadline,
        "preempted",
        this.currentJob?.id,
        "with deadline:",
        this.currentJob?.deadline
      );
  }

  private _getTobeElapsedTime() {
    const remainingTime = this.currentJob?.remainingExecutionTime;
    const elapsedTime =
      (remainingTime && remainingTime < this.speed
        ? remainingTime
        : this.speed) / this.speed;

    return elapsedTime;
  }
}

class Scheduler {
  private policy: SchedulingPolicy = "edf";
  private readyQ!: ReadyQueue;
  private cpu!: CPU;
  private mapping: Record<string, Job> = {};

  constructor(rQ: ReadyQueue, cpu: CPU) {
    this.readyQ = rQ;
    this.cpu = cpu;
  }

  schedule() {
    const deadlineAndCriticalitySortFunction = (j1: Job, j2: Job) => {
      const a = j1.deadline;
      const b = j2.deadline;
      if (a < b) {
        return -1;
      } else if (a === b) {
        if (j1.level == j2.level) return 0;
        if (j1.level == HI) return -1;
        return 1;
      } else {
        return 1;
      }
    };

    this.readyQ.sort(deadlineAndCriticalitySortFunction);
  }

  dispatch(t: number): Job {
    const job = this.readyQ.lastJob;
    this.cpu.assign(job, t);
    this.mapping[`${t}`] = job;
    return job;
  }

  feasibilityCheck(speed: number) {
    return (U11: number, U21: number, U22: number): boolean => {
      if (U11 + U21 <= speed && U22 <= speed) return true;
      return false;
    };
  }

  analyse(tasks: Task[]) {
    const speed = SYSTEM._cpuSpeed * SYSTEM._workDonePerClock;

    const U11 = Utilization(tasks)(LO, LO); // utilization of tasks of level LO in a LO system
    const U12 = Utilization(tasks)(LO, HI); // utilization of tasks of level LO in a HI system
    const U21 = Utilization(tasks)(HI, LO); // utilization of tasks of level HI in a LO system
    const U22 = Utilization(tasks)(HI, HI); // utilization of tasks of level HI in a HI system
    const u = U21 / (speed - U22);

    console.log({ U11, U12, U21, U22, u });

    const isFeasible = this.feasibilityCheck(speed)(U11, U21, U22);

    if (SYSTEM._traditional || U11 + U22 <= speed) {
      this.policy = "edf";
      SYSTEM.virtualDeadlineFactor = 1;
    } else if (U11 + u <= speed) {
      SYSTEM.virtualDeadlineFactor = u;
      this.policy = "edf-vd";
    }

    this._logFeasibility(isFeasible);
  }

  _printSchedule() {
    console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~SCHEDULE~~~~~~~~~~~~~~~~~~~~~~~~~~");
    Object.keys(this.mapping)
      .sort((a, b) => Number(a) - Number(b))
      .forEach((time) => {
        const job = this.mapping[time]?.id?.split("-")?.[1];
        const task = this.mapping[time]?.id?.split("-")?.[0];
        console.log(
          Number(time),
          `<-- ${!job || !task ? "IDLE" : `T${task} (J${job})`}`
        );
      });
  }

  private _logFeasibility(isFeasible: boolean) {
    console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
    console.log(
      "This task set is",
      isFeasible ? "" : "not",
      SYSTEM._traditional ? "Schedulable" : "MC-Schedulable"
    );
    console.log(
      "Strategy:",
      SYSTEM._traditional ? "traditional-edf" : this.policy,
      "With",
      `"${SYSTEM._overrunWatchingMechanism}"`,
      "as overrun watching mechanism",
      "And",
      `"${SYSTEM._actualExecutionTime}" mode`,
      "for generating actual execution time of the taskset"
    );
    console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
  }
}

class Simulator {
  private time: number = 0; // system time
  private taskSet!: Task[];
  private cpu!: CPU; // can be changed to an array of CPUs => in that case you may want to rename CPU to Core
  private scheduler: Scheduler;
  private readyQ!: ReadyQueue;
  private DURATION!: number;
  private taskSetId: string;

  constructor(duration: number, taskSet: { tasks: Task[]; id: string }) {
    this.DURATION = duration;
    this.cpu = new CPU(SYSTEM._cpuSpeed);
    this.readyQ = new ReadyQueue();
    this.taskSet = taskSet.tasks;
    this.taskSetId = taskSet.id;
    this.scheduler = new Scheduler(this.readyQ, this.cpu);
    savedActualExecTimes = { taskSetId: taskSet.id, duration, jobs: [] };
    if (SYSTEM._readExecTimesFromPreviousRun)
      readFromSavedActualExecutionTimes(taskSet.id, duration);
  }

  run() {
    this.scheduler.analyse(this.taskSet); // analyse the task set for feasibilty and determining policy
    for (this.time; this.time < this.DURATION; this.time++) {
      this.checkJobArrivals();
      this.scheduler.schedule();
      this._logReadyQueue();
      this.scheduler.dispatch(this.time);
      this.cpu.process(this.time, this.runTimeMonitorPerClock(this));
      this.runTimeMonitorPerTimeUnit();
      this._logTimeDivider();
    }
    this.scheduler._printSchedule();
    // saveCurrentRunToXmlForNextRetries(this.taskSetId, this.DURATION);
  }

  overrunHandler(
    jobs: Job[],
    time: number,
    options: {
      dispatch: boolean;
      deadlineMiss?: boolean;
    }
  ) {
    if (SYSTEM._traditional) return;
    SYSTEM.level = HI;
    this.readyQ.abortLoTasks();
    if (options.dispatch) {
      this.scheduler.schedule();
      this.scheduler.dispatch(time);
    }
    this._logOverrun(jobs, time, options.deadlineMiss);
  }

  jobFinishHandler(job: Job, time: number, options: { dispatch: boolean }) {
    this._logFinishedJob(job, time);
    this.readyQ.pop(job);
    if (options.dispatch) {
      this.scheduler.schedule();
      this.scheduler.dispatch(time);
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
    if (
      highCriticalityDeadlineMisses.length &&
      (SYSTEM.level == HI || SYSTEM._traditional)
    )
      this._systemFailure(highCriticalityDeadlineMisses, elapsedTime);

    // check for overruns
    if (!SYSTEM._traditional && SYSTEM.level == LO) {
      if (highCriticalityDeadlineMisses.length)
        this.overrunHandler(highCriticalityDeadlineMisses, elapsedTime, {
          dispatch: false,
          deadlineMiss: true,
        });
      if (SYSTEM._overrunWatchingMechanism == "per_execution") {
        const overrunners = this.readyQ.getOverrunners();
        if (overrunners.length)
          this.overrunHandler(overrunners, elapsedTime, { dispatch: false });
      }
    }

    // if mode change happened, you should reevaluate missed jobs
    const missedJobs = this.readyQ.getDeadlineMisses(elapsedTime);
    // check if the job has missed deadline (all jobs must be checked)
    if (missedJobs.length) {
      this._logDeadlineMisses(elapsedTime, missedJobs);
      this.readyQ.batchPop(missedJobs);
    }
  }

  runTimeMonitorPerClock(simulator: Simulator) {
    const timeUnitTakenByEachClock = 1 / this.cpu.speed;

    return function (job: Job | undefined, clock: number) {
      const elapsedTime = Number(
        (simulator.time + timeUnitTakenByEachClock * (clock + 1)).toFixed(5)
      );

      // if (elapsedTime === s.time + 1) return; // one complete execution. leave the monitoring to runtimePerExecution

      if (!job) return; // CPU is Idle

      // checking for overrun should happen before checking for finished jobs
      if (SYSTEM._overrunWatchingMechanism == "per_clock") {
        if (!SYSTEM._traditional && SYSTEM.level == LO) {
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
    this.taskSet.forEach((task) => {
      if (this.time % task.period === 0) {
        // task level < SYSTEM_LEVEL
        if (SYSTEM.level == HI) {
          if (task.level == HI) this.readyQ.push(task.generateJob(this.time));
        } else {
          this.readyQ.push(task.generateJob(this.time));
        }
      }
    });
  }

  private _logReadyQueue() {
    console.log(
      "****************************",
      this.time,
      "****************************"
    );
    console.log(this.readyQ._print());
  }

  private _logTimeDivider() {
    console.log(
      "---------------------------------------------------------------------"
    );
  }

  private _logFinishedJob(job: Job, elapsedTime: number) {
    console.log("✅ job:", job.id, "is finished at time:", elapsedTime);
  }

  private _logOverrun(
    jobs: Job[],
    time: number,
    deadlineMissOfHighCriticalityTask = false
  ) {
    console.error(
      "---> ❌ jobs",
      jobs.map((j) => `${j.id} (by ${j.overrun} units)`),
      deadlineMissOfHighCriticalityTask
        ? "missed high criticality deadlines at:"
        : "overran at:",
      time
    );
    console.log("---> ❌ ~ MODE CHANGE ~ ❌");
    console.log("new readyQ:", this.readyQ._print());
  }

  private _logDeadlineMisses(elapsedTime: number, missedJobs: Job[]) {
    console.error(
      "---> ⌛️ DEADLINE MISS at time:",
      elapsedTime,
      missedJobs.map(
        (j) =>
          j.id +
          " with remaining: " +
          j.remainingExecutionTime +
          " of " +
          j.expectedExecutionTime
      )
    );
  }

  private _systemFailure(jobs: Job[], time: number) {
    console.error(
      "---> ❌ jobs",
      jobs.map((j) => `${j.id} (by ${j.overrun} units)`),
      "missed high criticality deadlines at:",
      time
    );
    console.log(
      "❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌"
    );
    // saveCurrentRunToXmlForNextRetries(this.taskSetId, this.DURATION);
    throw new Error("system failed!");
  }
}

// samples

const preemptiveTaskSet = {
  id: "preemptiveTaskSet",
  tasks: [
    new Task({ id: "1", period: 4, level: LO, c: { LO: 1, HI: 0 } }),
    new Task({ id: "2", period: 10, level: LO, c: { LO: 6, HI: 0 } }),
  ],
};

const mcsTasksetSimple = {
  id: "mcsTasksetSimple",
  tasks: [
    new Task({ id: "1", period: 5, level: LO, c: { LO: 1, HI: 0 } }),
    new Task({ id: "2", period: 6, level: LO, c: { LO: 2, HI: 0 } }),
    new Task({ id: "3", period: 10, level: HI, c: { LO: 1, HI: 3 } }),
    new Task({ id: "4", period: 15, level: HI, c: { LO: 1, HI: 3 } }),
  ],
};

new Simulator(30, mcsTasksetSimple).run();
