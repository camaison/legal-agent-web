"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, FileText, FileIcon as FileWord, Loader2 } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { DocumentViewer } from "@/components/document-viewer"
import { AnnotationDetail } from "@/components/annotation-detail"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/use-toast"
import { fetchDocumentAnalysis, DocumentAnalysis, convertClauseTypeToFrontendFormat } from "@/lib/api"

// Clause configuration with colors
const CLAUSES = {
  "force-majeure": { name: "Force Majeure", color: "#6366F1" }, // Indigo
  "limitation-of-liability": { name: "Limitation of Liability", color: "#0EA5E9" }, // Sky blue
  "assignment": { name: "Assignment", color: "#F97316" }, // Orange
  "severability": { name: "Severability", color: "#EC4899" }, // Pink
  "no-waiver": { name: "No Waiver", color: "#14B8A6" }, // Teal
}

export default function DocumentPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [document, setDocument] = useState<{
    id: string;
    name: string;
    content: string;
    content_type?: string;
    clauses: any[];
  } | null>(null);
  const [loading, setLoading] = useState(true)
  const [selectedAnnotation, setSelectedAnnotation] = useState<any | null>(null)
  const [userAnnotations, setUserAnnotations] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Fetch the document data
    const fetchDocument = async () => {
      try {
        setLoading(true)
        
        if (!params.id) {
          setError("Invalid document ID")
          setLoading(false)
          return
        }
        
        const documentId = Array.isArray(params.id) ? params.id[0] : params.id
        const analysisData = await fetchDocumentAnalysis(documentId)
        
        if (analysisData.status === 'processing') {
          toast({
            title: "Document is still processing",
            description: "Please check back later when the analysis is complete.",
          })
          router.push('/')
          return
        }
        
        if (analysisData.status === 'failed') {
          setError("Document analysis failed")
          setLoading(false)
          return
        }
        
        // Format clause results for the document viewer
        const documentClauses = Object.entries(analysisData.results || {}).flatMap(([type, results]) => {
          return results.map(result => ({
            type,
            selected_text: result.selected_text,
            reason: result.reason,
            confidence: result.confidence,
            position: result.position
          }))
        })
        
        setDocument({
          id: analysisData.document_id,
          name: `Document ${analysisData.document_id}`, // The name would be stored in a separate document DB entry
          content: analysisData.content || "No content available",
          content_type: analysisData.content_type,
          clauses: documentClauses
        })
        
        setLoading(false)
      } catch (error) {
        console.error("Error fetching document:", error)
        setError("Failed to load document analysis")
        setLoading(false)
      }
    }

    fetchDocument()
  }, [params.id, router, toast])

  const handleAnnotationClick = (annotation: any) => {
    setSelectedAnnotation(annotation)
  }

  const handleDownloadWord = () => {
    toast({
      title: "Word document download started",
      description: "Your document is being prepared for download as Word Document.",
    })
  }

  const handleDownloadPdf = () => {
    toast({
      title: "PDF download started",
      description: "Your document is being prepared for download as PDF.",
    })
  }

  const addUserAnnotation = (text: string, startPos: number, endPos: number) => {
    const newAnnotation = {
      type: "review-comments",
      selected_text: text,
      reason: "User annotation",
      confidence: 100,
      position: { start: startPos, end: endPos },
      user: true,
    }

    setUserAnnotations((prev) => [...prev, newAnnotation])
    toast({
      title: "Comment added",
      description: "Your review comment has been added to the document.",
    })
  }

  return (
    <div className="container py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            asChild
            className="h-9 w-9 rounded-full border-slate-200 bg-white text-slate-700 dark:border-slate-600 dark:bg-transparent dark:text-slate-100 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-700 dark:hover:text-white"
          >
            <Link href="/">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="font-nunito text-2xl font-bold text-slate-800 dark:text-white">
            {loading ? <Skeleton className="h-8 w-64" /> : document?.name}
          </h1>
        </div>

        {!loading && document && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadWord}
              className="flex items-center gap-1 bg-white text-slate-700 dark:bg-transparent dark:text-slate-100 dark:border-slate-600 dark:hover:bg-slate-700"
            >
              <FileWord className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              Word Document
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPdf}
              className="flex items-center gap-1 bg-white text-slate-700 dark:bg-transparent dark:text-slate-100 dark:border-slate-600 dark:hover:bg-slate-700"
            >
              <FileText className="h-4 w-4 text-red-600 dark:text-red-400" />
              PDF
            </Button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex h-96 items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
            <p className="text-slate-600 dark:text-slate-300">Loading document analysis...</p>
          </div>
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 p-6 text-center">
          <h2 className="mb-2 text-lg font-medium text-red-700 dark:text-red-400">Error Loading Document</h2>
          <p className="text-red-600 dark:text-red-300">{error}</p>
          <Button
            variant="outline"
            className="mt-4 border-red-300 dark:border-red-800 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-800 dark:hover:text-red-300"
            asChild
          >
            <Link href="/">Return to Dashboard</Link>
          </Button>
        </div>
      ) : document ? (
        <div className="space-y-8">
          <DocumentViewer
            document={document}
            clauses={CLAUSES}
            onAnnotationClick={handleAnnotationClick}
            userAnnotations={userAnnotations}
            onAddAnnotation={addUserAnnotation}
          />

          {selectedAnnotation && (
            <AnnotationDetail
              annotation={selectedAnnotation}
              clauseType={convertClauseTypeToFrontendFormat(selectedAnnotation.type)}
              clauses={CLAUSES}
              onClose={() => setSelectedAnnotation(null)}
              documentId={params.id as string}
            />
          )}
        </div>
      ) : null}
    </div>
  )
}

