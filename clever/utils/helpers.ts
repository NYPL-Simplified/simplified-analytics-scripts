import * as fs from "fs";
import * as path from "path";

import { AsyncParser, ParserOptions } from "@json2csv/node";

/**
 *
 * @param {Array} data
 * @param {ParserOptions} opts
 * @returns {Promise<string>} csv
 */
export async function arrayToCSV(data: Array<any>, opts: ParserOptions) {
  const parser = new AsyncParser(opts);
  const csv = await parser.parse(data).promise();
  return csv;
}

/**
 *
 * Write data to file, if the directory doesn't exist, create it first.
 *
 * @param {string} fileName
 * @param {string} data
 * @returns {Promise<void>}
 */
export async function writeToFile(fileName: string, data: any) {
  const fileDir = path.dirname(fileName);

  if (!fs.existsSync(fileDir)) {
    fs.mkdirSync(fileDir, { recursive: true });
  }

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
