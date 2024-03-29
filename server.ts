import path from "path";
import express from "express";
import compression from "compression";
import morgan from "morgan";
import type { Payload } from "payload";
import payload from "payload";
import { createRequestHandler } from "@remix-run/express";
import invariant from "tiny-invariant";
import { sender, transport } from "./email";
import type { Media, Menu } from "payload/generated-types";

require("dotenv").config();

const BUILD_DIR = path.join(process.cwd(), "build");

start();

async function start() {
  const app = express();

  invariant(process.env.PAYLOAD_SECRET, "PAYLOAD_SECRET is required");
  invariant(process.env.MONGODB_URI, "MONGODB_URI is required");

  // Initialize Payload
  await payload.init({
    secret: process.env.PAYLOAD_SECRET,
    mongoURL: process.env.MONGODB_URI,
    express: app,
    email: {
      fromName: sender.name,
      fromAddress: sender.address,
      transport,
    },
    onInit: () => {
      payload.logger.info(`Payload Admin URL: ${payload.getAdminURL()}`);
    },
  });

  app.use(compression());

  // http://expressjs.com/en/advanced/best-practice-security.html#at-a-minimum-disable-x-powered-by-header
  app.disable("x-powered-by");

  // Remix fingerprints its assets so we can cache forever.
  app.use(
    "/build",
    express.static("public/build", { immutable: true, maxAge: "1y" })
  );

  // Everything else (like favicon.ico) is cached for an hour. You may want to be
  // more aggressive with this caching.
  app.use(express.static("public", { maxAge: "1h" }));

  app.use(morgan("tiny"));

  // robots.txt
  app.get("/robots.txt", function (req, res) {
    res.type("text/plain");
    res.send("User-agent: *\nDisallow:");
  });

  // custom menu route
  app.get("/menu-(inhouse|takeaway|food)", async (req, res) => {
    // @ts-expect-error
    const payload: Payload = req.payload;
    const menu = await payload.findGlobal({
      slug: "menu",
    });

    switch (req.path) {
      case "/menu-takeaway":
        return res.redirect(
          ((menu as Menu)?.menuTakeAway as Media).url as string
        );
      case "/menu-inhouse":
        return res.redirect(
          ((menu as Menu)?.menuInHouse as Media).url as string
        );
      case "/menu-food":
        return res.redirect(((menu as Menu)?.menuFood as Media).url as string);
      default:
        return res.status(400).send("Bad request");
    }
  });

  app.all(
    "*",
    process.env.NODE_ENV === "development"
      ? (req, res, next) => {
          purgeRequireCache();

          return createRequestHandler({
            build: require(BUILD_DIR),
            mode: process.env.NODE_ENV,
            getLoadContext(req, res) {
              return {
                // @ts-expect-error
                payload: req.payload,
                res,
              };
            },
          })(req, res, next);
        }
      : createRequestHandler({
          build: require(BUILD_DIR),
          mode: process.env.NODE_ENV,
          getLoadContext(req, res) {
            return {
              // @ts-expect-error
              payload: req.payload,
              res,
            };
          },
        })
  );
  const port = process.env.PORT || 3000;

  app.listen(port, () => {
    console.log(`Express server listening on port ${port}`);
  });
}

function purgeRequireCache() {
  // purge require cache on requests for "server side HMR" this won't let
  // you have in-memory objects between requests in development,
  // alternatively you can set up nodemon/pm2-dev to restart the server on
  // file changes, but then you'll have to reconnect to databases/etc on each
  // change. We prefer the DX of this, so we've included it for you by default
  for (const key in require.cache) {
    if (key.startsWith(BUILD_DIR)) {
      delete require.cache[key];
    }
  }
}
