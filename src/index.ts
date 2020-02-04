import dotenv from "dotenv";
import express from "express";
import path from "path";
import helmet from "helmet";
import fs from "fs";
import axios from 'axios';
import bodyParser from 'body-parser';
import * as _sodium from 'libsodium-wrappers';


dotenv.config();
const APPENV = process.env.NODE_ENV;
const HTTP_PORT = process.env.SWB_HTTP_TCP;
const UNIX_SOCKET = process.env.SWB_UNIX_SOCKET;
const SOCKET_GID = process.env.SWB_UNIX_SOCKET_GID
const SOCKET_UID = process.env.SWB_UNIX_SOCKET_UID
const OPT_NOINFO = process.env.SWB_NO_INFO === "true";
const PAGES_PATH = process.env.SWB_PAGES;
const ADMIN_KEY = process.env.SWB_ADMIN_KEYPATH;

async function loadYellowPages() {
    let yellowpages = {};
    console.info("Loading the yellow pages...");
    const response = await axios.get(PAGES_PATH);
    if (response.status == 200) {
        yellowpages = response.data;
        console.info("Yellow pages loaded!");
    }
    else {
        console.error("PANIC: Failed to load the yellow pages. Please provide a pages.json in your web root!");
        process.exit(1);
    }

    return yellowpages;
}

async function writePassword(pass: string) {
    try {
        await _sodium.ready;
        const sodium = _sodium;
        const hashedpw = sodium.crypto_pwhash_str(pass, sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE, sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE);
        fs.writeFileSync(ADMIN_KEY, hashedpw);
    }
    catch (error) {
        console.error(error);
    }
}

async function main() {
    console.info("Switchboard init...");

    let pages = {};
    const app = express();

    app.use(helmet());
    app.set("views", path.join(__dirname, "views"));
    app.set("view engine", "ejs");

    app.use(express.static('public'));
    app.use(bodyParser.urlencoded({ extended: true }));

    app.use(async function (req, res, next) {
        if (!fs.existsSync(ADMIN_KEY)) {
            console.debug(req.path, req.method, req.body);
            if (req.path == "/setupdata") {
                if (req.method == "POST") {
                    await writePassword(req.body.pwa);
                    res.render("setupok");
                }
            }
            else if (req.query['t'] == "!setup") {
                res.render("setup");
            }
            else {
                res.render("noadmin");
            }
        }
        else {
            next();
        }
    });

    app.get("/", (req, res) => {
        res.render("index")
    });

    if (APPENV == "development") {
        app.get("/kill", (req, res) => {
            res.render("errorpage");
        });

        app.get("/reboot", (req, res) => {
            res.render("forbidden");
        });
    }

    app.get("/d", (req, res) => {
        if (req.query['t'] == "!info") {
            if (OPT_NOINFO) {
                res.render("forbidden");
                return;
            }
            let data = Object.keys((<any>pages))
            res.send(data);
        }
        else if (req.query['t'] == "!reload") {
            if (OPT_NOINFO) {
                res.render("forbidden");
                return;
            }
            let data = Object.keys((<any>pages))
            res.send(data);
        }
        else if (req.query['t'] in pages) {
            var link = (<any>pages)[req.query['t']]
            res.redirect(link);
        }
        else {
            res.render("notfound");
        }
    });

    app.use(function (req, res, next) {
        res.status(404).render("notfound")
    });

    app.use(function (err: any, req: any, res: any, next: any) {
        console.error(err.stack)
        res.status(500).render('errorpage')
    });

    if (OPT_NOINFO) {
        console.info("Info desk disabled");
    }

    console.info("Choosing serving method...");

    if (HTTP_PORT) {
        app.listen(HTTP_PORT, async () => {
            console.info('> Using HTTP');
            console.info(`> Switchboard bound to TCP Port:${HTTP_PORT}`);
            pages = await loadYellowPages();
        });
    }
    else if (UNIX_SOCKET) {
        if (fs.existsSync(UNIX_SOCKET)) {
            fs.unlinkSync(UNIX_SOCKET); // This must be our old socket so we better delete it
        }
        app.listen(UNIX_SOCKET, async () => {
            console.info('> Using unix sockets!');
            console.info(`> Switchboard listening at ${UNIX_SOCKET}`);
            if (SOCKET_GID && SOCKET_UID) {
                const uid = parseInt(SOCKET_UID, 10);
                const gid = parseInt(SOCKET_GID, 10);
                fs.chownSync(UNIX_SOCKET, uid, gid);
            }
            pages = await loadYellowPages();
        });
    } else {
        console.error("PANIC: No valid serving method found!");
    }
}

main();