import { Response, Request, NextFunction } from "express";
import { RequestPromiseOptions } from "request-promise-native";
import rp from "request-promise-native";
import { existsSync } from "fs";

import { assureDirExists, writeToFile } from "../../../_internal/fs";
import { DATA_TMP_DIR } from "../../../util/constants";

const COOKIE_JAR = rp.jar();

// Maximum number of activities you can request at once.
// Used to be 100 and enforced by Garmin for older endpoints; for the current endpoint 'URL_GC_LIST'
// the limit is not known (I have less than 1000 activities and could get them all in one go)
const LIMIT_MAXIMUM = 1000;

const WEBHOST = "https://connect.garmin.com";
const REDIRECT = "https://connect.garmin.com/post-auth/login";
const BASE_URL = "http://connect.garmin.com/en-US/signin";
const SSO = "https://sso.garmin.com/sso";
const CSS =
  "https://static.garmincdn.com/com.garmin.connect/ui/css/gauth-custom-v1.2-min.css";

const DATA = {
  service: REDIRECT,
  webhost: WEBHOST,
  source: BASE_URL,
  redirectAfterAccountLoginUrl: REDIRECT,
  redirectAfterAccountCreationUrl: REDIRECT,
  gauthHost: SSO,
  locale: "en_US",
  id: "gauth-widget",
  cssUrl: CSS,
  clientId: "GarminConnect",
  rememberMeShown: "true",
  rememberMeChecked: "false",
  createAccountShown: "true",
  openCreateAccount: "false",
  usernameShown: "false",
  displayNameShown: "false",
  consumeServiceTicket: "false",
  initialFocus: "true",
  embedWidget: "false",
  generateExtraServiceTicket: "false"
};

const URL_GC_LOGIN = "https://sso.garmin.com/sso/login?" + urlencode(DATA);
const URL_GC_POST_AUTH = "https://connect.garmin.com/modern/activities?";
const URL_GC_SEARCH =
  "https://connect.garmin.com/proxy/activity-search-service-1.2/json/activities?start=0&limit=1";
const URL_GC_LIST =
  "https://connect.garmin.com/modern/proxy/activitylist-service/activities/search/activities?";
const URL_GC_ACTIVITY =
  "https://connect.garmin.com/modern/proxy/activity-service/activity/";
const URL_GC_DEVICE =
  "https://connect.garmin.com/modern/proxy/device-service/deviceservice/app-info/";
const URL_GC_ACT_PROPS =
  "https://connect.garmin.com/modern/main/js/properties/activity_types/activity_types.properties";
const URL_GC_EVT_PROPS =
  "https://connect.garmin.com/modern/main/js/properties/event_types/event_types.properties";
const URL_GC_GPX_ACTIVITY =
  "https://connect.garmin.com/modern/proxy/download-service/export/gpx/activity/";
const URL_GC_TCX_ACTIVITY =
  "https://connect.garmin.com/modern/proxy/download-service/export/tcx/activity/";
const URL_GC_ORIGINAL_ACTIVITY =
  "http://connect.garmin.com/proxy/download-service/files/activity/";

export let download = (req: Request, res: Response, next: NextFunction) => {
  res.write("Welcome to Garmin Connect Exporter!\n\n");

  download_(req.query)
    .then(r => res.end(r))
    .catch(er => res.end(er));
};

export let download_ = (args: any) => {
  return new Promise((resolve, reject) => {
    login_to_garmin_connect(args).then(success => {
      if (!success) {
        return reject(
          "Failed to login. Please enter 'username' and 'password'"
        );
      }

      // We should be logged in now.
      assureDirExists(DATA_TMP_DIR);

      do_download(args).then(success => {
        if (success) {
          resolve("Done!");
        } else {
          resolve("Error Downloading Files...");
        }
      });
    });
  });
};

async function do_download(args: any): Promise<boolean> {
  let total_to_download: number;
  if (args.count === "all") {
  } else {
    total_to_download = +args.count || 1;
  }
  let total_downloaded = 0;
  let num_to_download = 0;
  const promises: Promise<boolean>[] = [];

  // This while loop will download data from the server in multiple chunks, if necessary.
  while (total_downloaded < total_to_download) {
    // Maximum chunk size 'LIMIT_MAXIMUM' ... 400 return status if over maximum.  So download
    // maximum or whatever remains if less than maximum.
    // As of 2018-03-06 I get return status 500 if over maximum
    if (total_to_download - total_downloaded > LIMIT_MAXIMUM)
      num_to_download = LIMIT_MAXIMUM;
    else num_to_download = total_to_download - total_downloaded;

    const search_params = { start: total_downloaded, limit: num_to_download };
    // Query Garmin Connect
    console.log(
      "Making activity request ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n\n"
    );
    console.log(URL_GC_LIST + urlencode(search_params) + "\n\n");
    const result = await http_req(URL_GC_LIST + urlencode(search_params));

    console.log(
      "Finished activity request ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n\n"
    );

    const activities: any[] = JSON.parse(result.body);
    // res.write(JSON.stringify(activities[0]) + "\n\n");

    // Process each activity.
    activities.forEach(a => {
      // Display which entry we're working on.
      console.log("Garmin Connect activity: [" + a["activityId"] + "] \n");
      console.log(a["activityName"] + "\n\n");

      // Retrieve also the detail data from the activity (the one displayed on
      // the https://connect.garmin.com/modern/activity/xxx page), because some
      // data are missing from 'a' (or are even different, e.g. for my activities
      // 86497297 or 86516281)

      // const res2 = await http_req(URL_GC_ACTIVITY + a["activityId"]);
      // const activity_details = JSON.parse(res2.body);
      // res.write(JSON.stringify(activity_details) + "\n\n");

      // EPOCをメタファイルに書き出し
      const { aerobicTrainingEffect, anaerobicTrainingEffect } = a;
      promises.push(
        writeToFile(
          DATA_TMP_DIR + "/activity_" + a["activityId"] + ".json",
          JSON.stringify({
            activityId: a["activityId"],
            aerobicTrainingEffect,
            anaerobicTrainingEffect
          })
        )
      );

      promises.push(export_data_file(a["activityId"], args));
    });

    total_downloaded += num_to_download;
  }

  return Promise.all(promises)
    .then(() => {
      return true;
    })
    .catch(() => {
      return false;
    });
}

