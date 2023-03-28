/* eslint-disable no-case-declarations */
import React from 'react';
import Blocks from '~/components/Blocks';
import type { LoaderArgs, MetaFunction } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import PageHeader from '~/components/PageHeader';
import classes from './index.module.css';
import i18next from "~/i18next.server";

export const loader = async ({ request, params, context: { payload }}: LoaderArgs) => {
  const locale = await i18next.getLocale(request);
  const res = await payload.find({
    collection: 'pages',
    where: {
      slug: {
        equals: params.page,
      },
    },
    locale,
  });
  return {
    page: res.docs[0],
  }
}

export const meta: MetaFunction = ({ data }) => ({
  charset: "utf-8",
  title: data.page?.title,
  viewport: "width=device-width,initial-scale=1",
});

export const PageComponent: React.FC = () => {
  const { page } = useLoaderData<typeof loader>();

  return (
    <div className={classes.page}>
      <PageHeader />
      <main>
        <Blocks
          layout={page?.layout}
        />
      </main>
    </div>
  );
};

export default PageComponent;