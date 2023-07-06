import fetch, { RequestInfo, RequestInit, Response } from "node-fetch";
import {
  Token,
  School,
  SchoolData,
  DistrictAdminData,
  DistrictData,
} from "../types";
import pLimit from "p-limit";

export const BASE_API = "https://api.clever.com";
export const BASE_API_V3 = `${BASE_API}/v3.0`;
export const DISTRICTS_ENDPOINT =
  "https://clever.com/oauth/tokens?owner_type=district";

const MAX_CONCURRENT_REQUESTS = 500;
const limit = pLimit(MAX_CONCURRENT_REQUESTS);

/**
 *  Wraps the original note-fetch function with a rate limiter
 */
export const ratedLimitedFetch = (...args: [RequestInfo, RequestInit?]) =>
  limit(() => fetch(...args));

const MAX_RETRIES = 4;
/**
 * Retries a fetch request up to MAX_RETRIES times
 */
export const withRetry = async (
  url: RequestInfo,
  init?: RequestInit,
  retryCount = 0
): Promise<Response> => {
  try {
    const response = await ratedLimitedFetch(url, init);
    if (!response.ok) {
      throw new Error("Request Failed");
    }
    return response;
  } catch (err) {
    if (retryCount < MAX_RETRIES) {
      console.log("");
      console.log("Retrying request");
      console.log("");
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return withRetry(url, init, retryCount + 1);
    } else {
      throw err;
    }
  }
};
/**
 *  Fetches all districts from Clever by basic token
 *
 *  https://dev.clever.com/reference/getdistricts-1
 *
 * @param {string} token
 * @returns {Promise<object[]>} districts
 */
export const fetchAllDistricts = async (token: string) => {
  let nextPageUri = DISTRICTS_ENDPOINT;
  let allDistricts: Token[] = [];

  const response = await withRetry(nextPageUri, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Basic ${token}`,
    },
  });

  const data: any = await response.json();

  if (!data) {
    throw new Error("Error fetching district tokens");
  }

  allDistricts.push(...data.data);

  return allDistricts;
};

/**
 * Fetches a district from Clever by id and access_token
 *
 * https://dev.clever.com/reference/getdistrict-1
 *
 * @param {object} token
 * @returns {Promise<object[]>} districtResponses
 */
export const fetchDistrict = async (token: Token): Promise<DistrictData[]> => {
  const response = await withRetry(`${BASE_API_V3}/districts`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token.access_token}`,
      id: token.id,
    },
  });

  const districtResponses: any = await response.json();

  if (!districtResponses) {
    throw new Error("Error fetching district data");
  }

  return districtResponses.data;
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
  const response = await withRetry(`${BASE_API_V3}/users?role=district_admin`, {
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
  const allSchools: SchoolData[] = [];

  let nextPageUri = `${BASE_API_V3}/schools`;

  // Handle Pagination
  try {
    do {
      const response = await withRetry(nextPageUri, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const schoolResponses: any = await response.json();

      allSchools.push(...schoolResponses.data);

      const nextLink = schoolResponses.links.find(
        (link: any) => link.rel === "next"
      );

      nextPageUri = nextLink?.uri ? BASE_API + nextLink.uri : "";
    } while (nextPageUri);
  } catch (err) {
    console.log(err);
    throw err;
  }

  return allSchools;
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

  const allTeachers: any = [];

  let nextPageUri = `${BASE_API_V3}/schools/${school.id}/users?role=teacher`;

  do {
    const response = await withRetry(nextPageUri, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data: any = await response.json();

    if (!data) {
      throw new Error("Error fetching teachers");
    }

    allTeachers.push(...data.data);

    const nextLink = data.links.find((link: any) => link.rel === "next");

    nextPageUri = nextLink?.uri ? BASE_API + nextLink.uri : "";
  } while (nextPageUri);

  return allTeachers;
};
