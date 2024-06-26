import type { LoaderFunctionArgs } from "@remix-run/node";
import { Outlet, useLoaderData } from "@remix-run/react";
import Footer from "~/components/Footer";
import Header from "~/components/Header";
import i18next from "~/i18next.server";
import classes from "./main.module.css";

export const loader = async ({
  request,
  context: { payload },
}: LoaderFunctionArgs) => {
  const locale = await i18next.getLocale(request);

  const [site, navigations] = await Promise.all([
    payload.findGlobal({
      slug: "site",
      locale,
    }),
    payload.find({
      collection: "navigations",
      depth: 12,
      locale,
    }),
  ]);
  return {
    site,
    navigations: navigations.docs,
  };
};

export default function Layout() {
  const { site, navigations } = useLoaderData<typeof loader>();

  return (
    <>
      <div className={classes.aboveFooter}>
        <Header site={site} navigations={navigations} />

        <Outlet />
      </div>

      <Footer site={site} navigations={navigations} />
    </>
  );
}
