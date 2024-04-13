import {ReadyQueue} from "./ReadyQueue";
import {Job} from "./Job";
import {Task} from "./Task";
import {HI, LO, SchedulingPolicy} from "../../types";
import {SYSTEM} from "../System";
import {CPU} from "./CPU";
import {Utilization} from "./utilization";
import {Log, CONFIG} from "../../app";

export class Scheduler {
  policy: SchedulingPolicy = "edf";
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

  necessityCheck({U11, U21, U22}: {U11: number, U21: number, U22: number}): {result: boolean, method: string} {
      if (CONFIG.traditional) {
        if (SYSTEM.level === HI) {
          return {result: U22 <= 1, method: 'U22 <= 1'};
        }
        if (SYSTEM.level === LO) {
          return {result: (U22 + U11) <= 1, method: '(U22 + U11) <= 1'};
        }
      }
      else if ((U11 + U21 <= 1) && (U22 <= 1)) return {result: true, method: '(U11 + U21 <= 1) && (U22 <= 1)'};
      return {result: false, method: '(U11 + U21 <= 1) && (U22 <= 1)'};
    };

  sufficiencyCheck({U11, U22, U21, u}:{U11: number, U22: number, U21: number, u: number}): {result: boolean, method: string} {
      if (CONFIG.traditional) {
        if (SYSTEM.level === HI) {
          return {result: U21 <= 1, method: 'U21 <= 1'};
        }
        if (SYSTEM.level === LO) {
          return {result: (U21 + U11) <= 1, method: '(U21 + U11) <= 1'};
        }
      }
      return {result: (U11 + U22 <= 1) || ((U11 + u <= 1)), method: `(U11 + U22 <= 1): ${(U11 + U22 <= 1)} OR (U11 + u <= 1): ${(U11 + u <= 1)}`};
    };

  analyse(tasks: Task[]) {
    const speed = CONFIG.frequency * CONFIG.workDonePerClock;

    const U11 = Utilization(tasks)(LO, LO) / speed; // utilization of tasks of level LO in a LO system
    const U12 = Utilization(tasks)(LO, HI) / speed; // utilization of tasks of level LO in a HI system
    const U21 = Utilization(tasks)(HI, LO) / speed; // utilization of tasks of level HI in a LO system
    const U22 = Utilization(tasks)(HI, HI) / speed; // utilization of tasks of level HI in a HI system
    const u = U21 / (1 - U22);
    const vdf = U21 / (1 - U11);

    const taskSetCheck = !tasks.some(t => t.c.LO > t.period || t.c.HI > t.period);
    const necessaryCheck = this.necessityCheck({U11, U21, U22});
    const sufficientCheck = this.sufficiencyCheck({U11, U22, U21, u});

    Log.utilization({speed, U11, U12, U21, U22, u, vdf, taskSetCheck, necessaryCheck, sufficientCheck});

    let isFeasible = taskSetCheck &&  necessaryCheck.result && sufficientCheck.result;

    if (CONFIG.traditional || U11 + U22 <= 1) {
      this.policy = "edf";
      SYSTEM.virtualDeadlineFactor = 1;
    } else if ((U11 + u <= 1) && (vdf > 0)) {
      SYSTEM.virtualDeadlineFactor = vdf;
      this.policy = "edf-vd";
    }

    Log.feasibilityTest(isFeasible, this.policy);
  }
}