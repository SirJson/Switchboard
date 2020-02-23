import dotenv from "dotenv";
import express from "express";
import path from "path";
import helmet from "helmet";
import fs from "fs";
import axios from "axios";
import bodyParser from "body-parser";

dotenv.config();
const APPENV = process.env.NODE_ENV;
const HTTP_PORT = process.env.SWB_HTTP_TCP;
const UNIX_SOCKET = process.env.SWB_UNIX_SOCKET;
const SOCKET_GID = process.env.SWB_UNIX_SOCKET_GID;
const SOCKET_UID = process.env.SWB_UNIX_SOCKET_UID;
const OPT_NOINFO = process.env.SWB_NO_INFO === "true";
const PAGES_PATH = process.env.SWB_PAGES;
const DEBUG_LOG = process.env.SWB_DEBUG_LOG === "true";

const log_debug = (function() {
    if (!DEBUG_LOG) {
        return function() {};
    }
    const context = "[DEBUG]";
    return Function.prototype.bind.call(console.debug, console, context);
})();

const log_info = (function() {
    const context = "[INFO]";
    return Function.prototype.bind.call(console.debug, console, context);
})();

const log_warn = (function() {
    const context = "[WARN]";
    return Function.prototype.bind.call(console.debug, console, context);
})();

const log_err = (function() {
    const context = "[ERROR]";
    return Function.prototype.bind.call(console.debug, console, context);
})();

async function loadYellowPages() {
    log_debug("Fetching yellow pages from", PAGES_PATH);
    let yellowpages = {};
    const response = await axios.get(PAGES_PATH);
    log_debug("Fetch completed. HTTP Code", response.status);
    if (response.status == 200) {
        log_debug(`Response contains "${JSON.stringify(response.data)}"`);
        yellowpages = response.data;
    } else {
        log_err(
            "PANIC: Failed to load the yellow pages. Please provide a pages.json in your web root!",
        );
        process.exit(1);
    }

    return yellowpages;
}

async function main() {
    log_info("Switchboard init...");

    let pages = {};
    const app = express();

    app.use(helmet());
    app.set("views", path.join(__dirname, "views"));

    app.use(express.static("public"));
    app.use(bodyParser.urlencoded({ extended: true }));

    app.get("/", (req, res) => {
        log_debug("Render index");
        res.render("index");
    });

    if (APPENV == "development") {
        app.get("/kill", (req, res) => {
            log_debug("Developer test: errorpage");
            res.render("errorpage");
        });

        app.get("/reboot", (req, res) => {
            log_debug("Developer test: forbidden");
            res.render("forbidden");
        });
    }

    app.get("/d", async (req, res) => {
        log_debug("Dail request with query", JSON.stringify(req.query));
        pages = await loadYellowPages();
        if (req.query["t"] == "!info") {
            if (OPT_NOINFO) {
                log_debug("Answer info query with forbidden");
                res.render("forbidden");
                return;
            }
            log_debug("Transform data to list");
            let data = Object.keys(<any>pages);
            log_debug("Respond with list");
            res.send(data);
        } else if (req.query["t"] in pages) {
            log_debug(`We think we have ${req.query["t"]} in our index`);
            var link = (<any>pages)[req.query["t"]];
            log_debug(`Redirect to ${req.query["t"]}`);
            res.redirect(link);
        } else {
            log_debug("Answer info query with notfound");
            res.render("notfound");
        }
    });

    app.use(function(req, res, next) {
        log_warn("Received invalid request. Sending 404", JSON.stringify(req));
        res.status(404).render("notfound");
    });

    app.use(function(err: any, req: any, res: any, next: any) {
        log_err("Fail", err.stack);
        res.status(500).render("errorpage");
    });

    if (OPT_NOINFO) {
        log_info("Info desk disabled");
    }

    log_info("Choosing serving method...");

    if (HTTP_PORT) {
        app.listen(HTTP_PORT, async () => {
            log_info("Using HTTP");
            log_info(`Switchboard bound to TCP Port:${HTTP_PORT}`);
            if (APPENV == "development") {
                log_info(
                    `Open http://localhost:${HTTP_PORT} in your browser to start developing!`,
                );
            }
        });
    } else if (UNIX_SOCKET) {
        if (fs.existsSync(UNIX_SOCKET)) {
            fs.unlinkSync(UNIX_SOCKET); // This must be our old socket so we better delete it
        }
        app.listen(UNIX_SOCKET, async () => {
            log_info("Using unix sockets!");

            if (SOCKET_GID && SOCKET_UID) {
                const uid = parseInt(SOCKET_UID, 10);
                const gid = parseInt(SOCKET_GID, 10);
                log_info(
                    `Change owner of socket to user ${uid} / group ${gid}`,
                );
                fs.chownSync(UNIX_SOCKET, uid, gid);
            }
            log_info(`Switchboard listening at ${UNIX_SOCKET}`);
        });
    } else {
        log_err("PANIC: No valid serving method found!");
    }
}

main();
