"use client"

import type React from "react"

import { useState, useRef } from "react"
import { FileUp, File, X, Loader2, FileIcon as FilePdf, FileIcon as FileWord } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface FileUploaderProps {
  onFilesSelected: (files: File[]) => void
  isUploading: boolean
  acceptedFileTypes: string[]
}

export function FileUploader({ onFilesSelected, isUploading, acceptedFileTypes }: FileUploaderProps) {
  const [dragActive, setDragActive] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const validateFiles = (files: File[]) => {
    return files.filter((file) => {
      const extension = `.${file.name.split(".").pop()?.toLowerCase()}`
      return acceptedFileTypes.includes(extension)
    })
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const validFiles = validateFiles(Array.from(e.dataTransfer.files))
      setSelectedFiles(validFiles)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()

    if (e.target.files && e.target.files.length > 0) {
      const validFiles = validateFiles(Array.from(e.target.files))
      setSelectedFiles(validFiles)
    }
  }

  const handleUpload = () => {
    if (selectedFiles.length > 0) {
      onFilesSelected(selectedFiles)
      setSelectedFiles([])
    }
  }

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const openFileSelector = () => {
    inputRef.current?.click()
  }

  const getFileIcon = (fileName: string) => {
    if (fileName.endsWith(".pdf")) {
      return <FilePdf className="h-5 w-5 text-red-500" />
    } else if (fileName.endsWith(".docx") || fileName.endsWith(".doc")) {
      return <FileWord className="h-5 w-5 text-blue-500" />
    }
    return <File className="h-5 w-5 text-slate-400" />
  }

  return (
    <div className="rounded-lg border bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div
        className={cn(
          "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 transition-colors",
          dragActive
            ? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20"
            : "border-slate-300 dark:border-slate-600",
          isUploading && "pointer-events-none opacity-50",
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={acceptedFileTypes.join(",")}
          onChange={handleChange}
          className="hidden"
        />

        <div className="mb-3 flex items-center justify-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
            <FileUp className="h-6 w-6 text-blue-700 dark:text-blue-400" />
          </div>
          <div className="flex flex-row items-center justify-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
              <FilePdf className="h-5 w-5 text-red-500 dark:text-red-400" />
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <FileWord className="h-5 w-5 text-blue-500 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <h3 className="mb-1 font-poppins text-base font-medium text-slate-800 dark:text-white">
          Upload Documents for Analysis
        </h3>

        <p className="mb-3 text-center text-sm text-slate-500 dark:text-slate-400">
          Drag and drop your legal documents here, or click to browse
          <br />
          <span className="text-xs">Supported formats: {acceptedFileTypes.join(", ")}</span>
        </p>

        <Button
          type="button"
          onClick={openFileSelector}
          disabled={isUploading}
          className="bg-blue-700 hover:bg-blue-800 dark:bg-blue-700 dark:hover:bg-blue-800"
        >
          Select Files
        </Button>
      </div>

      {selectedFiles.length > 0 && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-slate-800 dark:text-white">Selected Files</h4>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {selectedFiles.length} file{selectedFiles.length > 1 ? "s" : ""} selected
            </span>
          </div>

          <ul className="max-h-40 space-y-2 overflow-y-auto rounded-md border border-slate-200 p-2 dark:border-slate-700">
            {selectedFiles.map((file, index) => (
              <li
                key={`${file.name}-${index}`}
                className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800/50"
              >
                <div className="flex items-center gap-2">
                  {getFileIcon(file.name)}
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{file.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFile(index)}
                  className="h-7 w-7 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
                >
                  <X className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>

          <div className="flex justify-end">
            <Button
              onClick={handleUpload}
              disabled={isUploading}
              className="bg-blue-700 hover:bg-blue-800 dark:bg-blue-700 dark:hover:bg-blue-800"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  Upload {selectedFiles.length} file{selectedFiles.length > 1 ? "s" : ""}
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

