import dotenv from "dotenv";
import express from "express";
import path from "path";
import helmet from "helmet";
import https from "https";
import http from "http";
import fs from "fs";
import axios from 'axios';

dotenv.config();
const appenv = process.env.NODE_ENV;
const http_port = process.env.SWB_HTTP_TCP;
const https_port = process.env.SWB_HTTPS_TCP;
const https_cert = process.env.SWB_HTTPS_CERT;
const https_key = process.env.SWB_HTTPS_KEY;
const unix_socket = process.env.SWB_UNIX_SOCKET;
const socket_gid = process.env.SWB_UNIX_SOCKET_GID
const socket_uid = process.env.SWB_UNIX_SOCKET_UID
const opt_no_info = process.env.SWB_NO_INFO === "true";
const pages_src = process.env.SWB_PAGES;

async function loadYellowPages() {
    let yellowpages = {};
    console.info("Loading the yellow pages...");
    const response = await axios.get(pages_src);
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

async function main() {
    console.info("Switchboard init...");

    let pages = {};
    const app = express();

    app.use(helmet());

    app.set("views", path.join(__dirname, "views"));
    app.set("view engine", "ejs");

    app.get("/", (req, res) => {
        res.render("index")
    });

    if (appenv == "development") {
        app.get("/kill", (req, res) => {
            res.render("errorpage");
        });

        app.get("/reboot", (req, res) => {
            res.render("forbidden");
        });
    }

    app.get("/d", (req, res) => {
        if (req.query['t'] == "!info") {
            if (opt_no_info) {
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

    app.use(express.static('public'));

    app.use(function (req, res, next) {
        res.status(404).render("notfound")
    });

    app.use(function (err: any, req: any, res: any, next: any) {
        console.error(err.stack)
        res.status(500).render('errorpage')
    });

    if (opt_no_info) {
        console.info("Info desk disabled");
    }

    console.info("Choosing serving method...");

    if (http_port) {
        if (https_port) {
            const options = {
                key: fs.readFileSync(https_key),
                cert: fs.readFileSync(https_cert)
            }
            http.createServer(app).listen(http_port)
            https.createServer(options, app).listen(https_port)
            console.info('> Using HTTPS');
            console.info(`> Switchboard bound to TCP Port (HTTP): ${http_port}`);
            console.info(`> Switchboard bound to TCP Port (HTTPS): ${https_port}`);
            pages = await loadYellowPages();
        }
        else {
            app.listen(http_port, async () => {
                console.info('> Using HTTP');
                console.info(`> Switchboard bound to TCP Port:${http_port}`);
                pages = await loadYellowPages();
            });
        }
    }
    else if (unix_socket) {
        app.listen(unix_socket, async () => {
            console.info('> Using unix sockets!');
            console.info(`> Switchboard listening at ${unix_socket}`);
            if (socket_gid && socket_uid) {
                const uid = parseInt(socket_uid, 10);
                const gid = parseInt(socket_gid, 10);
                fs.chownSync(unix_socket, uid, gid);
            }
            pages = await loadYellowPages();
        });
    } else {
        console.error("PANIC: No valid serving method found!");
    }
}

main();