import fetch from "node-fetch";

export const BASE_API_V3 = "https://api.clever.com/v3.0";
export const DISTRICTS_ENDPOINT =
  "https://clever.com/oauth/tokens?owner_type=district";

/**
 *
 * @param {string} basic token generated with username / password
 * @returns
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
 *
 * @param {object} district
 * @returns
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

  return await response.json();
};

export const fetchDistrictAdmins = async (accessToken) => {
  const response = await fetch(`${BASE_API_V3}/users?role=district_admin`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return await response.json();
};

/**
 *
 * @param {string} accessToken access_token from district
 * @returns  schools
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
 *
 * @param {object} school school object
 * @param {string} accessToken access_token from distict
 * @returns teachers
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
