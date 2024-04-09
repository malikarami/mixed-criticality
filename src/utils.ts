import * as xml2js from "xml-js";
import fs from "fs";
import {SYSTEM} from "./classes/System";
import {LO} from "./types";
import {CONFIG} from "./app";

export function readFromXMLFile<T = unknown>(path: string): T | null{
  try {
    // Read the XML from the file
    const xmlFromFile = fs.readFileSync(
      path,
      "utf8"
    );

    // @ts-ignore
    const objFromXml:{ root: T }= xml2js.xml2js(xmlFromFile, {
      compact: true,
    });

    return  objFromXml.root;

  } catch (e) {
    // @ts-ignore
    console.log(`unsuccessful read from ${path}: Error:`, e?.message);
    return null;
  }
  return null;
}

export function writeToXMLFile<T = unknown>(path: string, obj: T) {
  try {
    // convert object to XML
    // @ts-ignore
    const xml = xml2js.js2xml({root: obj}, {compact: true, spaces: 4});

    // Write the XML to a file
    fs.writeFileSync(path, xml);
    console.log("XML file written to", path);
  } catch (e) {
    // @ts-ignore
    console.log(`unsuccessful write to ${path}: Error: `, e?.message);
  }
}

export function getRandomBetweenInclusive(min: number, max: number) {
  const rand = Math.random() * (max - min) + min;
  return Number(rand.toFixed(1));
}

export function isModeChangePossible(): boolean {
  return !CONFIG.traditional && SYSTEM.level == LO;
}

// find n unique numbers in [min, max]
export function getRandomIntegersInInterval(n: number, min: number, max: number): number[] {
  const randomIntegers = new Set();

  while (randomIntegers.size < n) {
    const randomInteger = Math.floor(Math.random() * (max - min + 1)) + min;
    randomIntegers.add(randomInteger);
  }

  return Array.from(randomIntegers) as unknown as number[];
}