import type {
  MetaFunction,
  SerializeFrom,
  LinksFunction,
  LoaderArgs,
  ActionFunction,
} from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
  useLoaderData,
  useRouteError,
} from "@remix-run/react";
import i18next from "~/i18next.server";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";
import { cssBundleHref } from "@remix-run/css-bundle";
import { i18nCookie } from "./cookie";
import type { DynamicLinksFunction } from "remix-utils";
import { ExternalScripts, DynamicLinks } from "remix-utils";
import type { Media } from "payload/generated-types";
import transport, { connectedEmailAddresses, from } from "email";
import { replaceMulti } from "./util/stringInterpolation";
import environment from "./util/environment";
import CookieConsent from "react-cookie-consent";
import { ModalContainer, ModalProvider } from "@faceless-ui/modal";
import classes from "./root.module.css";

export const links: LinksFunction = () => {
  return [
    // use css bundling
    ...(cssBundleHref ? [{ rel: "stylesheet", href: cssBundleHref }] : []),
  ];
};

export async function loader({ request, context: { payload } }: LoaderArgs) {
  let locale = await i18next.getLocale(request);
  const [site, localeCookie] = await Promise.all([
    payload.findGlobal({
      slug: "site",
      depth: 1,
      locale,
    }),
    i18nCookie.serialize(locale),
  ]);

  return json(
    {
      site,
      locale,
      publicKeys: {
        PAYLOAD_PUBLIC_SERVER_URL: environment().PAYLOAD_PUBLIC_SERVER_URL,
        HCAPTCHA_SITE_KEY: environment().HCAPTCHA_SITE_KEY,
      },
    },
    {
      headers: {
        "Set-Cookie": localeCookie,
      },
    }
  );
}

export const dynamicLinks: DynamicLinksFunction<
  SerializeFrom<typeof loader>
> = ({ data }) => {
  return [
    {
      rel: "icon",
      href: (data.site.favicon as Media)?.url as string,
      type: (data.site.logo as Media)?.mimeType,
    },
  ];
};

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  const additionalMetaTags: Record<string, string> = {};
  data.site.meta?.additionalMetaTags?.forEach((tag) => {
    additionalMetaTags[tag.key as string] = tag.value;
  });

  return {
    charset: "utf-8",
    viewport: "width=device-width,initial-scale=1",
    title: data.site.title,
    description: data.site.meta?.description,
    keywords: data.site.meta?.keywords,
    "og:title": data.site.meta?.ogTitle,
    "og:description": data.site.meta?.ogDescription,
    "og:image": (data.site.meta?.ogImage as Media)?.url,
    ...additionalMetaTags,
  };
};

export const handle = {
  i18n: "common", // i18n namespace
  dynamicLinks,
};

export function useChangeLanguage(locale: string) {
  const { i18n } = useTranslation();
  useEffect(() => {
    i18n.changeLanguage(locale);
  }, [locale, i18n]);
}

const validateCaptcha = async (token: string): Promise<boolean> => {
  if (environment().NODE_ENV === "development") {
    console.log("Captcha validation skipped in development mode");
    return true;
  }
  try {
    const res = await fetch("https://hcaptcha.com/siteverify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        secret: environment().HCAPTCHA_SECRET_KEY,
        sitekey: environment().HCAPTCHA_SITE_KEY,
        response: token,
      }),
    });
    const data = await res.json();
    return !!data.success;
  } catch (error) {
    return false;
  }
};

/**
 * form handler for modal forms (reservation)
 */
export const action: ActionFunction = async ({
  request,
  context: { payload },
}) => {
  const data = await request.formData();
  const t = await i18next.getFixedT(request);
  const locale = await i18next.getLocale(request);

  let res: {
    success?: boolean;
    message?: string;
    errors: {
      message: string;
      field?: string;
    }[];
  } = {
    errors: [],
  };

  switch (data.get("action")) {
    case "reservation":
      // validate captcha
      if (!(await validateCaptcha(data.get("h-captcha-response") as string))) {
        res.errors.push({
          message: t("please confirm the captcha"),
          field: "hCaptcha",
        });
      }

      // validate required fields
      const required = ["name", "email", "date", "time"];
      for (const field of required) {
        if (!data.get(field)) {
          res.errors.push({
            message: t("field is required"),
            field,
          });
        }
      }
      // validate email, date, time on client side only

      // send email
      if (!res.errors.length) {
        try {
          const site = await payload.findGlobal({
            slug: "site",
            depth: 1,
            locale,
          });
          await transport?.sendMail({
            from,
            to: data.get("email") as string,
            bcc: connectedEmailAddresses,
            subject: t("New Reservation Request") as string,
            text: replaceMulti(site.reservations.mailTemplate as string, {
              name: data.get("name") as string,
              date: data.get("date") as string,
              time: data.get("time") as string,
              partySize: data.get("partySize") as string,
              phone: data.get("phone") as string,
              email: data.get("email") as string,
              message: data.get("message") as string,
            }),
          });
          res.message = t(
            "Your request has been sent. We will contact you shortly."
          ) as string;
        } catch (err) {
          // TODO: log error
          res.errors.push({
            message: t(
              "Sorry, there was an error sending your request. Please try to contact us directly."
            ),
          });
        }
      } else {
        res.message = t(
          "Please correct the errors below and try again."
        ) as string;
      }

    default:
  }

  res.success = !res.errors.length;
  return res;
};

export function ErrorBoundary() {
  let error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return (
      <div>
        <h1>
          {error.status} {error.statusText}
        </h1>
        <p>{error.data}</p>
      </div>
    );
  }

  // display info about the error in development
  return environment().NODE_ENV === "development" ? (
    error instanceof Error ? (
      <div>
        <h1>Error</h1>
        <p>{error.message}</p>
        <p>The stack trace is:</p>
        <pre>{error.stack}</pre>
      </div>
    ) : (
      <pre>{"Unknown Error"}</pre>
    )
  ) : (
    <h1>Something went wrong</h1>
  );
}

export default function App() {
  // Get the locale from the loader
  let { locale, publicKeys } = useLoaderData<typeof loader>();
  let { t, i18n } = useTranslation();

  // handle locale change
  useChangeLanguage(locale);

  return (
    <html lang={locale} dir={i18n.dir()}>
      <head>
        <Meta />
        <Links />
        <DynamicLinks />
      </head>
      <body className={classes.body}>
        <ExternalScripts />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.ENV = ${JSON.stringify(publicKeys)}`,
          }}
        />
        <ModalProvider transTime={200} zIndex={200}>
          <Outlet />
          <ModalContainer />
        </ModalProvider>
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
        <div className={classes.cookiesWrapper}>
          <CookieConsent
            location="bottom"
            buttonText={t("Accept")}
            declineButtonText={t("Decline")}
            enableDeclineButton
            containerClasses={classes.cookies}
            buttonWrapperClasses={classes.cookieButtons}
            buttonClasses={classes.cookieButtonAccept}
            declineButtonClasses={classes.cookieButtonDecline}
            contentClasses={classes.cookieContent}
          >
            {t("CookieBannerText")}
          </CookieConsent>
        </div>
      </body>
    </html>
  );
}
