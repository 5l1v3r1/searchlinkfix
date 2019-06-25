/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 */

"use strict";

let fs = require("fs");
let path = require("path");

let Transform = require("stream").Transform;

exports.readArg = function(prefix, defaultValue)
{
  for (let arg of process.argv)
    if (arg.startsWith(prefix))
      return arg.substr(prefix.length);
  return defaultValue;
};

function transform(modifier, opts)
{
  if (!opts)
    opts = {};

  let stream = new Transform({objectMode: true});
  stream._transform = function(file, encoding, callback)
  {
    if (file.isDirectory())
    {
      callback(null, file);
      return;
    }

    if (!file.isBuffer())
      throw new Error("Unexpected file type");

    if (opts.files && opts.files.indexOf(path.basename(file.path)) < 0)
    {
      callback(null, file);
      return;
    }

    Promise.resolve().then(() =>
    {
      let contents = opts.raw ? file.contents : file.contents.toString("utf-8");
      return modifier(file.path, contents);
    }).then(([filepath, contents]) =>
    {
      file.path = filepath;
      file.contents = Buffer.from(contents, "utf-8");
      callback(null, file);
    }).catch(e =>
    {
      console.error(e);
      callback(e);
    });
  };
  return stream;
}
exports.transform = transform;

exports.download = function(url)
{
  return new Promise((resolve, reject) =>
  {
    let https = require("https");
    let request = https.get(url, response =>
    {
      if (response.statusCode != 200)
      {
        reject(new Error("Unexpected status code: " + response.statusCode));
        response.resume();
        return;
      }

      let data = "";
      response.on("data", chunk =>
      {
        data += chunk;
      });
      response.on("end", () =>
      {
        resolve(data);
      });
    });
    request.on("error", error => reject(new Error(error.message)));
  });
};
