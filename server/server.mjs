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
const PORT = 3569;
const HOST = "0.0.0.0";
const getFilename = (prefix = "", name = "shoppinglist", dir = "server/lists", ext = ".json") => path.format({
    name: `${name}${prefix}`,
    dir,
    ext
});
const URL = "/shopping";
const storeState = async (state) => {
    const filename = getFilename();
    try {
        if (await exists(filename)) {
            await renameFile(filename, getFilename(Date.now().toString()));
        }
        await writeFile(filename, JSON.stringify(state));
        console.log("done??");
        return true;
    }
    catch (err) {
        console.log(err);
        return err;
    }
};
const getState = async () => {
    try {
        const file = await readFile(getFilename(), "utf8");
        return JSON.parse(file);
    }
    catch (_a) {
        return null;
    }
};
const server = () => {
    const app = express();
    app.use(compression({ threshold: 750 }));
    app.use(bodyParser.json());
    app.use(function (req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        next();
    });
    app.use(express.static("./build/"));
    app.get(URL, async (req, res) => {
        try {
            const state = await getState();
            console.log(state);
            res.send({
                state
            });
        }
        catch (_a) {
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
        }
        catch (_a) {
            res.send({
                success: false
            });
        }
    });
    app.listen(PORT, HOST, function (err) {
        if (err) {
            console.log(err);
        }
        else {
            console.log("listen:" + PORT);
        }
    });
};
server();
export default server;
