import {TaskSetConfig, LO, HI, CriticalityLevel, TaskSetInitiator, TaskInitiator} from "../types";
import {readFromXMLFile, writeToXMLFile} from "../utils";

const TASKS_DIRECTORY = "./src/tasks_data/out";


interface NewTask {
  utilization: number;
  period: number;
  c: {
    LO: number;
    HI: number;
  };
  level: CriticalityLevel;
  id: string;
}

interface SavedTasksData {
  id: string;
  tasks: NewTask[];
}


// UUniFast Algorithm
function uunifast(totalUtilization: number, n: number): number[] {
  let sumU = totalUtilization;
  const utilizations: number[] = [];
  for (let i = 1; i <= n; i++) {
    const nextSumU = sumU * Math.pow(Math.random(), 1 / (n - i + 1));
    utilizations.push(sumU - nextSumU);
    sumU = nextSumU;
  }
  return utilizations;
}

// Log-Uniform Distribution for Periods
function logUniform(min: number, max: number, n: number): number[] {
  const periods: number[] = [];
  for (let i = 0; i < n; i++) {
    const randomLog = Math.exp(Math.random() * (Math.log(max) - Math.log(min)) + Math.log(min));
    periods.push(Math.round(randomLog));
  }
  return periods;
}

// find n unique numbers in [min, max]
function getRandomIntegers(n: number, min: number, max: number): number[] {
  const randomIntegers = new Set();

  while (randomIntegers.size < n) {
    const randomInteger = Math.floor(Math.random() * (max - min + 1)) + min;
    randomIntegers.add(randomInteger);
  }

  return Array.from(randomIntegers) as unknown as number[];
}


// generate a CHI that is smaller than the period
function generateFeasibleWCET(CLO:number, CF: number, D: number): number {
  const  cf = CF > D / CLO ? D / CLO : CF;
  return Number((CLO * cf).toFixed(1));
}


// Generate Task Sets
function generateRandomTaskSet(n: number, totalUtilization: number, CF: number, highTasksIndexes: number[]): NewTask[] {
  const utilizations = uunifast(totalUtilization, n);
  const periods = logUniform(1, 100, n);
  const tasks: NewTask[] = utilizations.map((u, index) => {
    const period = periods[index]; // Di = Ti
    const CLO = Number((u * periods[index]).toFixed(1));
    const CHI = generateFeasibleWCET(CLO, CF, period);
    const isHigh = highTasksIndexes.includes(index);
    return {
      utilization: CLO / period, // D = T
      period,
      c: {
        LO: CLO,
        HI: CHI,
      },
      // precise: { // precise value before rounding the CLO to a 0.1 precision
      //   u,
      //   c: u * periods[index],
      // },
      level: isHigh ? HI : LO,
      id: `${index + 1}`,
    };
  });
  return tasks;
}

const getTotalUtilization = (set: NewTask[]): number => {
  return set.reduce((previousValue: number, currentValue) => {
    return currentValue.utilization + previousValue;
  }, 0);
}

const MAX_ITERATIONS = 50000;
const  generateFeasibleTaskSet = (n: number, totalUtilization: number, CF: number, highTasksIndexes: number[]) => {
  if(CF < 1) throw new Error(`Criticality factor should be greater than 1`);

  let iteration = 0;
  let set: NewTask[];
  do {
    set = generateRandomTaskSet(n, totalUtilization, CF, highTasksIndexes);
    iteration++;
  } while (set.some(task => !task.c.LO || !task.c.HI || task.c.LO > task.period || task.c.HI > task.period) && iteration < MAX_ITERATIONS);

  if(set.some(task => !task.c.LO || !task.c.HI || task.c.LO > task.period || task.c.HI > task.period)) throw new Error(`Not able to generate a feasible task set after ${MAX_ITERATIONS} tries`);

  console.log('DEBUG: Found a feasible task set after', iteration, 'tries with actual utilization of:', getTotalUtilization(set), 'instead of:', totalUtilization);
  return set;
}


function parseXMLData(data: Record<string, any>): SavedTasksData {
  const id = data?.id?._text;
  const tasks = data?.tasks?.map((t: Record<string, any>) => ({
    utilization: Number(t?.utilization?._text),
    period: Number(t?.period?._text),
    c: {
      LO: Number(t?.c?.LO?._text),
      HI: Number(t?.c?.HI?._text),
    },
    id: t?.id?._text,
    level: t?.level?._text,
  }))
  return {
    id, tasks
  }
}


function convertToSimulatorTaskSetFormat(data: SavedTasksData) : TaskSetInitiator {
  const tasks: TaskInitiator[] = data.tasks.map((t, index) => ({
      period: t.period,
      utilization: t.utilization,
      id: t.id,
      level: t.level,
      c: t.c,
      deadline: t.period, // T = D
    }));
  return {
    id: data.id,
    tasks,
  };
}

const generateTaskSet = (config: TaskSetConfig): TaskSetInitiator => {
  const {n, CP, CF, u} = config;
  const id = `${n}-${u}-${CF}-${CP}`;
  const path = `${TASKS_DIRECTORY}/${id}.xml`;

  const savedData: Record<string, any> | null = readFromXMLFile(path);
  const data = savedData ?  parseXMLData(savedData) : undefined;

  if(data && data.tasks && data.id === id ){
    // console.log('DEBUG:', data.tasks);
    console.log('task set loaded from', path);
    return convertToSimulatorTaskSetFormat(data);
  }
  else {
    const highTasksIndexes = getRandomIntegers(Math.floor(n * CP), 0, n - 1);
    // console.log('DEBUG:', highTasksIndexes);
    const tasks = generateFeasibleTaskSet(n, u, CF, highTasksIndexes);
    writeToXMLFile<SavedTasksData>(path, {tasks, id});
    // console.log('DEBUG:', tasks);
    console.log('task set generated to', path);
    return convertToSimulatorTaskSetFormat({tasks, id});
  }
}

export default generateTaskSet;
