import {getRandomBetweenInclusive, readFromXMLFile, writeToXMLFile} from "../utils";
import {Task} from "../classes/base/Task";
import {ExecTimeGeneratorModes, HI, SimulationConfig} from "../types";
import configurations from "../configurations";

const SAVED_JOBS_DIRECTORY = "./src/jobs_data/out";

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
  mode: ExecTimeGeneratorModes;

  constructor(taskSet: {id: string, tasks: Task[]}, config: SimulationConfig) {
    this.taskSetId = taskSet.id;
    this.overrunPossibility = config.overrunProbabilityPercentage;
    this.mode = config.ExecTimeGeneratorMode;
    this.read();
  }

  save(currentSimulationDuration: number) {
    // console.log('DEBUG: these are your jobs', this.jobs);
    if (this.mode === 'random' && currentSimulationDuration > this.savedDataDuration) {
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
    if (this.mode === 'random') {
      const rawData = readFromXMLFile(this.filePath);
      const data = this.parse(rawData);
      // console.log('DEBUG', data, rawData);
      if (data && data.jobs && data.overrunPossibility == this.overrunPossibility) {
        this.jobs = data.jobs;
        this.savedDataDuration = data.duration;
      }
    }
  }

  saveNewJobs(data: SavedJob) {
    this.jobs.push(data);
  }

  generate(jobId: string, task: Task): number {
    if (this.mode === 'HI') return task.c.HI;
    if (this.mode === 'LO') return task.c.LO;
    if (this.mode === 'level') return task.c[task.level];
    // random:
    const savedJob = this.jobs.find(j => j.id == jobId);
    if (savedJob) return Number(savedJob.time);
    else {
      const random = Math.random();
      // just let the HI tasks to overrun
      const shouldOverrun = task.level === HI && (random < this.overrunPossibility / 100);
      // for some task sets, CHI is zero for Lo tasks
      const cap = task.c.HI ? task.c.HI : (task.c.LO + 0.1);
      const generatedActualExecTime = shouldOverrun ? getRandomBetweenInclusive(task.c.LO, cap) : getRandomBetweenInclusive(task.c.LO / 2, task.c.LO);
      // console.log('DEBUG', {random, jobId, generatedActualExecTime, shouldOverrun})
      if(generatedActualExecTime > cap) throw new Error('sth went wrong in job generation ')
      this.saveNewJobs({id: jobId, time: generatedActualExecTime})
      return generatedActualExecTime;
    }
  }

}