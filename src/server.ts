import express from "express";
import compression from "compression";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import bodyParser from "body-parser";

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const exists = promisify(fs.exists);
const renameFile = promisify(fs.rename);

const isDev = process.env.NODE_ENV === "development";

const DIR = isDev ? "data/lists" : "/data/lists";
const PORT = 3569;
const HOST = "0.0.0.0";

const getFilename = (
  suffix: string = "",
  name: string = "shoppinglist",
  dir: string = DIR,
  ext: string = ".json"
) =>
  path.format({
    name: `${name}${suffix}`,
    dir,
    ext
  });

const URL = "/shopping";

const storeState = async (state: string) => {
  const filename = getFilename();

  if (await exists(filename)) {
    await renameFile(filename, getFilename(Date.now().toString()));
  }
  return writeFile(filename, JSON.stringify(state));
};

const getState = async () => {
  try {
    const file = await readFile(getFilename(), "utf8");
    return JSON.parse(file);
  } catch {
    return null;
  }
};

const server = () => {
  if (!fs.existsSync(DIR)) {
    fs.readdir("/", (err, items) => items.map(item => console.log(item)));

    fs.mkdir(DIR, { recursive: true }, err => {
      console.log(err);
    });
  }

  const app = express();
  app.use(compression({ threshold: 750 }));
  app.use(bodyParser.json());

  app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept"
    );
    next();
  });

  app.use(express.static("./build/"));

  app.get(URL, async (req, res) => {
    try {
      const state = await getState();
      res.send({
        state
      });
    } catch {
      res.send({
        success: false
      });
    }
  });

  app.post(URL, async (req, res) => {
    const state = req.body;

    try {
      await storeState(state);
      res.send({
        success: true
      });
    } catch (err) {
      res.send({
        success: false,
        err
      });
    }
  });

  app.listen(PORT, HOST, function(err: string) {
    if (err) {
      console.log(err);
    } else {
      console.log("listen:" + PORT);
    }
  });
};

server();

export default server;
