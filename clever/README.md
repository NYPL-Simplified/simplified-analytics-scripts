# Clever Districts & Schools Analytics Script

## There are two scripts in this project
1. `getNumberSchoolsInDistrict.js` - This script fetches Open eBooks data from the Clever API so that we can know more about the number of participating schools, districts, and their locations.
2. `getDistrictEmails.js` - This script 

## How to run either script

1. Make sure you have node installed. You can check if it is installed by running `node -v` in a terminal. If you don't have it installed, you can [download it](https://nodejs.org/en/download/). It is recommended to use node version 14 or above, but the version specified in `.nvmrc` is the version that was used to write the script and thus can guarantee it works with that specific version. If you want or need to manage multiple versions of node on your machine, use node version manager, `nvm`, [details here](https://github.com/nvm-sh/nvm).
2. Clone this repository and navigate to this directory. At the root of this directory, run `npm install` to install all necessary `node_modules/`.
3. Create an `.env.local` file at the root of this project and add the Clever `CLIENT_ID` and `CLIENT_SECRET` values as they appear in the `.env.sample` file. In your `.env.local` file, replace the XXX values with the real ones, which can be found within the [Clever dashboard](https://apps.clever.com/open-ebooks/districts/overview) or within the NYPL AWS account parameter store.
4. Run the script with the command `npm run numSchools` or `npm run districtEmails` depending on which set of data you're trying to generate. The script will take about 12 minutes to run since it needs to loop through hundreds of school districts. If any errors occur, the script will stop and those errors will show in the console. Once finished, it will print some values out to the console. The school locations data will write out to a json file at the root of this directory.

If you need to stop the script while it is running, you can type `ctrl + c` in the terminal.