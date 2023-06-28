import fetch from "node-fetch";

export const BASE_API_V3 = "https://api.clever.com/v3.0";
export const DISTRICTS_ENDPOINT =
  "https://clever.com/oauth/tokens?owner_type=district";

/**
 *  Fetches all districts from Clever by basic token
 *
 *  https://dev.clever.com/reference/getdistricts-1
 *
 * @param {string} token
 * @returns {Promise<object[]>} districts
 */
export const fetchAllDistricts = async (token) => {
  const response = await fetch(DISTRICTS_ENDPOINT, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Basic ${token}`,
    },
  });

  const { data: districts } = await response.json();

  return districts;
};

/**
 * Fetches a district from Clever by id and access_token
 *
 * https://dev.clever.com/reference/getdistrict-1
 *
 * @param {object} district
 * @returns {Promise<object[]>} districtResponses
 */
export const fetchDistrict = async (district) => {
  const response = await fetch(`${BASE_API_V3}/districts`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${district.access_token}`,
      id: district.id,
    },
  });

  const districtResponses = await response.json();

  return districtResponses;
};

/**
 * Fetches all district admins from Clever
 *
 * https://dev.clever.com/reference/getusers-1
 *
 * @param {string} accessToken
 * @returns {Promise<object[]>} districtAdminResponses
 */
export const fetchDistrictAdmins = async (accessToken) => {
  const response = await fetch(`${BASE_API_V3}/users?role=district_admin`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const districtAdminResponses = await response.json();

  return districtAdminResponses;
};

/**
 * Fetches all schools from Clever from a given district
 *
 * https://dev.clever.com/reference/getschools-1
 *
 * @param {string} accessToken access_token from district
 * @returns {Promise<object[]>} schoolResponses
 */
export const fetchSchoolsByDistrict = async (accessToken) => {
  const response = await fetch(`${BASE_API_V3}/schools`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const schoolResponses = await response.json();

  return schoolResponses;
};

/**
 * Fetches all teachers from Clever from a given district
 *
 * https://dev.clever.com/reference/getusers-1
 *
 * @param {object} school school object
 * @param {string} accessToken access_token from distict
 * @returns {Promise<object[]>} teachers
 */
export const fetchTeachersBySchool = async (school, accessToken) => {
  const response = await fetch(
    `${BASE_API_V3}/schools/${school.data.id}/users?role=teacher`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  const teachers = await response.json();

  return teachers;
};
