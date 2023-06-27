import * as fs from "fs";
import { AsyncParser } from "@json2csv/node";

export async function arrayToCSV(data, opts) {
  const parser = new AsyncParser(opts);
  const csv = await parser.parse(data).promise();
  return csv;
}

export async function writeToFile(fileName, data) {
  try {
    await fs.writeFile(fileName, data, (err) => {
      if (err) {
        throw new Error(`Error writing file ${fileName}: ${err}`);
      }
    });
  } catch (err) {
    console.log(err);
    process.exit(1);
  }
}
