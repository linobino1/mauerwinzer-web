import { useMatches } from "@remix-run/react";
import Image from "../Image";
import classes from "./index.module.css";
import type { Media } from "payload/generated-types";

export default function PageHeader() {
  const data = useMatches();
  const page = data.find((x) => x.id === "routes/__main/$page/index")?.data
    .page;

  return (
    <header className={classes.pageHeader}>
      {(page?.image as Media) && (
        <div className={classes.imageHeader}>
          <Image className={classes.headerImage} image={page.image as Media} />
        </div>
      )}
    </header>
  );
}
