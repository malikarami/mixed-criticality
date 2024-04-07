import {Task} from "./Task";
import {CriticalityLevel} from "./types";

export const Utilization =
  (taskSet: Task[]) =>
    (ofLevel: CriticalityLevel, inLevel: CriticalityLevel): number => {
      const tasks = taskSet.filter((t) => t.level === ofLevel);
      return tasks.reduce((utilization: number, task: Task) => {
        const taskUtilization = task.c[inLevel] / task.period;
        return utilization + taskUtilization;
      }, 0);
    };