async function export_data_file(
  activity_id: string,
  args: any
): Promise<boolean> {
  const format = args.format || "tcx";
  let data_filename: string;
  let download_url: string;

  if (format === "tcx") {
    data_filename = DATA_TMP_DIR + "/activity_" + activity_id + ".tcx";
    download_url = URL_GC_TCX_ACTIVITY + activity_id + "?full=true";
  } else {
    throw new Error("Unrecognized format. " + format);
  }

  if (existsSync(data_filename)) {
    console.log("\tData file already exists; skipping...\n\n");
    return false;
  }

  if (format != "json") {
    // Download the data file from Garmin Connect. If the download fails (e.g., due to timeout),
    // this script will die, but nothing will have been written to disk about this activity, so
    // just running it again should pick up where it left off.
    console.log("\tDownloading file...\n\n");

    let data;
    try {
      data = await http_req(download_url);
    } catch (e) {
      // Handle expected (though unfortunate) error codes; die on unexpected ones.
      if (e.code == 500 && format == "tcx") {
        // Garmin will give an internal server error (HTTP 500) when downloading TCX files
        // if the original was a manual GPX upload. Writing an empty file prevents this file
        // from being redownloaded, similar to the way GPX files are saved even when there
        // are no tracks. One could be generated here, but that's a bit much. Use the GPX
        // format if you want actual data in every file, as I believe Garmin provides a GPX
        // file for every activity.
        console.log(
          "Writing empty file since Garmin did not generate a TCX file for this activity...\n\n"
        );
        data = "";
      } else if (e.code == 404 && format == "original") {
        // For manual activities (i.e., entered in online without a file upload), there is
        // no original file. # Write an empty file to prevent redownloading it.
        console.log(
          "Writing empty file since there was no original activity data...\n\n"
        );
        data = "";
      } else
        throw new Error(
          "Failed. Got an unexpected HTTP error (" +
            e.code +
            download_url +
            ")."
        );
    }

    // Persist file
    return writeToFile(data_filename, data.body);
  }
}

async function login_to_garmin_connect(args: any): Promise<boolean> {
  if (args.username && args.password) {
    // Initially, we need to get a valid session cookie, so we pull the login page.
    console.log("Request login page\n\n");
    await http_req(URL_GC_LOGIN);
    console.log("Finish login page\n\n");

    // Now we'll actually login.
    // Fields that are passed in a typical Garmin login.
    const post_data = {
      username: args.username,
      password: args.password,
      embed: "true",
      lt: "e1s1",
      _eventId: "submit",
      displayNameRequired: "false"
    };

    console.log("Post login data\n\n");
    const login_response = await http_req(URL_GC_LOGIN, post_data);
    console.log("Finish login post\n\n");

    const pattern = /\?ticket=(.*)\"/g;
    const match = pattern.exec(login_response.body);
    if (!match || match.length === 0)
      throw Error(
        "Did not get a ticket in the login response. Cannot log in. Did you enter the correct username and password?"
      );
    const login_ticket = match[1];

    console.log("login ticket=" + login_ticket + "\n\n");
    await http_req(URL_GC_POST_AUTH + "ticket=" + login_ticket);
    console.log("Finished authentication\n\n");

    return true;
  }
  return Promise.resolve(false);
}

async function http_req(url: string, post: any = null, headers = {}) {
  let options: RequestPromiseOptions;
  if (post) {
    options = {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2816.0 Safari/537.36"
      },
      method: "POST",
      form: post,
      jar: COOKIE_JAR,
      resolveWithFullResponse: true
    };
  } else {
    options = {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2816.0 Safari/537.36"
      },
      method: "GET",
      jar: COOKIE_JAR,
      resolveWithFullResponse: true
    };
  }
  // console.log(COOKIE_JAR);
  const response = await rp(url, options);
  // console.log(response);
  // console.log(COOKIE_JAR);
  return response;
}

function urlencode(data: { [key: string]: string | number }): string {
  const strArr: string[] = [];
  Object.keys(data).forEach(key => {
    strArr.push(key + "=" + encodeURIComponent(data[key] + ""));
  });
  return strArr.join("&");
}
