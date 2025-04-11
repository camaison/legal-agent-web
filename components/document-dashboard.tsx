"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Trash2,
  FileText,
  FileIcon as FilePdf,
  FileIcon as FileWord,
  MoreHorizontal,
  Info,
  Loader2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { FileUploader } from "@/components/file-uploader"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { uploadDocument, fetchDocuments, deleteDocument, convertClauseTypeToFrontendFormat } from "@/lib/api"
import { Badge } from "@/components/ui/badge"

// Clause configuration with colors
const CLAUSES: Record<string, { name: string; color: string }> = {
  "force-majeure": { name: "Force Majeure", color: "#6366F1" }, // Indigo
  "limitation-of-liability": { name: "Limitation of Liability", color: "#0EA5E9" }, // Sky blue
  "assignment": { name: "Assignment", color: "#F97316" }, // Orange
  "severability": { name: "Severability", color: "#EC4899" }, // Pink
  "no-waiver": { name: "No Waiver", color: "#14B8A6" }, // Teal
}

export function DocumentDashboard() {
  const router = useRouter()
  const { toast } = useToast()
  const [documents, setDocuments] = useState<any[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDocs, setSelectedDocs] = useState<string[]>([])
  const [selectAll, setSelectAll] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch documents on component mount
  useEffect(() => {
    const getDocuments = async () => {
      try {
        setIsLoading(true)
        const docs = await fetchDocuments()
        setDocuments(docs)
        setError(null)
      } catch (err) {
        console.error("Failed to fetch documents:", err)
        setError("Failed to load documents. Please try again later.")
      } finally {
        setIsLoading(false)
      }
    }

    getDocuments()
  }, [])

  const handleFileUpload = async (files: File[]) => {
    setIsUploading(true)

    try {
      // Upload each file sequentially
      for (const file of files) {
        const newDoc = await uploadDocument(file)
        
        // Add the new document to the list
        setDocuments((prev) => [newDoc, ...prev])
        
        toast({
          title: "Document uploaded",
          description: `${file.name} uploaded successfully and is being processed.`,
        })
      }
    } catch (error) {
      console.error("Upload error:", error)
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload document",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleRowClick = (docId: string) => {
    const doc = documents.find((d) => d.id === docId)

    if (doc?.status === "completed") {
      router.push(`/documents/${docId}`)
    } else if (doc?.status === "processing") {
      toast({
        title: "Document still processing",
        description: "Please wait until the analysis is complete.",
        variant: "default",
      })
    } else if (doc?.status === "failed") {
      toast({
        title: "Analysis failed",
        description: "This document could not be analyzed. Please try uploading it again.",
        variant: "destructive",
      })
    }
  }

  const toggleSelectDoc = (docId: string) => {
    setSelectedDocs((prev) => (prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]))
  }

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedDocs([])
    } else {
      setSelectedDocs(documents.map((doc) => doc.id))
    }
    setSelectAll(!selectAll)
  }

  const handleDeleteSelected = async () => {
    if (selectedDocs.length === 0) return

    try {
      for (const docId of selectedDocs) {
        await deleteDocument(docId)
      }

      setDocuments((prev) => prev.filter((doc) => !selectedDocs.includes(doc.id)))
      setSelectedDocs([])
      setSelectAll(false)

      toast({
        title: "Documents deleted",
        description: `${selectedDocs.length} document${selectedDocs.length > 1 ? "s" : ""} deleted.`,
      })
    } catch (error) {
      console.error("Delete error:", error)
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Failed to delete documents",
        variant: "destructive",
      })
    }
  }

  const handleDeleteDocument = async (docId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    
    try {
      await deleteDocument(docId)
      
      setDocuments((prev) => prev.filter((doc) => doc.id !== docId))
      setSelectedDocs((prev) => prev.filter((id) => id !== docId))

      toast({
        title: "Document deleted",
        description: "The document has been removed.",
      })
    } catch (error) {
      console.error("Delete error:", error)
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Failed to delete document",
        variant: "destructive",
      })
    }
  }

  // Helper function to format the date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', { 
        year: 'numeric',
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return dateString
    }
  }

  // Helper function to get the file icon
  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase()
    
    if (extension === 'pdf') {
      return <FilePdf className="h-5 w-5 text-red-600" />
    } else if (['doc', 'docx'].includes(extension || '')) {
      return <FileWord className="h-5 w-5 text-blue-600" />
    } else {
      return <FileText className="h-5 w-5 text-slate-600" />
    }
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <FileUploader
            onFilesSelected={handleFileUpload}
            isUploading={isUploading}
            acceptedFileTypes={[".pdf", ".docx"]}
          />
        </div>
        <div className="rounded-lg border bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center gap-2 mb-3">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h3 className="font-nunito font-semibold text-slate-800 dark:text-white">Quick Guide</h3>
          </div>
          <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400">•</span>
              <span>Upload legal documents for AI analysis</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400">•</span>
              <span>View detected legal clauses and their analysis</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400">•</span>
              <span>Click on any completed document to view detailed analysis</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400">•</span>
              <span>Use checkboxes to select multiple documents for deletion</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="rounded-lg border bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center justify-between p-4">
          <h2 className="font-nunito text-lg font-medium text-slate-800 dark:text-white">Documents</h2>

          {selectedDocs.length > 0 && (
            <Button variant="destructive" size="sm" onClick={handleDeleteSelected} className="flex items-center gap-1">
              <Trash2 className="h-4 w-4" />
              Delete {selectedDocs.length} selected
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-slate-600">Loading documents...</p>
            </div>
          </div>
        ) : error ? (
          <div className="p-6 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
            <p className="mt-2 text-slate-700">{error}</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 pl-4">
                    <Checkbox checked={selectAll} onCheckedChange={toggleSelectAll} aria-label="Select all documents" />
                  </TableHead>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Document Name</TableHead>
                  <TableHead>Upload Date</TableHead>
                  <TableHead>Clauses</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <FileText className="h-8 w-8 text-slate-300" />
                        <p className="text-sm text-slate-500">No documents found</p>
                        <p className="text-xs text-slate-400">Upload a document to get started</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  documents.map((doc) => (
                    <TableRow
                      key={doc.id}
                      className={cn(
                        "cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60",
                        doc.status === "failed" && "bg-red-50/50 hover:bg-red-50 dark:bg-red-900/10 dark:hover:bg-red-900/20",
                      )}
                      onClick={() => handleRowClick(doc.id)}
                    >
                      <TableCell className="pl-4" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedDocs.includes(doc.id)}
                          onCheckedChange={() => toggleSelectDoc(doc.id)}
                          aria-label={`Select ${doc.name}`}
                        />
                      </TableCell>
                      <TableCell>{getFileIcon(doc.name)}</TableCell>
                      <TableCell className="font-medium text-slate-900 dark:text-slate-100">{doc.name}</TableCell>
                      <TableCell className="text-sm text-slate-500 dark:text-slate-400">{formatDate(doc.upload_date)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {doc.clauses && doc.clauses.length > 0 ? (
                            doc.clauses.map((clause: string) => {
                              const clauseType = convertClauseTypeToFrontendFormat(clause)
                              const clauseInfo = CLAUSES[clauseType]
                              return clauseInfo ? (
                                <Badge
                                  key={clauseType}
                                  variant="outline"
                                  style={{
                                    borderColor: clauseInfo.color,
                                    color: clauseInfo.color,
                                    backgroundColor: `${clauseInfo.color}10`,
                                  }}
                                  className="border text-xs"
                                >
                                  {clauseInfo.name}
                                </Badge>
                              ) : null
                            })
                          ) : (
                            <span className="text-xs text-slate-400 dark:text-slate-500">No clauses detected</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {doc.status === "processing" ? (
                            <>
                              <Clock className="h-4 w-4 animate-pulse text-amber-500" />
                              <span className="text-amber-600 dark:text-amber-500">Processing</span>
                            </>
                          ) : doc.status === "completed" ? (
                            <>
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <span className="text-green-700 dark:text-green-500">Completed</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="h-4 w-4 text-red-500" />
                              <span className="text-red-700 dark:text-red-400">Failed</span>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
                              onClick={(e) => handleDeleteDocument(doc.id, e)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === "completed") {
    return (
      <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20 dark:bg-green-900/30 dark:text-green-400 dark:ring-green-500/30">
        <CheckCircle className="mr-1 h-3 w-3" />
        Completed
      </span>
    )
  }

  if (status === "processing") {
    return (
      <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20 dark:bg-blue-900/30 dark:text-blue-400 dark:ring-blue-500/30">
        <Clock className="mr-1 h-3 w-3 animate-pulse" />
        Processing
      </span>
    )
  }

  return (
    <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20 dark:bg-red-900/30 dark:text-red-400 dark:ring-red-500/30">
      <AlertCircle className="mr-1 h-3 w-3" />
      Failed
    </span>
  )
}

