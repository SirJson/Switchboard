# Switchboard

A static online bookmark redirect server thing. This application will be your digital switchboard operator.

## What you can do with it

It kinda works like a url shortener, but you configure the urls in advance and have to enter the magic keyword at a special api endpoint '/d' (for dail) where `t=<target>`

A query for your digital operator to connect you to your favorite pizza delivery could look like this:

```http
https://example.org/d?t=pizza
```

Or if you want to you can ask the system for all magic keywords with the `!info` query. This query will return a raw json array so you could build your own tools on top of it. If you are not okay with disclosing your pages.json you can disable the `!info` query with `SWB_NO_INFO=true` in your .env

## Configuration

### Server configuration

The internal server can be setup with a dotenv file.
A simple TCP http server would look like this:

```sh
NODE_ENV=production
SWB_HTTP_TCP=8080
SWB_HTTPS_TCP=
SWB_HTTPS_CERT=
SWB_HTTPS_KEY=
SWB_UNIX_SOCKET=
SWB_UNIX_SOCKET_GID=
SWB_UNIX_SOCKET_UID=
SWB_NO_INFO=
SWB_PAGES=http://localhost:8080/pages.json
```

Every empty key is ignored. You can also serve this over unix sockets. 

If `SWB_UNIX_SOCKET_GID` and `SWB_UNIX_SOCKET_UID` the node process will try to change the owner of of the socket. This can help in reverse proxy setups. *Please don't just chmod 777 the socket*

To disable the `!info` query add the following to your .env

```sh
SWB_NO_INFO=true
```

If set a value for every dotenv key it will choose the server settings in the following order: `HTTPS > HTTP > UNIX_SOCKET`

If there is no dotenv file or is not complete the server will exit.

### Bookmark configuration

You need a in your page root folder pages.json that looks like this:

```json
{
    "search": "https://www.google.com",
    "buy": "https://www.amazon.com",
    "memes": "https://reddit.com/r/dankmemes"
}
```

You can put in any URL you want. You also probably want to secure this file

## Starting the server

If you downloaded the latest release or build it your self and did the configuration part just need to run nodejs in your page root folder. There are no command arguments.

```sh
node .
```

For a more complete experience you could write a systemd service file that does that for you.

I would advise you to use a reverse proxy like nginx if you want to serve this to the public

## What is basically untested but included

Pretty much all https stuff  and running the http server without any reverse proxy directly online.

The setup I recommend is using the unix socket approach.

## Why did you create it

There are url shorteners out there and there is probably a option in your favorite webserver to do something like this. I wanted to have a simple json file to maintain my online bookmarks list so I don't have to search my own stuff on the web all the time

Enjoy :)