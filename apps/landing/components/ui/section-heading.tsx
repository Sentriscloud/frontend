import { cn } from "@/lib/utils";
import { Eyebrow } from "./eyebrow";

type Props = {
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
  align?: "left" | "center";
};

export function SectionHeading({ eyebrow, title, description, className, align = "left" }: Props) {
  return (
    <div
      className={cn(
        "max-w-3xl",
        align === "center" && "mx-auto text-center",
        className,
      )}
    >
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <h2 className="display mt-5 text-4xl text-(--color-ink) md:text-5xl lg:text-6xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-6 text-base leading-relaxed text-(--color-ink-3) md:text-lg">
          {description}
        </p>
      ) : null}
    </div>
  );
}
