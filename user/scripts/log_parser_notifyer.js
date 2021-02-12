/**
 * After some research I found out that streams
 * would have been better approach, because that would
 * scale better and work better with larger files.
 * I read into it at very last stage of coding
 * so I finished  with regular fs.syncRead
 */
// exports
const fs = require("fs");
const parse = require("csv-parse/lib/sync");

// get all command line arguments and save it
const args = process.argv;

// assign each path to variable data comes form path after -d flag
// since we are using similar code 3 times lets make method that does this.
const paths = {};
args.forEach((arg) => {
  if (arg.startsWith("-")) {
    assignPaths(arg);
  }
});

// now we have path assigned lets get files
const csvParseOptions = {
  relax_column_count_more: true,
  bom: true,
  columns: true,
  ignore_last_delimiters: true,
};

const users = parse(fs.readFileSync(paths["-u"], "ascii"), csvParseOptions);
const errorMessages = parse(
  fs.readFileSync(paths["-m"], "ascii"),
  csvParseOptions
);

// get names of all files with logs
const logFilePathsArray = getFiles(paths["-d"]);

let logs = logFilePathsArray.map((filePath) => {
  const log = fs.readFileSync(filePath, "ascii");
  return log;
});

// make each line of logs item in array of logs
logs = logs.join("").split("\r\n");

/** I AM ASSUMING I AM NOT WRITING ANY FILE
 * SINCE THAT WILL CHANGE OUTPUT AFTER EACH RUN
 * I WILL JUST OUTPUT ERRORS FORM LOG*/

// loop trough logs and log each err
logs.forEach((log) => {
  const err = { error_message: log };
  if (log.startsWith("Error")) {
    err.id = 0;
  } else if (log.startsWith("Warning")) {
    err.id = 1;
  } else if (log.startsWith("Invalid build")) {
    err.id = 2;
  }
  if (err.id >= 0) {
    logError(err, users);
  }
});

// now we have data lets log error messages
for (let err of errorMessages) {
  logError(err, users);
}

// helper functions

// assign each path to object with key as flag of that path
function assignPaths(flag) {
  let idx = args.indexOf(flag);
  paths[flag] = args[idx + 1];
}

// recursively search for all files with .txt ending
function getFiles(dirPath) {
  // get contents of directory if readdir wont get anything assign it to empty array
  const logDirs = fs.readdirSync(dirPath) || [];

  const logFilePath = logDirs.map((dir) => {
    // check if current item is file ending in txt
    if (dir.endsWith(".txt")) {
      // if here it is path concat it with dirPath and return
      return dirPath + dir;
    } else {
      // it is directory call getFiles at that directory
      return getFiles(dirPath + dir + "\\");
    }
  });

  // return flattened array
  return logFilePath.flat();
}

// function to log error messages
function logError(err, _users) {
  for (let user of _users) {
    if (user.messages_to_subscribe.includes(err.id)) {
      console.log(
        "Notifying " + user.name + " of " + err.id + "! " + err.error_message
      );
    }
  }
}
