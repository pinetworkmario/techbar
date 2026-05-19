"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ProjectRequestModal } from "@/components/portal/ProjectRequestModal";

export function RequestProjectButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Request a New Project
      </Button>
      <ProjectRequestModal
        open={open}
        onClose={() => setOpen(false)}
        onSubmitted={() => router.refresh()}
      />
    </>
  );
}
