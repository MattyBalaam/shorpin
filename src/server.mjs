import express from "express";
import fs from "fs";
import { promisify } from "util";
import bodyParser from "body-parser";
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const PORT = 3569;
const HOST = "0.0.0.0";
const FILE = "./shoppinglist.json";
const URL = "/shopping";
const storeState = async state => {
  try {
    writeFile(FILE, state);
    return true;
  } catch (_a) {
    return false;
  }
};
const getState = async () => {
  try {
    const file = await readFile(FILE, "utf8");
    console.log("file", file);
    return file;
  } catch (_a) {
    return null;
  }
};
const server = () => {
  const app = express();
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
    } catch (_a) {
      res.send({
        success: false
      });
    }
  });
  app.post(URL, async (req, res) => {
    const state = await req.body;

    console.log("post", state);

    try {
      await storeState(JSON.stringify(state));
      res.send({
        success: true
      });
    } catch (_a) {
      res.send({
        success: false
      });
    }
  });
  app.listen(PORT, HOST, function(err) {
    if (err) {
      console.log(err);
    } else {
      console.log("listen:" + PORT);
    }
  });
};
server();
export default server;
