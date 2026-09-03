"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@notion-clone/ui";
import { createPageAction } from "../../actions/pages";
import { useSidebarRefresh } from "@/components/sidebar-refresh-context";

export function NewPageButton({ workspaceId, workspaceSlug }: { workspaceId: string; workspaceSlug: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const notifySidebar = useSidebarRefresh();

  function onClick() {
    startTransition(async () => {
      const result = await createPageAction({ workspaceId });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      notifySidebar();
      router.push(`/w/${workspaceSlug}/p/${result.value.id}`);
    });
  }

  return (
    <Button variant="primary" onClick={onClick} disabled={pending}>
      <Plus className="size-3.5" /> Create your first page
    </Button>
  );
}
