import { basicAuthToken } from "./utils/auth";
import ora from "ora";
import pLimit from "p-limit";
import {
  fetchAllDistricts,
  fetchDistrict,
  fetchSchoolsByDistrict,
  fetchTeachersBySchool,
} from "./utils/fetch";
import { arrayToCSV, writeToFile } from "./utils/helpers";
import { District, DistrictData, DistrictIdMap, Token } from "./types";

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

    const tokenResponses = await fetchAllDistricts(basicAuthToken);

    const districtDataResponses = await Promise.all(
      tokenResponses.map((token: Token) => limit(() => fetchDistrict(token)))
    );

    // All the primary contacts of the district.
    // Convert the district data into a lookup table with the district ID so we can use it for teachers and distirct admins.
    const allDistrictData = districtDataResponses.reduce((acc, district) => {
      const districtData = district.data[0].data;
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

    // Mapper to store the access token with the district_id as the key.
    let districtIdMap = new Map();
    for (let district of tokenResponses) {
      districtIdMap.set(district.owner.id, district.access_token);
    }

    spinner.succeed(
      `[Succeed] Processed all ${allDistrictData.size} districts`
    );

    // Build and store all the district admins for our output
    await buildAndStorePrimaryDistrictAdmins(allDistrictData);

    // Build and store all the teachers for our output
    await buildAndStoreTeacherContacts(
      tokenResponses,
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

const buildAndStorePrimaryDistrictAdmins = async (
  allDistrictData: Map<string, DistrictData>
) => {
  spinner.start("[Loading] Fetching District Admins....");

  spinner.succeed(
    `[Succeed] Processed all ${allDistrictData.size} Admin Contacts.`
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
        label: "First Name",
        value: "firstName",
      },
      {
        label: "Last Name",
        value: "lastName",
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

  const primaryAdminContacts = Array.from(allDistrictData.values());
  const districtAdminCsv = await arrayToCSV(
    primaryAdminContacts,
    districtAdminOpts
  );

  spinner.start("[Loading] Saving to CSV....");

  const districtFilePath = "./district/primaryAdminContacts.csv";
  await writeToFile(districtFilePath, districtAdminCsv);

  spinner.succeed(`[Succeed] ${districtFilePath} file generated`);
};

// NOTE: We may need this in the future if Miguel wanted all the district contacts.
// const buildAndStoreAllDistrictAdmins = async (
//   districtIdMap: Map<DistrictIdMap["id"], DistrictIdMap["access_token"]>,
//   allDistrictData: Map<string, District>
// ) => {
//   spinner.start("[Loading] Fetching All District Admins....");

//   // Get every admins for every district
//   const districts = Array.from(districtIdMap.keys());
//   const districtAdminResponses = await Promise.all(
//     districts.map((districtId) =>
//       limit(() => fetchDistrictAdmins(districtIdMap.get(districtId)))
//     )
//   );

//   const allDistrictAdminContacts: DistrictAdminContacts[] = [];
//   for (let districtAdminResponse of districtAdminResponses) {
//     for (let { data: districtAdmin } of districtAdminResponse) {
//       const districtName = allDistrictData.get(districtAdmin.district)?.name;
//       const districtId = allDistrictData.get(districtAdmin.district)?.id;
//       const ncesId = allDistrictData.get(districtAdmin.district)?.nces_id;
//       allDistrictAdminContacts.push({
//         name: districtName,
//         id: districtId,
//         nces_id: ncesId,
//         contact: districtAdmin.name?.first + " " + districtAdmin.name?.last,
//         email: districtAdmin.email,
//         title: districtAdmin.roles?.district_admin?.title,
//       });
//     }
//   }

//   spinner.succeed(
//     `[Succeed] Processed all ${allDistrictAdminContacts.length} Admin Contacts.`
//   );

//   const districtAdminOpts = {
//     fields: [
//       {
//         label: "District Name",
//         value: "name",
//       },
//       {
//         label: "District ID",
//         value: "id",
//       },
//       {
//         label: "NCES ID",
//         value: "nces_id",
//       },
//       {
//         label: "Primary Contact",
//         value: "contact",
//       },
//       {
//         label: "Primary Contact Email",
//         value: "email",
//       },
//       {
//         label: "Primary Contact Title",
//         value: "title",
//       },
//     ],
//   };

//   const districtAdminCsv = await arrayToCSV(
//     allDistrictAdminContacts,
//     districtAdminOpts
//   );

//   spinner.start("[Loading] Saving to CSV....");

//   const districtFilePath = "./district/allAdminContacts.csv";
//   await writeToFile(districtFilePath, districtAdminCsv);

//   spinner.succeed(`[Succeed] ${districtFilePath} file generated`);
// };

const buildAndStoreTeacherContacts = async (
  districtResponses: Token[],
  districtIdMap: Map<string, DistrictIdMap["access_token"]>,
  allDistrictData: Map<string, District>
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
    for (let schoolData of school) {
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
    for (let schoolData of school) {
      schoolPromises.push(schoolData);
    }
  }

  const schoolDataResponses = await Promise.all(
    schoolPromises.map((school) =>
      limit(() =>
        fetchTeachersBySchool(
          school.data,
          districtIdMap.get(school.data.district)
        )
      )
    )
  );

  spinner.succeed(
    `[Succeed] Processed all ${schoolDataResponses.length} schools`
  );

  // Build the Teachers data for our output
  const allTeachersData = [];
  for (let schoolData of schoolDataResponses) {
    for (let { data: teacher } of schoolData) {
      const schoolId = teacher.roles.teacher.school;
      const schoolName = allSchoolData.get(schoolId)?.name;
      const districtName = allDistrictData.get(teacher.district)?.name;
      allTeachersData.push({
        schoolName,
        schoolId,
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
        label: "School ID",
        value: "schoolId",
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
        label: "Teacher First Name",
        value: "firstname",
      },
      {
        label: "Teacher Last Name",
        value: "lastName",
      },
      {
        label: "Teacher Email",
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
