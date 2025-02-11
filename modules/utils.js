// @ts-check

import { Auth } from "aws-amplify";
import { readAsStringAsync } from "expo-file-system";
import { decode } from "base64-arraybuffer";
import config from "./customer/config";
import AWS from "aws-sdk";

/**
 * Util function to check if Object is empty ({})
 * @param {Object} obj - Object to check for keys
 * @returns {boolean}
 */
export function isEmpty(obj) {
  for (const prop in obj) {
    if (Object.hasOwn(obj, prop)) {
      return false;
    }
  }

  return true;
}

/**
 * Util function to check for differences between objects.
 * Assumes objects in comparison have the same keys and will only use keys from
 * Object A.
 *
 * @param {Object} a - object A to compare with
 * @param {Object} b - object B to compare with
 * @param {number} [depth=1] - how deep nested properties should be compared (default: 1 layer)
 * @returns {{[k: string]: any[]}}
 */
export function objDiff(a, b, depth = 1) {
  return Object.keys(a).reduce((diff, key) => {
    if (typeof a[key] !== typeof b[key]) {
      diff[key] = [a[key], b[key]];
    }
    if (typeof a[key] === "object" && depth) {
      let recDiff = objDiff(a[key], b[key], depth - 1);
      if (!isEmpty(recDiff)) {
        diff[key] = recDiff;
      }
    } else if (a[key] !== b[key]) {
      diff[key] = [a[key], b[key]];
    }
    return diff;
  }, {});
}

/**
 * Utility function that handles S3 bucket upload of selected profile picture
 * @param {{ uri: any; fileName?: string; mimeType: any; }} image
 * @returns {Promise<string>} URL of the uploaded object
 */
export async function uploadImageToS3(image) {
  let blob = await readAsStringAsync(image.uri, { encoding: "base64" });
  const { username } = await Auth.currentUserInfo();
  let keyString = `customers/${username}/${new Date().getTime()}.${/(?<=image\/).*/.exec(
    image.mimeType
  )}`;

  return new Promise((resolve, reject) => {
    let body = decode(blob);

    new AWS.S3({
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    }).upload(
      {
        Bucket: config.bucket,
        Key: keyString,
        Body: body,
        ContentType: image.mimeType,
        ACL: "public-read",
      },
      (err, data) => {
        console.log(err);
        if (!err) {
          resolve(data.Location);
        } else {
          reject(err);
        }
      }
    );
  });
}

/**
 * Utility function to limit how long async functions are allowed to run for
 *
 * @param {number} limit - time limit in milliseconds
 * @param {() => Promise} callback - callback with Promise to evaulate within time limit
 * @returns
 */
export async function runWithTimeLimit(limit, callback) {
  // Use a uniquely identifiable ID to determine if timeout occured
  const timeoutIndicator = {};

  /**
   * @param {number} limit - in milliseconds
   * @returns {Promise<Object>} - A promise resolving to [timeoutIndicator] after the time limit.
   */
  function setTimeLimit(limit) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(timeoutIndicator);
      }, limit);
    });
  }

  // Use Promise race to limit callback to time limit
  let result = await Promise.race([callback(), setTimeLimit(limit)]);

  if (result === timeoutIndicator) {
    throw new Error(`Callback timed out after ${limit}ms`);
  }

  return result;
}
