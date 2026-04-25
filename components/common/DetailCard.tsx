import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DetailCardProps {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function DetailCard({ title, action, children, className, noPadding = false }: DetailCardProps) {
  return (
    <Card className={className}>
      {(title || action) && (
        <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
          {title && <CardTitle className="text-base">{title}</CardTitle>}
          {action && <div className="shrink-0">{action}</div>}
        </CardHeader>
      )}
      <CardContent className={cn(noPadding ? "p-0" : "px-6 py-2")}>{children}</CardContent>
    </Card>
  );
}
