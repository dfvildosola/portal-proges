"use client";

import { useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PropertyStatus } from "@/generated/prisma/enums";
import { propertyStatusLabels, propertyStatusVariant } from "@/lib/domain";
import { updatePropertyStatus } from "../actions";

const triggerClass: Record<ReturnType<typeof propertyStatusVariant>, string> = {
  default:
    "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
  secondary:
    "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
  outline: "text-foreground hover:bg-accent",
};

export function StatusQuickEdit({
  propertyId,
  current,
}: {
  propertyId: string;
  current: PropertyStatus;
}) {
  const [isPending, startTransition] = useTransition();
  const variant = propertyStatusVariant(current);

  function handleChange(value: string | null) {
    if (!value) return;
    const formData = new FormData();
    formData.set("id", propertyId);
    formData.set("estado", value);
    startTransition(() => updatePropertyStatus(formData));
  }

  return (
    <Select value={current} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger
        className={`h-6 w-auto gap-1 rounded-full border px-2.5 py-0 text-xs font-semibold shadow-none focus:ring-0 ${triggerClass[variant]} ${isPending ? "opacity-60" : ""}`}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.values(PropertyStatus).map((s) => (
          <SelectItem key={s} value={s} className="text-sm">
            {propertyStatusLabels[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
