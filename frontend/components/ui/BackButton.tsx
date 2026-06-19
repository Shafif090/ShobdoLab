import Link from "next/link";
import { Icon } from "@/components/icons";

export function BackButton({ href }: { href: string }) {
  return (
    <Link href={href} className="icon-button">
      <Icon name="back" className="text-sm" />
    </Link>
  );
}
