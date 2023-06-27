import { basicAuthToken } from "./utils/auth.js";
import ora from "ora";
import pLimit from "p-limit";

import {
  fetchAllDistricts,
  fetchDistrict,
  fetchSchoolsByDistrict,
  fetchTeachersBySchool,
} from "./utils/fetch.js";

import { arrayToCSV, writeToFile } from "./utils/helpers.js";

const spinner = ora().start();
const limit = pLimit(50);

const main = async () => {
  try {
    spinner.start("[Loading] Fetching Clever districts....");
    const districtResponses = await fetchAllDistricts(basicAuthToken);

    const districtDataResponses = await Promise.all(
      districtResponses.map((district) => limit(() => fetchDistrict(district)))
    );

    // Convert the district data into a lookup table with the district ID so we can use it for the teachers form later.
    const allDistrictData = districtDataResponses.reduce((acc, district) => {
      const districtData = district.data[0].data;
      acc.set(districtData.id, {
        name: districtData.name,
        id: districtData.id,
        nces_id: districtData.nces_id,
        contact: districtData?.district_contact
          ? `${districtData.district_contact?.name.first} ${districtData.district_contact?.name.last}`
          : undefined,
        email: districtData.district_contact?.email,
      });

      return acc;
    }, new Map());

    // Mapper to record the access token and schools
    // The access token is needed to fetch the schools and teachers
    let districtIdMap = new Map();
    for (let district of districtResponses) {
      districtIdMap.set(district.owner.id, district.access_token);
    }

    spinner.succeed(
      `[Succeed] Processed all ${allDistrictData.size} district data!`
    );

    spinner.start("[Loading] Generating CSV....");

    const districtOpts = {
      fields: [
        {
          label: "District Name",
          value: "name",
        },
        {
          label: "District ID",
          value: "id",
        },
        {
          label: "NCES ID",
          value: "nces_id",
        },
        {
          label: "Primary Contact",
          value: "contact",
        },
        {
          label: " Primary Contact Email",
          value: "email",
        },
      ],
    };

    const districtDataArray = Array.from(allDistrictData.values());
    const districtDataCsv = await arrayToCSV(districtDataArray, districtOpts);

    const districtFilePath = "./districtContacts.csv";
    await writeToFile(districtFilePath, districtDataCsv);
    spinner.succeed(`[Succeed] CSV file generated at ${districtFilePath}`);

    // Schools and Teachers
    spinner.start("[Loading] Fetching Teachers....");

    // Get all the schools for each district
    const schoolResponses = await Promise.all(
      districtResponses.map((district) =>
        limit(() => fetchSchoolsByDistrict(district.access_token))
      )
    );

    // Convert the school data into a lookup table with the school ID so we can use it for the teachers form later.
    const allSchoolData = schoolResponses.reduce((acc, school) => {
      for (let schoolData of school.data) {
        acc.set(schoolData.data.id, {
          name: schoolData.data.name,
          id: schoolData.data.id,
          nces_id: schoolData.data.nces_id,
          district: schoolData.data.district,
        });
      }
      return acc;
    }, new Map());

    // Get the teachers of each school
    const schoolPromises = [];
    for (let school of schoolResponses) {
      for (let schoolData of school.data) {
        schoolPromises.push(schoolData);
      }
    }
    const schoolDataResponses = await Promise.all(
      schoolPromises.map((school) =>
        limit(() =>
          fetchTeachersBySchool(school, districtIdMap.get(school.data.district))
        )
      )
    );

    spinner.succeed(
      `[Succeed] Processed all ${schoolDataResponses.length} schools`
    );

    // Construct the final Teachers data
    const allTeachersData = [];
    for (let schoolData of schoolDataResponses) {
      for (let { data: teacher } of schoolData.data) {
        const schoolId = teacher.roles.teacher.school;
        const schoolName = allSchoolData.get(schoolId)?.name;
        const districtName = allDistrictData.get(teacher.district)?.name;
        allTeachersData.push({
          schoolName,
          // nces_id <- no id, should this be district nces_id or school nces_id?
          districtName,
          districtId: teacher.district,
          firstname: teacher.name.first,
          lastName: teacher.name.last,
          email: teacher.email,
        });
      }
    }

    spinner.succeed(
      `[Loading] Promissed all ${allTeachersData.length} Teachers....`
    );

    const teacherOpts = {
      fields: [
        {
          label: "School Name",
          value: "schoolName",
        },
        {
          label: "District Name",
          value: "districtName",
        },
        {
          label: "District ID",
          value: "districtId",
        },
        {
          label: "Teachers First Name",
          value: "firstname",
        },
        {
          label: "Teachers Last Name",
          value: "lastName",
        },
        {
          label: "Teachers Email",
          value: "email",
        },
      ],
    };
    const teacherDataCsv = await arrayToCSV(allTeachersData, teacherOpts);

    const teacherFilePath = "./teacherContact.csv";
    await writeToFile(teacherFilePath, teacherDataCsv);

    spinner.succeed(`[Succeed] CSV file generated at ${teacherFilePath}`);
  } catch (error) {
    console.log(error);
    spinner.fail("[Failed] Failed to process Clever districts.");
  }
};

main();
