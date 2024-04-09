import {HI, LO, TaskSetInitiator} from "../types";

export const PreemptiveSimpleTaskSet: TaskSetInitiator = {
  id: "PreemptiveSimpleTaskSet",
  tasks: [
    {id: "1", period: 4,deadline: 4, level: LO, c: {LO: 1, HI: 0}},
    {id: "2", period: 10,deadline: 10, level: LO, c: {LO: 6, HI: 0}},
  ],
};
export const MCSSimpleTaskSet: TaskSetInitiator = {
  id: "MCSSimpleTaskSet",
  tasks: [
    {id: "1", period: 10, deadline: 10, level: LO, c: {LO: 1, HI: 0}, phase: 1},
    {id: "2", period: 10, deadline: 10, level: LO, c: {LO: 2, HI: 0}},
    {id: "3", period: 10, deadline: 10, level: HI, c: {LO: 1, HI: 3}, phase: 2},
    {id: "4", period: 15, deadline: 15, level: HI, c: {LO: 1, HI: 3}},
  ],
};