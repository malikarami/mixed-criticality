import {ReadyQueue} from "./ReadyQueue";
import {Job} from "./Job";
import {Task} from "./Task";
import {HI, LO, SchedulingPolicy} from "../../types";
import {SYSTEM} from "../System";
import {CPU} from "./CPU";
import {Utilization} from "./utilization";
import {Log, CONFIG} from "../../app";

export class Scheduler {
  private policy: SchedulingPolicy = "edf";
  private readyQ!: ReadyQueue;
  private cpu!: CPU;
  mapping: Record<string, Job> = {};

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
    Log.dispatch(t, job);
    return job;
  }

  necessityCheck(speed: number) {
    return ({U11, U21, U22}: {U11: number, U21: number, U22: number}): boolean => {
      if (U11 + U21 <= speed && U22 <= speed) return true;
      return false;
    };
  }

  feasibilityCheck(speed: number) {
    return ({U11, U22, u}:{U11: number, U22: number, u: number}): boolean => {
      if (U11 + U22 <= speed || U11 + u <= speed) return true;
      return false;
    };
  }

  analyse(tasks: Task[]) {
    const speed = CONFIG.frequency * CONFIG.workDonePerClock;

    const U11 = Utilization(tasks)(LO, LO); // utilization of tasks of level LO in a LO system
    const U12 = Utilization(tasks)(LO, HI); // utilization of tasks of level LO in a HI system
    const U21 = Utilization(tasks)(HI, LO); // utilization of tasks of level HI in a LO system
    const U22 = Utilization(tasks)(HI, HI); // utilization of tasks of level HI in a HI system
    const u = U21 / (speed - U22);

    // the task set itself must be feasible
    const taskSetFeasibilityCheck = !tasks.some(t => t.c.LO > t.period || t.c.HI > t.period);
    // necessary analysis for schedulablity
    const necessityCheck = this.necessityCheck(speed)({U11, U21, U22});
    // no need for feasibility check when the tas kset can not pass the necessity check, but we do it nonetheless
    const feasibilityCheck = this.feasibilityCheck(speed)({U11, U22, u});

    Log.utilization({speed, U11, U12, U21, U22, u, taskSetFeasibilityCheck, necessityCheck, feasibilityCheck});

    const isFeasible = taskSetFeasibilityCheck &&  necessityCheck && feasibilityCheck;

    if (CONFIG.traditional || U11 + U22 <= speed) {
      this.policy = "edf";
      SYSTEM.virtualDeadlineFactor = 1;
    } else if (U11 + u <= speed && u > 0) {
      SYSTEM.virtualDeadlineFactor = u;
      this.policy = "edf-vd";
    }

    Log.feasibilityTest(isFeasible, this.policy);
  }
}