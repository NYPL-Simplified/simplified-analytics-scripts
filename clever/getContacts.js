import { basicAuthToken } from "./utils/auth.js";
import ora from "ora";
import pLimit from "p-limit";
import {
  fetchAllDistricts,
  fetchDistrict,
  fetchDistrictAdmins,
  fetchSchoolsByDistrict,
  fetchTeachersBySchool,
} from "./utils/fetch.js";
import { arrayToCSV, writeToFile } from "./utils/helpers.js";

const MAX_CONCURRENT_REQUESTS = 50;
const spinner = ora().start();
const limit = pLimit(MAX_CONCURRENT_REQUESTS);

/**
 * The district response is needed for all subsequent requests because it contains the access_token.
 * The access token is needed to fetch the schools, admins, and teachers data
 */
const main = async () => {
  try {
    spinner.start("[Loading] Fetching Clever districts....");

    const districtResponses = await fetchAllDistricts(basicAuthToken);

    const districtDataResponses = await Promise.all(
      districtResponses.map((district) => limit(() => fetchDistrict(district)))
    );

    // Convert the district data into a lookup table with the district ID so we can use it for teachers and distirct admins.
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

    // Mapper to store the access token with the district_id as the key.
    let districtIdMap = new Map();
    for (let district of districtResponses) {
      districtIdMap.set(district.owner.id, district.access_token);
    }

    spinner.succeed(
      `[Succeed] Processed all ${allDistrictData.size} districts`
    );

    // Build and store all the district admins for our output
    await buildAndStoreDistrictAdmins(districtIdMap, allDistrictData);

    // Build and store all the teachers for our output
    await buildAndStoreTeacherContacts(
      districtResponses,
      districtIdMap,
      allDistrictData
    );
  } catch (error) {
    console.log(error);
    spinner.fail("[Failed] Failed to process Clever districts.");
  }

  spinner.succeed(`[Done]`);
};

main();

const buildAndStoreDistrictAdmins = async (districtIdMap, allDistrictData) => {
  spinner.start("[Loading] Fetching District Admins....");

  // Get every admins for every district
  const districts = Array.from(districtIdMap.keys());
  const districtAdminResponses = await Promise.all(
    districts.map((districtId) =>
      limit(() => fetchDistrictAdmins(districtIdMap.get(districtId)))
    )
  );

  const allDistrictAdminContacts = [];
  for (let districtAdminResponse of districtAdminResponses) {
    for (let districtAdmin of districtAdminResponse.data) {
      const districtName = allDistrictData.get(
        districtAdmin.data.district
      )?.name;
      const districtId = allDistrictData.get(districtAdmin.data.district)?.id;
      const ncesId = allDistrictData.get(districtAdmin.data.district)?.nces_id;
      allDistrictAdminContacts.push({
        name: districtName,
        id: districtId,
        nces_id: ncesId,
        contact:
          districtAdmin.data.name?.first + " " + districtAdmin.data.name?.last,
        email: districtAdmin.data.email,
        title: districtAdmin.data.roles?.district_admin?.title,
      });
    }
  }

  spinner.succeed(
    `[Succeed] Processed all ${allDistrictAdminContacts.length} Admin Contacts.`
  );

  const districtAdminOpts = {
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
        label: "Primary Contact Email",
        value: "email",
      },
      {
        label: "Primary Contact Title",
        value: "title",
      },
    ],
  };

  const districtAdminCsv = await arrayToCSV(
    allDistrictAdminContacts,
    districtAdminOpts
  );

  spinner.start("[Loading] Saving to CSV....");

  const districtFilePath = "./districtAdminContacts.csv";
  await writeToFile(districtFilePath, districtAdminCsv);

  spinner.succeed(`[Succeed] ${districtFilePath} file generated`);
};

const buildAndStoreTeacherContacts = async (
  districtResponses,
  districtIdMap,
  allDistrictData
) => {
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

  // Build the Teachers data for our output
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

  spinner.succeed(`[Succeed] Processed all ${allTeachersData.length} Teachers`);

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

  // The teacher data may be too large so I am breaking them into chuncks
  const chunkSize = 100000;
  let fileIndex = 0;
  for (let i = 0; i < allTeachersData.length; i += chunkSize) {
    const chuncks = allTeachersData.slice(i, i + chunkSize);

    const teacherContactCsv = await arrayToCSV(chuncks, teacherOpts);
    const teacherFilePath = `./teachers/contact_${fileIndex}.csv`;
    await writeToFile(teacherFilePath, teacherContactCsv);
    spinner.succeed(`[Succeed] ${teacherFilePath} file generated`);
    fileIndex++;
  }
};
