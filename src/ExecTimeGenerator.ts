import {getRandomBetweenInclusive, readFromXMLFile, writeToXMLFile} from "./utils";
import {Task} from "./Task";

const SAVED_JOBS_DIRECTORY = ".";

type SavedJob = {
  id: string;
  time: number;
};
type SavedActualExecTimesData = {
  overrunPossibility: number;
  jobs: SavedJob[];
} | null;

export class ExecTimeGenerator {
  duration: number;
  taskSetId: string;
  overrunPossibility: number; // percentage
  jobs: SavedJob[] = [];

  constructor(duration: number, taskSet: {id: string, tasks: Task[]}, overrunPossibility: number) {
    this.duration = duration;
    this.taskSetId = taskSet.id;
    this.overrunPossibility = overrunPossibility;
    this.read();
  }

  save() {
    // console.log('DEBUG: these are your jobs', this.jobs);
    writeToXMLFile<SavedActualExecTimesData>(this.filePath, {overrunPossibility: this.overrunPossibility, jobs: this.jobs});
  }

  get filePath() {
    return `${SAVED_JOBS_DIRECTORY}/${this.taskSetId}.xml`;
  }

  parse(raw: unknown) {
    // @ts-ignore
    const ovp = raw?.overrunPossibility?._text;
    // @ts-ignore
    const jobs = raw?.jobs?.map(item => ({id: item.id._text, time: item.time._text}));
    return {
      overrunPossibility: ovp,
      jobs,
    }
  }

  read() {
    const rawData = readFromXMLFile(this.filePath);
    const data = this.parse(rawData);
    // console.log('DEBUG', data, rawData);
    if (data && data.jobs && data.overrunPossibility == this.overrunPossibility) {
      this.jobs = data.jobs;
    }
  }

  saveNewJobs(data: SavedJob) {
    this.jobs.push(data);
  }

  generate(jobId: string, task: Task): number {
    const savedJob = this.jobs.find(j => j.id == jobId);
    if (savedJob) return Number(savedJob.time);
    else {
      const random = Math.random();
      const shouldOverrun = random <= this.overrunPossibility / 100;
      const generatedActualExecTime = shouldOverrun ? getRandomBetweenInclusive(task.c.LO + 0.1, task.c.HI) : getRandomBetweenInclusive(task.c.LO / 2, task.c.LO);
      this.saveNewJobs({id: jobId, time: generatedActualExecTime})
      return generatedActualExecTime;
    }
  }

}