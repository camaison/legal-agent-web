import Link from "next/link"
import { Scale } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full bg-blue-800 dark:bg-blue-950 text-white shadow-md">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Scale className="h-7 w-7 text-white" />
          <span className="font-nunito text-xl font-bold">Legal Foundry</span>
        </Link>
        
        <div className="flex items-center gap-4">
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}

