import {Job} from "./Job";
import {LO} from "../../types";
import {SYSTEM} from "../System";

export class ReadyQueue {
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

  _toString() {
    return !this.jobs.length
      ? []
      : this.jobs.map(
        (j) =>
          `[id: ${j.id}, deadline: ${j.deadline}, actualDeadline: ${j.actualDeadline}, level: ${j.level}, executed: ${j.executedTime}, releasedAt: ${j.releaseTime}, actualC: ${j.actualExecutionTime}, WCET(${SYSTEM.level}): ${j.expectedExecutionTime}, T: ${j.period}]`
      );
  }
}