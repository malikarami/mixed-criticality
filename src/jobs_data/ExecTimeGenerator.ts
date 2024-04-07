import {getRandomBetweenInclusive, readFromXMLFile, writeToXMLFile} from "../utils";
import {Task} from "../classes/base/Task";

const SAVED_JOBS_DIRECTORY = "./src/jobs_data";

type SavedJob = {
  id: string;
  time: number;
};
type SavedActualExecTimesData = {
  duration: number;
  overrunPossibility: number;
  jobs: SavedJob[];
} | null;

export class ExecTimeGenerator {
  savedDataDuration: number = 0;
  taskSetId: string;
  overrunPossibility: number; // percentage
  jobs: SavedJob[] = [];

  constructor(taskSet: {id: string, tasks: Task[]}, overrunPossibility: number) {
    this.taskSetId = taskSet.id;
    this.overrunPossibility = overrunPossibility;
    this.read();
  }

  save(currentSimulationDuration: number) {
    // console.log('DEBUG: these are your jobs', this.jobs);
    if (currentSimulationDuration > this.savedDataDuration) {
      writeToXMLFile<SavedActualExecTimesData>(this.filePath, {
        overrunPossibility: this.overrunPossibility,
        duration: currentSimulationDuration,
        jobs: this.jobs,
      });
    }
  }

  get filePath() {
    return `${SAVED_JOBS_DIRECTORY}/${this.taskSetId}(${this.overrunPossibility}%).xml`;
  }

  parse(raw: unknown): SavedActualExecTimesData {
    // @ts-ignore
    const ovp = raw?.overrunPossibility?._text;
    // @ts-ignore
    const jobs = raw?.jobs?.map(item => ({id: item.id._text, time: item.time._text}));
    // @ts-ignore
    const duration = raw?.duration?._text || 0;
    return {
      overrunPossibility: ovp,
      jobs,
      duration,
    }
  }

  read() {
    const rawData = readFromXMLFile(this.filePath);
    const data = this.parse(rawData);
    // console.log('DEBUG', data, rawData);
    if (data && data.jobs && data.overrunPossibility == this.overrunPossibility) {
      this.jobs = data.jobs;
      this.savedDataDuration = data.duration;
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
      const shouldOverrun = random < this.overrunPossibility / 100;
      // for some task sets, CHI is zero for Lo tasks
      const cap = task.c.HI ? task.c.HI : task.c.LO + 0.1;
      const generatedActualExecTime = shouldOverrun ? getRandomBetweenInclusive(task.c.LO, cap) : getRandomBetweenInclusive(task.c.LO / 2, task.c.LO);
      this.saveNewJobs({id: jobId, time: generatedActualExecTime})
      return generatedActualExecTime;
    }
  }

}