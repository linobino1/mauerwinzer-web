import React from "react";
import type {
  Page,
  Media,
  Navigation as NavigationType,
} from "payload/generated-types";
import { Link } from "@remix-run/react";
import { Image } from "~/components/Image";
import classes from "./index.module.css";
import LanguageSwitch from "../LanguageSwitch";

type Props = {
  navigation?: NavigationType;
  className?: string;
};

export const Navigation: React.FC<Props> = ({ navigation, className }) => {
  // each item renders as either an internal link, an external link with an icon or text, or another navigation
  return navigation ? (
    <nav className={`${classes.nav} ${classes[navigation.type]} ${className}`}>
      {navigation?.items?.map(
        ({ id, icon, subnavigation, page, url, name, type, newTab }) => {
          if (type === "language") {
            return <LanguageSwitch key={id} className={classes.navItem} />;
          }

          const href = (page as Page) ? `/${(page as Page).slug}` : url;

          // const isActive = (
          // asPath === `/${(page as Page)?.slug}`
          // );
          const isActive = false;

          // image or plain text
          const inner: React.ReactNode = icon ? (
            <Image
              media={icon as Media}
              className={classes.image}
              sizes="2em"
              srcSet={[
                {
                  options: { width: 64 },
                  size: "64w",
                },
                {
                  options: { width: 32 },
                  size: "32w",
                },
              ]}
            />
          ) : (
            <span>{name}</span>
          );

          // subnavigation or link
          return (
            <div key={id} style={{ display: "contents" }}>
              {subnavigation ? (
                <Navigation navigation={subnavigation as NavigationType} />
              ) : (
                <Link
                  to={href as string}
                  className={`${classes.navItem} ${isActive && classes.active}`}
                  target={newTab ? "_blank" : undefined}
                >
                  {inner}
                </Link>
              )}
            </div>
          );
        }
      )}
    </nav>
  ) : (
    <></>
  );
};

export default Navigation;
