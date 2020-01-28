import dotenv from "dotenv";
import express from "express";
import path from "path";
import yellowpages from './pages.json';
import helmet from "helmet";
import https from "https";
import http from "http";
import fs from "fs";

console.info("Switchboard init...");

dotenv.config();

const appenv = process.env.NODE_ENV;
const http_port = process.env.SWB_HTTP_TCP
const https_port = process.env.SWB_HTTPS_TCP
const https_cert = process.env.SWB_HTTPS_CERT
const https_key = process.env.SWB_HTTPS_KEY
const unix_socket = process.env.SWB_UNIX_SOCKET
const opt_no_info = process.env.SWB_NO_INFO === "true"

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

app.get("/help", (req, res) => {
    if (opt_no_info) {
        res.render("forbidden");
        return;
    }
    let data = Object.keys((<any>yellowpages))
    res.send(data);
});

app.get("/:bmark", (req, res) => {
    if (req.params['bmark'] in yellowpages) {
        var link = (<any>yellowpages)[req.params['bmark']]
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
    }
    else {
        app.listen(http_port, () => {
            console.info('> Using HTTP');
            console.info(`> Switchboard bound to TCP Port:${http_port}`);
        });
    }
}
else if (unix_socket) {
    app.listen(path, () => {
        console.info('> Using unix sockets!');
        console.info(`> Switchboard listening at ${path}`);
    });
} else {
    console.error("PANIC: No valid serving method found!");
}


