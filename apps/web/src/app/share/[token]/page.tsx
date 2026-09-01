import { notFound } from "next/navigation";
import { EMPTY_TIPTAP_DOC } from "@notion-clone/editor";
import { getPageByPublicToken } from "@/server/sharing/public-view";
import { getPublicDatabaseData } from "@/server/databases/public-view";
import { PublicPageView } from "@/components/page/public-page-view";
import { PublicDatabaseView } from "@/components/database/public-database-view";
import type { DatabaseProperty, DatabaseViewRecord } from "@/components/database/types";

export default async function PublicSharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await getPageByPublicToken(token);
  if (!data) notFound();

  const { page, document } = data;

  if (page.type === "database") {
    const { properties, views, rows, values } = await getPublicDatabaseData(page.id);
    return (
      <PublicDatabaseView
        title={page.title}
        icon={page.icon}
        properties={properties as DatabaseProperty[]}
        views={views as DatabaseViewRecord[]}
        rows={rows}
        values={values}
      />
    );
  }

  return (
    <PublicPageView
      title={page.title}
      icon={page.icon}
      coverImage={page.coverImage}
      content={document?.content ?? EMPTY_TIPTAP_DOC}
    />
  );
}
