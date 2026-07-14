"use client";

import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";

export function PrintButton() {
  return (
    <Button type="button" onClick={() => window.print()} size="sm">
      <Printer aria-hidden="true" /> Print to PDF
    </Button>
  );
}
