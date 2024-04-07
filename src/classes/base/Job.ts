import {Task} from "./Task";
import {CriticalityLevel, HI, LO} from "../../types";
import {SYSTEM} from "../System";
import {isModeChangePossible} from "../../utils";

export class Job {
  public id!: string;
  public actualDeadline!: number;
  public releaseTime!: number;
  public executedTime!: number; // remaining execution units
  public actualExecutionTime: number; // random number to simulate real-life behavior
  private virtualDeadline: number; // for Debuging purpose
  private _task!: Task;
  public utilization?: number;

  constructor(id: string, arrivalTime: number, actualExecTime: number, task: Task) {
    this._task = task;
    this.id = id;
    this.actualDeadline = arrivalTime + task.period;
    this.virtualDeadline =
      this._task.level == HI
        ? Number(
          (this._task.period * SYSTEM.virtualDeadlineFactor + arrivalTime).toFixed(1)
        )
        : arrivalTime + task.period;
    this.releaseTime = arrivalTime;
    this.executedTime = 0;
    this.actualExecutionTime = actualExecTime;
  }

  get remainingExecutionTime(): number {
    const remaining = this.actualExecutionTime - this.executedTime;
    return remaining < 0 ? 0 : remaining;
  }

  get expectedExecutionTime(): number {
    return this._task.c[SYSTEM.level];
  }

  get minimumExecutionTime(): number {
    return  this._task.c.LO;
  }

  get period(): number {
    return this._task.period;
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
    const finished = this.remainingExecutionTime <= 0;
    if (finished && !this.utilization) {
      // actual utilization (although utilization is not defined for a job, but we can use this value for calculating the average statistics)
      this.utilization = this.executedTime / this.period;
    }
    return finished;
  }

  hasMissedDeadline(time: number): boolean {
    if (time >= this.deadline && !this.isFinished()) return true;
    else return false;
  }

  execute(workDone: number) {
    this.executedTime = Number((this.executedTime + workDone).toFixed(5));
  }

  hasOverruned(): boolean {
    if (isModeChangePossible()) {
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