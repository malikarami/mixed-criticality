interface Task {
  utilization: number;
  period: number;
  c: {
    LO: number;
    HI: number;
  };
  precise: {
    c: number;
    u: number;
  };
  deadline: number;
  criticality: 'LO' | 'HI';
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
function generateTaskSet(n: number, totalUtilization: number, CF: number, highTasksIndexes: number[]): Task[] {
  const utilizations = uunifast(totalUtilization, n);
  const periods = logUniform(1, 100, n);
  const tasks: Task[] = utilizations.map((u, index) => {
    const deadline = periods[index]; // Di = Ti
    const CLO = Number((u * periods[index]).toFixed(1));
    const CHI = generateFeasibleWCET(CLO, CF, deadline);
    const isHigh = highTasksIndexes.includes(index);
    return {
      utilization: CLO / deadline, // D = T
      period: periods[index],
      c: {
        LO: CLO,
        HI: CHI,
      },
      precise: { // precise value before rounding the CLO to a 0.1 precision
        u,
        c: u * periods[index],
      },
      deadline, // D = T
      criticality: isHigh ? 'HI' : 'LO',
      index: index,
    };
  });
  return tasks;
}

const getTotalUtilization = (set: Task[]): number => {
  return set.reduce((previousValue: number, currentValue) => {
    return currentValue.utilization + previousValue;
  }, 0);
}

const MAX_ITERATIONS = 50000;
const  generateFeasibleTaskSet = (n: number, totalUtilization: number, CF: number, highTasksIndexes: number[]) => {
  let iteration = 0;
  let set: Task[];
  do {
    set = generateTaskSet(n, totalUtilization, CF, highTasksIndexes);
    iteration++;
  } while (set.some(task => !task.c.LO || !task.c.HI) && iteration < MAX_ITERATIONS);

  if(set.some(task => !task.c.LO || !task.c.HI)) throw new Error(`Not able to generate a feasible task set after ${MAX_ITERATIONS} tries`);

  console.log('DEBUG: Found a feasible task set after', iteration, 'tries with actual utilization of:', getTotalUtilization(set), 'instead of:', totalUtilization);
  return set;
}

const n = 20; // Number of tasks
const CP = 0.5;
const CF = 2;
const totalUtilization = 0.9999; // Total system utilization
const highTasksIndexes = getRandomIntegers(Math.floor(n * CP), 0, n - 1);


console.log('DEBUG:', highTasksIndexes);
const maryam = generateFeasibleTaskSet(n, totalUtilization, CF, highTasksIndexes);


export default maryam;
