import * as fs from "fs";
import * as path from "path";

import { AsyncParser, ParserOptions } from "@json2csv/node";
import { AllDistrictData, DistrictData } from "../types";

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

/**
 * All the primary contacts of the district.
 * Converted the district data into a lookup table with the district ID so we can use it for teachers and distirct admins.
 *
 * @param {DistrictData[][]} districtDataResponses
 * @returns
 */
export function parseDistrictData(
  districtDataResponses: DistrictData[][]
): Map<string, AllDistrictData> {
  const allDistrictData = districtDataResponses.reduce((acc, district) => {
    const districtData = district[0].data;
    acc.set(districtData.id, {
      name: districtData.name,
      id: districtData.id,
      nces_id: districtData.nces_id,
      firstName: districtData?.district_contact?.name.first,
      lastName: districtData?.district_contact?.name.last,
      contact: districtData?.district_contact
        ? `${districtData.district_contact?.name.first} ${districtData.district_contact?.name.last}`
        : undefined,
      email: districtData.district_contact?.email,
      title: districtData?.district_contact?.title,
    });

    return acc;
  }, new Map());

  return allDistrictData;
}
