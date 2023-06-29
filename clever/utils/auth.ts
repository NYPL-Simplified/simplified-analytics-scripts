import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

export const basicAuthToken = Buffer.from(
  `${process.env.CLIENT_ID}:${process.env.CLIENT_SECRET}`
).toString("base64");
