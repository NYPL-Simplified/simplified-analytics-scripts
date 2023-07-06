import ora from "ora";
import pLimit from "p-limit";
import { arrayToCSV, parseDistrictData, writeToFile } from "./utils/helpers";
import { basicAuthToken } from "./utils/auth";
import {
  fetchAllDistricts,
  fetchDistrict,
  fetchSchoolsByDistrict,
} from "./utils/fetch";
import { NumberOfSchool, SchoolData, SchoolLocation, Token } from "./types";

const spinner = ora().start();

const main = async () => {
  let schoolLocations: SchoolLocation[] = [];
  let numSchools: NumberOfSchool[] = [];

  try {
    spinner.start("[Loading] Fetching Clever districts....");

    const tokenResponses: Token[] = await fetchAllDistricts(basicAuthToken);

    const districtDataResponses = await Promise.all(
      tokenResponses.map((token: Token) => fetchDistrict(token))
    );

    // All the primary contacts of the district.
    // Convert the district data into a lookup table with the district ID so we can use it for teachers and distirct admins.
    const allDistrictData = parseDistrictData(districtDataResponses);

    const schoolResponses = await Promise.all(
      tokenResponses.map((token: Token) =>
        fetchSchoolsByDistrict(token.access_token)
      )
    );

    schoolResponses.forEach((schoolResponse: SchoolData[]) => {
      schoolResponse.forEach((data: SchoolData) => {
        const { location = undefined, id } = data.data;

        const existingIndex = numSchools.findIndex(
          (el) =>
            el.city === (location?.city || "N/A") &&
            el.state === (location?.state || "N/A") &&
            el.districtId === data.data.district
        );

        if (existingIndex === -1) {
          const numSchoolObj = {
            districtId: data.data.district,
            districtName:
              allDistrictData.get(data.data.district)?.name || "N/A",
            city: location?.city || "N/A",
            state: location?.state || "N/A",
            zip: location?.zip || "N/A",
            numSchoolsInLocation: 1,
          };
          numSchools.push(numSchoolObj);
        } else {
          numSchools[existingIndex].numSchoolsInLocation++;
        }

        const schoolLocationObj = {
          id,
          city: location?.city || "N/A",
          state: location?.state || "N/A",
          zip: location?.zip || "N/A",
        };
        schoolLocations.push(schoolLocationObj);
      });
    });

    buildAndStoreSchools(schoolLocations);
    buildAndStoreNumSchoolsByDistrict(numSchools);

    // print number of participating districts
    spinner.succeed(
      `[Done] Number of participating school districts: ${tokenResponses.length}`
    );

    // print number of participating schools
    spinner.succeed(
      `Number of participating schools: ${schoolLocations.length}`
    );
  } catch (error) {
    spinner.fail(`[Failed] Failed to process Clever districts.${error}`);
  }
};

main();

const buildAndStoreSchools = async (schoolLocations: SchoolLocation[]) => {
  const schoolOpts = {
    fields: [
      {
        label: "School ID",
        value: "id",
      },
      {
        label: "City",
        value: "city",
      },
      {
        label: "State",
        value: "state",
      },
      {
        label: "Zip",
        value: "zip",
      },
    ],
  };

  spinner.start("[Loading] Saving to CSV....");

  const districtAdminCsv = await arrayToCSV(schoolLocations, schoolOpts);

  const schoolLocationsFilePath = "./output/school/locations.csv";

  await writeToFile(schoolLocationsFilePath, districtAdminCsv);

  spinner.succeed(`[Succeed] ${schoolLocationsFilePath} file generated`);
};

async function buildAndStoreNumSchoolsByDistrict(numSchools: NumberOfSchool[]) {
  const numSchoolOpts = {
    fields: [
      {
        label: "District ID",
        value: "districtId",
      },
      {
        label: "District Name",
        value: "districtName",
      },
      {
        label: "City",
        value: "city",
      },
      {
        label: "State",
        value: "state",
      },
      {
        label: "Zip",
        value: "zip",
      },
      {
        label: "Number of Schools",
        value: "numSchoolsInLocation",
      },
    ],
  };

  spinner.start("[Loading] Saving to CSV....");

  const districtAdminCsv = await arrayToCSV(numSchools, numSchoolOpts);

  const schoolLocationsFilePath = "./output/school/numSchools.csv";

  await writeToFile(schoolLocationsFilePath, districtAdminCsv);

  spinner.succeed(`[Succeed] ${schoolLocationsFilePath} file generated`);
}
