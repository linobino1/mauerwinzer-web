import type { CollectionConfig } from "payload/types";
import { t } from "../i18n";
import { slugField } from "../fields/slug";
import { metaField } from "../fields/meta";
import { Content } from "../blocks/Content";
import { Image } from "../blocks/Image";
import { Gallery } from "../blocks/Gallery";
import { Instagram } from "../blocks/Instagram";
import { CallToAction } from "../blocks/CallToAction";
import { GoogleMaps } from "../blocks/GoogleMaps";

const Pages: CollectionConfig = {
  slug: "pages",
  labels: {
    singular: t("Page"),
    plural: t("Pages"),
  },
  admin: {
    group: t("Contents"),
    defaultColumns: ["title"],
    useAsTitle: "title",
  },
  fields: [
    {
      name: "title",
      label: t("Title"),
      type: "text",
      localized: true,
      required: true,
    },
    slugField("title"),
    {
      name: "image",
      label: t("Header Image"),
      type: "upload",
      relationTo: "media",
    },
    {
      name: "footerImage",
      label: t("Header Image Bottom"),
      type: "upload",
      relationTo: "media",
    },
    {
      name: "layout",
      label: t("Content"),
      type: "blocks",
      minRows: 1,
      blocks: [Content, Image, Gallery, Instagram, CallToAction, GoogleMaps],
    },
    metaField(t("Meta")),
  ],
};

export default Pages;
