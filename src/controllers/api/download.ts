import { Response, Request, NextFunction } from "express";
import { RequestPromise, RequestPromiseOptions } from "request-promise-native";
import rp from "request-promise-native";

// rp.defaults({ jar: true });
const COOKIE_JAR = rp.jar();

// Maximum number of activities you can request at once.
// Used to be 100 and enforced by Garmin for older endpoints; for the current endpoint 'URL_GC_LIST'
// the limit is not known (I have less than 1000 activities and could get them all in one go)
const LIMIT_MAXIMUM = 1000;

const MAX_TRIES = 3;

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

export let download = (req: Request, res: Response, next: NextFunction) => {
  res.write("Welcome to Garmin Connect Exporter!\n\n");

  const args = req.query;
  login_to_garmin_connect(res, args).then(success => {
    if (!success) {
      return res.end("Failed to login. Please enter 'username' and 'password'");
    }

    res.end("downloading end");
  });
};

async function login_to_garmin_connect(
  res: Response,
  args: any
): Promise<boolean> {
  if (args.username && args.password) {
    // Initially, we need to get a valid session cookie, so we pull the login page.
    res.write("Request login page\n\n");
    await http_req(URL_GC_LOGIN);
    res.write("Finish login page\n\n");

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

    res.write("Post login data\n\n");
    const login_response = await http_req(URL_GC_LOGIN, post_data);
    res.write("Finish login post\n\n");

    const pattern = /\?ticket=(.*)\"/g;
    const match = pattern.exec(login_response.body);
    if (!match || match.length === 0)
      throw Error(
        "Did not get a ticket in the login response. Cannot log in. Did you enter the correct username and password?"
      );
    const login_ticket = match[1];

    res.write("login ticket=" + login_ticket);
    http_req(URL_GC_POST_AUTH + "ticket=" + login_ticket);
    res.write("Finished authentication");

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

function urlencode(data: { [key: string]: string }): string {
  const strArr: string[] = [];
  Object.keys(data).forEach(key => {
    strArr.push(key + "=" + encodeURIComponent(data[key]));
  });
  return strArr.join("&");
}
