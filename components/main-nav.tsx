import Link from "next/link"
import { FileText } from "lucide-react"

export function MainNav() {
  return (
    <div className="flex items-center gap-6 md:gap-10">
      <Link href="/" className="flex items-center gap-2">
        <FileText className="h-6 w-6" />
        <span className="hidden font-bold sm:inline-block">Legal Document Analyzer</span>
      </Link>
      <nav className="flex gap-6">
        <Link href="/" className="text-sm font-medium transition-colors hover:text-primary">
          Dashboard
        </Link>
      </nav>
    </div>
  )
}

