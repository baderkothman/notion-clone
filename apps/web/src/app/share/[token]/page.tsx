import { notFound } from "next/navigation";
import { EMPTY_TIPTAP_DOC } from "@notion-clone/editor";
import { getPageByPublicToken } from "@/server/sharing/public-view";
import { PublicPageView } from "@/components/page/public-page-view";

export default async function PublicSharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await getPageByPublicToken(token);
  if (!data) notFound();

  const { page, document } = data;

  if (page.type === "database") {
    // Public sharing of a full database view (with live filtering/sorting for an
    // anonymous visitor) is a larger surface than a single read-only document render —
    // intentionally out of scope for this pass. See tasks/todo.md.
    notFound();
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
