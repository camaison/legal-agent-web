import { DocumentDashboard } from "@/components/document-dashboard"

export default function Home() {
  return (
    <div className="container py-8">
      <h1 className="mb-8 font-darker-grotesque text-4xl font-extrabold tracking-wide text-slate-800 dark:text-white uppercase">
        Dashboard
      </h1>
      <DocumentDashboard />
    </div>
  )
}

