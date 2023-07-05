import fetch from "node-fetch";
import {
  Token,
  School,
  DistrictData,
  SchoolData,
  DistrictAdminData,
} from "../types";

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
export const fetchAllDistricts = async (token: string) => {
  const response = await fetch(DISTRICTS_ENDPOINT, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Basic ${token}`,
    },
  });

  const data: any = await response.json();

  return data.data;
};

/**
 * Fetches a district from Clever by id and access_token
 *
 * https://dev.clever.com/reference/getdistrict-1
 *
 * @param {object} token
 * @returns {Promise<object[]>} districtResponses
 */
export const fetchDistrict = async (token: Token) => {
  const response = await fetch(`${BASE_API_V3}/districts`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token.access_token}`,
      id: token.id,
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
 * @returns {Promise<DistrictData[]>} districtAdminResponses
 */
export const fetchDistrictAdmins = async (
  accessToken: string | undefined
): Promise<DistrictAdminData[]> => {
  const response = await fetch(`${BASE_API_V3}/users?role=district_admin`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const districtAdminResponses: any = await response.json();

  if (!districtAdminResponses) {
    throw new Error("Error fetching district admins");
  }

  return districtAdminResponses.data;
};

/**
 * Fetches all schools from Clever from a given district
 *
 * https://dev.clever.com/reference/getschools-1
 *
 * @param {string} accessToken access_token from district
 * @returns {Promise<SchoolData[]>} schoolResponses
 */
export const fetchSchoolsByDistrict = async (
  accessToken: string
): Promise<SchoolData[]> => {
  const response = await fetch(`${BASE_API_V3}/schools`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const schoolResponses: any = await response.json();

  return schoolResponses.data;
};

/**
 * Fetches all teachers from Clever from a given district
 *
 * https://dev.clever.com/reference/getusers-1
 *
 * @param {School} school school object
 * @param {string} accessToken access_token from distict
 * @returns {Promise<object[]>} teachers
 */
export const fetchTeachersBySchool = async (
  school: School,
  accessToken: string | undefined
) => {
  if (!accessToken)
    throw new Error("No access token provided for fetchTeachersBySchool");

  const response = await fetch(
    `${BASE_API_V3}/schools/${school.id}/users?role=teacher`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  const data: any = await response.json();

  return data.data;
};
