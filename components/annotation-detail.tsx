"use client"

import { useState, useEffect } from "react"
import { AlertCircle, CheckCircle, Edit3, Check, X } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { addNoteToAnnotation, getNoteForAnnotation, updateNote } from "@/lib/api"

interface AnnotationDetailProps {
  annotation: {
    type: string
    selected_text: string
    reason: string
    position?: { start: number; end: number }
    confidence: number
    user?: boolean
    id?: string
  }
  clauseType: string
  clauses: Record<string, { name: string; color: string }>
  onClose: () => void
  documentId?: string
}

export function AnnotationDetail({ annotation, clauseType, clauses, onClose, documentId }: AnnotationDetailProps) {
  const { toast } = useToast()
  const [comment, setComment] = useState("")
  const [mode, setMode] = useState<"view" | "edit">("view")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [existingNoteId, setExistingNoteId] = useState<number | null>(null)
  
  // Create an annotation ID if not provided
  const annotationId = annotation.id || `${annotation.type}-${annotation.position?.start}`
  
  // Fetch any existing note when the component mounts
  useEffect(() => {
    const fetchNote = async () => {
      if (!documentId) return
      
      try {
        const note = await getNoteForAnnotation(documentId, annotationId)
        if (note) {
          setComment(note.text)
          setExistingNoteId(note.id)
        }
      } catch (error) {
        console.error("Error fetching note:", error)
      }
    }
    
    fetchNote()
  }, [documentId, annotationId])
  
  const saveComment = async () => {
    if (!documentId) {
      toast({
        title: "Error",
        description: "Document ID is required to save notes",
        variant: "destructive",
      })
      return
    }
    
    setIsSubmitting(true)
    
    try {
      if (existingNoteId) {
        await updateNote(documentId, existingNoteId, comment)
      } else {
        const noteId = await addNoteToAnnotation(documentId, annotationId, comment)
        setExistingNoteId(noteId)
      }
      
      setMode("view")
      toast({
        title: "Note saved",
        description: "Your note has been saved successfully",
      })
    } catch (error) {
      console.error("Error saving note:", error)
      toast({
        title: "Error",
        description: "Failed to save note. Please try again",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const clauseInfo = clauses[clauseType]
  
  const confidenceLevel =
    annotation.confidence >= 90
      ? "High"
      : annotation.confidence >= 70
        ? "Medium"
        : annotation.confidence >= 40
          ? "Low"
          : "Very Low"

  const confidenceIcon =
    annotation.confidence >= 90 ? (
      <CheckCircle className="h-5 w-5 text-green-500" />
    ) : annotation.confidence >= 70 ? (
      <CheckCircle className="h-5 w-5 text-amber-500" />
    ) : (
      <AlertCircle className="h-5 w-5 text-red-500" />
    )

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-nunito text-xl">
            <div className="h-4 w-4 rounded-sm" style={{ backgroundColor: clauseInfo.color }} />
            <span>
              {clauseInfo.name} {annotation.user ? "Comment" : "Clause"}
            </span>
            {annotation.user && (
              <Badge className="ml-2 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                User Annotation
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="rounded-md bg-slate-50 dark:bg-slate-800 p-4">
            <div className="mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">
              {annotation.user ? "Comment Text" : "Detected Text"}
            </div>
            <div
              className="custom-scrollbar max-h-40 overflow-y-auto text-sm text-slate-600 dark:text-slate-300"
              style={{
                borderLeft: `3px solid ${clauseInfo.color}`,
                paddingLeft: "12px",
              }}
            >
              {annotation.selected_text}
            </div>
          </div>

          {!annotation.user && (
            <div>
              <div className="mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">AI Reasoning</div>
              <div className="custom-scrollbar max-h-40 overflow-y-auto rounded-md bg-slate-50 dark:bg-slate-800 p-4 text-sm text-slate-600 dark:text-slate-300">
                {annotation.reason}
              </div>
            </div>
          )}

          {!annotation.user && (
            <div>
              <div className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Confidence Assessment</div>

              <div className="flex items-center gap-3 rounded-md bg-slate-50 dark:bg-slate-800 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white dark:bg-slate-700 shadow-sm">
                  {confidenceIcon}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-800 dark:text-slate-200">{confidenceLevel} Confidence</span>
                    <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/40">
                      {Math.round(annotation.confidence)}%
                    </Badge>
                  </div>

                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {annotation.confidence < 40
                      ? "Very low confidence detection. Manual review strongly recommended."
                      : annotation.confidence < 70
                        ? "Low confidence detection. Manual review recommended."
                        : annotation.confidence < 90
                          ? "Medium confidence detection. Consider reviewing."
                          : "High confidence detection."}
                  </div>
                </div>
              </div>

              <div className="mt-3">
                <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <div
                    className="h-full transition-all duration-500"
                    style={{
                      width: `${annotation.confidence}%`,
                      backgroundColor: clauseInfo.color,
                    }}
                  />
                </div>
              </div>
            </div>
          )}
          
          {/* Comment section */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Notes
              </div>
              {mode === "view" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMode("edit")}
                  className="h-7 gap-1 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  {existingNoteId ? "Edit" : "Add"}
                </Button>
              )}
            </div>
            
            {mode === "edit" ? (
              <>
                <Textarea 
                  placeholder="Add your notes here..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="min-h-[80px] text-sm resize-none bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                />
                <div className="flex justify-end space-x-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setMode("view")
                      // Reset to the saved comment if there was one
                      if (existingNoteId) {
                        getNoteForAnnotation(documentId || "", annotationId)
                          .then(note => {
                            if (note) setComment(note.text);
                          })
                          .catch(console.error);
                      } else {
                        setComment("")
                      }
                    }}
                    className="h-8"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="default" 
                    size="sm" 
                    onClick={saveComment} 
                    className="h-8"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Saving..." : "Save Note"}
                  </Button>
                </div>
              </>
            ) : (
              <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-md text-slate-700 dark:text-slate-300 text-sm min-h-[60px]">
                {comment ? (
                  comment
                ) : (
                  <span className="text-slate-400">No notes added yet</span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
          <Badge
            variant={annotation.user ? "default" : "outline"}
            className={cn(
              "px-2 py-1 bg-transparent",
              annotation.user
                ? "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
                : "border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-400"
            )}
          >
            {annotation.user ? "User Annotation" : "AI Detected"}
          </Badge>
          
          <Button 
            onClick={onClose} 
            className={`${annotation.user ? "ml-auto" : ""} bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700`}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

