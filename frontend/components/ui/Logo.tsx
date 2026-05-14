import Link from "next/link"

export default function Logo() {
  return (
    <Link href="/" className="flex items-center ">
        <span className="text-xl !font-[anton] tracking-tight">
            <span className="text-text-primary">HYPER</span>
            <span className="text-accent-red">TU</span>
            <span className="text-text-primary">BE</span>
        </span>
    </Link>
  );
}