"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { formatPeriodo } from "@/lib/format";
import { cn } from "@/lib/utils";

const MESES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

export function MonthPicker({ mes }: { mes: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const [y, m] = mes.split("-").map(Number);
  const [pickerYear, setPickerYear] = useState(y);

  function navigate(year: number, month: number) {
    // Cambia solo el mes: el filtro de cliente (?cliente=) se conserva.
    const nuevos = new URLSearchParams(params.toString());
    nuevos.set("mes", `${year}-${String(month).padStart(2, "0")}`);
    router.push(`/cobranza?${nuevos.toString()}`);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="min-w-36 cursor-pointer rounded-md px-2 py-1 text-center text-sm font-semibold transition-colors hover:bg-muted">
        {formatPeriodo(mes)}
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3" side="bottom" align="center">
        {/* Selector de año */}
        <div className="mb-2 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setPickerYear((prev) => prev - 1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-sm font-semibold">{pickerYear}</span>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setPickerYear((prev) => prev + 1)}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        {/* Grilla de meses */}
        <div className="grid grid-cols-3 gap-1">
          {MESES.map((nombre, i) => {
            const mes_i = i + 1;
            const isSelected = pickerYear === y && mes_i === m;
            return (
              <button
                key={mes_i}
                onClick={() => navigate(pickerYear, mes_i)}
                className={cn(
                  "rounded-md px-1 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                  isSelected &&
                    "bg-primary text-primary-foreground hover:bg-primary/80 hover:text-primary-foreground"
                )}
              >
                {nombre}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
