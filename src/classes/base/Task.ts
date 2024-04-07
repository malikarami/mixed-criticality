import {CriticalityLevel, ExecutionTime, TaskInitiator} from "../../types";
import {Job} from "./Job";
import {ExecTimeGenerator} from "../../jobs_data/ExecTimeGenerator";

export class Task {
  readonly period!: number;
  readonly taskSetId!: string;
  readonly id!: string;
  readonly level!: CriticalityLevel;
  readonly c!: ExecutionTime;
  readonly deadline!: number;
  readonly phase!: number;
  private jobs: Job[] = [];

  constructor(initiator: TaskInitiator, setId = '') {
    this.taskSetId = setId;
    this.id = initiator.id;
    this.period = initiator.period;
    this.level = initiator.level;
    this.c = initiator.c;
    this.deadline = initiator.deadline || initiator.period;
    this.phase = initiator.phase ? initiator.phase : 0;
  }

  // can be customized to generate jobs with a setInterval
  generateJob(time: number, execTimeGenerator: ExecTimeGenerator) {
    if (time % this.period == this.phase) {
      const id = this.id + "-" + this.jobs.length;
      const actualExecTime = execTimeGenerator.generate(id, this)
      const j = new Job(id, time, actualExecTime, this);
      this.jobs.push(j);
      return j;
    }
    return null;
  }

}