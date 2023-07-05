import ora from "ora";
import pLimit from "p-limit";
import { arrayToCSV, writeToFile } from "./utils/helpers";
import { basicAuthToken } from "./utils/auth";
import { fetchAllDistricts, fetchSchoolsByDistrict } from "./utils/fetch";
import { SchoolData, SchoolLocation, Token } from "./types";

const MAX_CONCURRENT_REQUESTS = 100;
const spinner = ora().start();
const limit = pLimit(MAX_CONCURRENT_REQUESTS);

const main = async () => {
  let schoolLocations: SchoolLocation[] = [];

  try {
    spinner.start("[Loading] Fetching Clever districts....");

    const tokenResponses: Token[] = await fetchAllDistricts(basicAuthToken);

    const schoolResponses = await Promise.all(
      tokenResponses.map((token: Token) =>
        limit(() => fetchSchoolsByDistrict(token.access_token))
      )
    );

    schoolResponses.forEach((schoolResponse: SchoolData[]) => {
      schoolResponse.forEach((data: SchoolData) => {
        const { location = undefined, id } = data.data;
        const obj = {
          id,
          city: location?.city,
          state: location?.state,
          zip: location?.zip,
        };
        schoolLocations.push(obj);
      });
    });

    buildAndStoreSchools(schoolLocations);

    // print number of participating districts
    spinner.succeed(
      `[Done] Number of participating school districts: ${tokenResponses.length}`
    );

    // print number of participating schools
    spinner.succeed(
      `Number of participating schools: ${schoolLocations.length}`
    );
  } catch (error) {
    console.log(error);
    spinner.fail("[Failed] Failed to process Clever districts.");
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
