import {Task} from "./Task";
import {HI, LO} from "./types";

const preemptiveTaskSet = {
  id: "preemptiveTaskSet",
  tasks: [
    new Task({id: "1", period: 4, level: LO, c: {LO: 1, HI: 0}}),
    new Task({id: "2", period: 10, level: LO, c: {LO: 6, HI: 0}}),
  ],
};
export const mcsTasksetSimple = {
  id: "mcsTasksetSimple",
  tasks: [
    new Task({id: "1", period: 5, level: LO, c: {LO: 1, HI: 0}, phase: 1}),
    new Task({id: "2", period: 6, level: LO, c: {LO: 2, HI: 0}}),
    new Task({id: "3", period: 10, level: HI, c: {LO: 1, HI: 3}, phase: 2}),
    new Task({id: "4", period: 15, level: HI, c: {LO: 1, HI: 3}}),
  ],
};