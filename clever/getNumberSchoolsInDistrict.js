// import library dependencies
import fetch from "node-fetch";
import * as dotenv from "dotenv";
import * as fs from "fs";
dotenv.config({ path: ".env.local" });

// create basic auth token from clever client id and client secret
const basicAuthToken = Buffer.from(
  `${process.env.CLIENT_ID}:${process.env.CLIENT_SECRET}`
).toString("base64");

let districtTokensData;

try {
  // fetch all district tokens
  const getTokens = await fetch(
    "https://clever.com/oauth/tokens?owner_type=district",
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Basic ${basicAuthToken}`,
      },
    }
  );

  if (!getTokens.ok) {
    throw new Error(
      `Non 200 response while fetching district tokens: ${response}`
    );
  }

  const districtTokensResponse = await getTokens.json();
  districtTokensData = districtTokensResponse.data;
} catch (err) {
  throw new Error(`Error fetching district tokens ${err}`);
}

// for each district token, get number of schools and their location
let numberOfSchools = 0;
let schoolLocations = [];
let numSchoolsWithoutLocations = 0;

for (let i = 0; i < districtTokensData.length; i++) {
  let schoolsResponseData = [];
  try {
    const getSchoolsInDistrict = await fetch(
      "https://api.clever.com/v3.0/schools",
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${districtTokensData[i].access_token}`,
        },
      }
    );

    if (!getSchoolsInDistrict.ok) {
      throw new Error(
        `Non 200 response while fetching school district id=${districtTokensData[i].id}: ${response}`
      );
    }

    const schoolsResponse = await getSchoolsInDistrict.json();
    schoolsResponseData = schoolsResponse.data;
    numberOfSchools += schoolsResponse.data.length;
  } catch (err) {
    throw new Error(
      `Error fetching school district id=${districtTokensData[i].id}: ${err}`
    );
  }

  // collate location data from each school
  schoolsResponseData.forEach((item) => {
    if (item.data.location) {
      const { city, state, zip } = item?.data?.location;
      const existingIndex = schoolLocations.findIndex(
        (el) => el.city === city && el.state === state
      );
      if (existingIndex === -1) {
        const locationObject = {
          city: city,
          state: state,
          zip: zip,
          numSchoolsInLocation: 1,
        };
        schoolLocations.push(locationObject);
      } else {
        // if the location already exists in the schoolLocations array, don't add another record
        // instead, just increment the numSchoolsInLocation property
        schoolLocations[existingIndex].numSchoolsInLocation++;
      }
    } else {
      numSchoolsWithoutLocations++;
    }
  });
}

const schoolLocationsFilePath = "./schoolLocations.json"

const schoolLocationsJSONString = JSON.stringify(schoolLocations)

fs.writeFile(`${schoolLocationsFilePath}`, schoolLocationsJSONString, err => {
  if (err) {
    throw new Error(`Error writing file ${schoolLocationsFilePath}: ${err}`)
  } else {
      console.log(`Successfully wrote file ${schoolLocationsFilePath}`)
  }
})

// print number of participating districts
console.log(
  `Number of participating school districts: ${districtTokensData.length}`
);

// print number of participating schools
console.log(`Number of participating schools: ${numberOfSchools}`);

// print number of schools without locations
console.log(
  `Number of schools without locations: ${numSchoolsWithoutLocations}`
);
