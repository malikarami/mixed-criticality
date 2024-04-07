interface Task {
  utilization: number;
  period: number;
  executionTime: number;
  deadline: number;
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

// Generate Task Sets
function generateTaskSet(n: number, totalUtilization: number): Task[] {
  const utilizations = uunifast(totalUtilization, n);
  const periods = logUniform(1, 1000, n);
  const tasks: Task[] = utilizations.map((u, index) => ({
    utilization: u,
    period: periods[index],
    executionTime: u * periods[index],
    deadline: periods[index], // Di = Ti
  }));
  return tasks;
}

const n = 10; // Number of tasks
const totalUtilization = 0.75; // Total system utilization
const maryam = generateTaskSet(n, totalUtilization);


export default maryam;
