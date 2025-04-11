"use client"

import { useState, useRef, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Info, MessageSquare } from "lucide-react"
import { convertClauseTypeToFrontendFormat, convertClauseTypeToBackendFormat } from "@/lib/api"

interface DocumentViewerProps {
  document: {
    content: string
    content_type?: string
    clauses: Array<{
      type: string
      selected_text: string
      reason: string
      confidence: number
      position?: { start: number; end: number }
      user?: boolean
    }>
  }
  clauses: Record<string, { name: string; color: string }>
  onAnnotationClick: (annotation: any) => void
  userAnnotations?: Array<any>
  onAddAnnotation?: (text: string, startPos: number, endPos: number) => void
}

export function DocumentViewer({
  document,
  clauses,
  onAnnotationClick,
  userAnnotations = [],
  onAddAnnotation,
}: DocumentViewerProps) {
  const [activeFilters, setActiveFilters] = useState<string[]>(Object.keys(clauses))
  const [selection, setSelection] = useState<{ text: string; start: number; end: number } | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [isMounted, setIsMounted] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const toggleFilter = (clauseType: string) => {
    setActiveFilters((prev) =>
      prev.includes(clauseType) ? prev.filter((type) => type !== clauseType) : [...prev, clauseType],
    )
  }

  // Calculate total pages when document content changes
  useEffect(() => {
    if (document?.content_type === 'html' && isMounted) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(document.content, 'text/html');
      const pages = doc.querySelectorAll('.page');
      setTotalPages(pages.length);
      setCurrentPage(1); // Reset to first page when document changes
    }
  }, [document, isMounted]);

  // Only set up event listeners after component has mounted on client
  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isMounted) return

    const handleSelectionChange = () => {
      const selection = window.getSelection()
      if (!selection || selection.rangeCount === 0 || selection.toString().trim() === "") {
        setSelection(null)
        return
      }

      const range = selection.getRangeAt(0)
      const content = contentRef.current

      if (content && content.contains(range.commonAncestorContainer)) {
        const text = selection.toString()
        
        // Try to get position data from closest element with data attributes
        let start = 0
        let end = 0
        
        // Find closest element with position data
        let element: Node | null = range.commonAncestorContainer
        while (element && element.nodeType === Node.TEXT_NODE && element.parentNode) {
          element = element.parentNode
        }
        
        if (element && element instanceof HTMLElement) {
          const dataStart = element.getAttribute('data-start')
          if (dataStart) {
            start = parseInt(dataStart)
            
            // Calculate more accurate position using offsets
            const startOffset = range.startOffset;
            const endOffset = range.endOffset;
            
            // Get the text content up to the selection start
            const textBeforeSelection = element.textContent?.substring(0, startOffset) || '';
            
            // Calculate more precise start and end positions
            start = parseInt(dataStart) + textBeforeSelection.length;
            end = start + text.length;
          }
        }

        setSelection({
          text,
          start,
          end,
        })
      } else {
        setSelection(null)
      }
    }

    // Only add event listener on client-side
    window.addEventListener("selectionchange", handleSelectionChange)

    return () => {
      window.removeEventListener("selectionchange", handleSelectionChange)
    }
  }, [isMounted])

  const handleAddAnnotation = () => {
    if (selection && onAddAnnotation) {
      onAddAnnotation(selection.text, selection.start, selection.end)
      setSelection(null)

      // Clear the selection
      window.getSelection()?.removeAllRanges()
    }
  }

  // Process the document content to add highlighting
  const processContent = () => {
    // If we've already got HTML content, we'll modify it to add highlights
    if (document.content_type === 'html') {
      // Create a DOM parser to work with the HTML content
      const parser = new DOMParser()
      const doc = parser.parseFromString(document.content, 'text/html')

    // Get visible annotations based on filters
    const visibleAnnotations = [
        ...document.clauses.filter((clause) => activeFilters.includes(convertClauseTypeToFrontendFormat(clause.type))),
        ...(userAnnotations || []).filter((anno) => activeFilters.includes(convertClauseTypeToFrontendFormat(anno.type))),
      ].sort((a, b) => (a.position?.start || 0) - (b.position?.start || 0))
      
      // Enhanced logging to debug position data
      console.log("Annotations to highlight:", visibleAnnotations.length)
      
      // Function to highlight text in the DOM
    visibleAnnotations.forEach((annotation) => {
        if (!annotation.position) {
          console.log("Annotation missing position:", annotation.type, annotation.selected_text.substring(0, 50))
          return
        }
        
        const clauseInfo = clauses[convertClauseTypeToFrontendFormat(annotation.type)]
        if (!clauseInfo) return
        
        const start = annotation.position.start
        const end = annotation.position.end
        
        // Find all elements that might contain this text based on data-start/end attributes
        // Use a more specific selector that only targets text spans
        const elements = doc.querySelectorAll('span[data-start][data-end]')
        let foundMatch = false

        // Debug the elements found
        console.log(`Looking to highlight text at positions ${start}-${end} (${annotation.selected_text.substring(0, 50)}...)`)
        
        for (const element of elements) {
          const elStart = parseInt(element.getAttribute('data-start') || '0')
          const elEnd = parseInt(element.getAttribute('data-end') || '0')
          
          // Improved overlap detection algorithm
          // Check if this element contains the annotation text (fully or partially)
          if ((start >= elStart && start < elEnd) || (end > elStart && end <= elEnd) || (start <= elStart && end >= elEnd)) {
            // Case 1: Annotation is fully contained within this element
            if (start >= elStart && end <= elEnd) {
              const textContent = element.textContent || ''
              const relativeStart = start - elStart
              const relativeEnd = end - elStart
              
              if (relativeEnd <= relativeStart || relativeStart >= textContent.length) {
                console.log("Invalid relative positions:", relativeStart, relativeEnd, textContent.length)
                continue
              }
              
              const beforeText = textContent.substring(0, relativeStart)
              const highlightedText = textContent.substring(relativeStart, relativeEnd)
              const afterText = textContent.substring(relativeEnd)
              
              if (!highlightedText) {
                console.log("No text to highlight")
                continue
              }
              
              console.log("Found text to highlight:", highlightedText)
              
              // Create the highlighted span with corrected underlining
              const highlightSpan = doc.createElement('span')
              highlightSpan.className = `clause-highlight cursor-pointer transition-colors relative group ${annotation.user ? 'user-annotation' : ''}`
              highlightSpan.style.backgroundColor = `${clauseInfo.color}25` // Slightly reduced opacity
              highlightSpan.style.borderBottom = `2px solid ${clauseInfo.color}`
              highlightSpan.style.boxShadow = `0 1px 0 0 ${clauseInfo.color}30` // Reduced shadow slightly
              highlightSpan.setAttribute('data-clause-type', annotation.type)
              highlightSpan.setAttribute('data-annotation-id', `${annotation.type}-${annotation.position.start}`)
              highlightSpan.setAttribute('data-confidence', annotation.confidence.toString())
              highlightSpan.textContent = highlightedText
              
              // Create tooltip with improved styling
              const tooltip = doc.createElement('div')
              tooltip.className = 'absolute invisible opacity-0 group-hover:visible group-hover:opacity-100 z-50 transition-opacity duration-200 bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-xs rounded shadow-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 whitespace-nowrap'
              tooltip.innerHTML = `<div class="font-semibold">${clauseInfo.name}</div><div class="text-slate-500 dark:text-slate-400">${Math.round(annotation.confidence)}% confidence</div>`
              
              // Add arrow to tooltip
              const arrow = doc.createElement('div')
              arrow.className = 'absolute left-1/2 transform -translate-x-1/2 -bottom-1 w-2 h-2 rotate-45 bg-white dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700'
              tooltip.appendChild(arrow)
              
              highlightSpan.appendChild(tooltip)
              
              // Preserve the original element's attributes when creating the new element
              const newElement = element.cloneNode(false) as HTMLElement;
              
              if (beforeText) {
                const beforeTextNode = doc.createTextNode(beforeText)
                newElement.appendChild(beforeTextNode)
              }
              
              newElement.appendChild(highlightSpan)
              
              if (afterText) {
                const afterTextNode = doc.createTextNode(afterText)
                newElement.appendChild(afterTextNode)
              }
              
              // Replace the original element with our modified version
              element.parentNode?.replaceChild(newElement, element)
              foundMatch = true
            }
            // Case 2: Element contains part of the annotation (overlapping)
            else if (elStart <= start && elEnd <= end && elEnd > start) {
              // Handle the beginning part of the annotation
              const textContent = element.textContent || ''
              const relativeStart = Math.max(0, start - elStart)
              
              const beforeText = textContent.substring(0, relativeStart)
              const highlightedText = textContent.substring(relativeStart)
              
              if (highlightedText) {
                // Create highlighted span for partial text (beginning)
                const highlightSpan = doc.createElement('span')
                highlightSpan.className = `clause-highlight cursor-pointer transition-colors relative group ${annotation.user ? 'user-annotation' : ''}`
                highlightSpan.style.backgroundColor = `${clauseInfo.color}25`
                highlightSpan.style.borderBottom = `2px solid ${clauseInfo.color}`
                highlightSpan.style.boxShadow = `0 1px 0 0 ${clauseInfo.color}30`
                highlightSpan.setAttribute('data-clause-type', annotation.type)
                highlightSpan.setAttribute('data-annotation-id', `${annotation.type}-${annotation.position.start}`)
                highlightSpan.textContent = highlightedText
                
                // Rebuild the element
                const newElement = element.cloneNode(false) as HTMLElement;
                
                if (beforeText) {
                  newElement.appendChild(doc.createTextNode(beforeText))
                }
                
                newElement.appendChild(highlightSpan)
                element.parentNode?.replaceChild(newElement, element)
                foundMatch = true
              }
            }
            // Case 3: Element contains the end part of the annotation
            else if (elStart >= start && elStart < end && elEnd >= end) {
              // Handle the ending part of the annotation
              const textContent = element.textContent || ''
              const relativeEnd = end - elStart
              
              const highlightedText = textContent.substring(0, relativeEnd)
              const afterText = textContent.substring(relativeEnd)
              
              if (highlightedText) {
                // Create highlighted span for partial text (end)
                const highlightSpan = doc.createElement('span')
                highlightSpan.className = `clause-highlight cursor-pointer transition-colors relative group ${annotation.user ? 'user-annotation' : ''}`
                highlightSpan.style.backgroundColor = `${clauseInfo.color}25`
                highlightSpan.style.borderBottom = `2px solid ${clauseInfo.color}`
                highlightSpan.style.boxShadow = `0 1px 0 0 ${clauseInfo.color}30`
                highlightSpan.setAttribute('data-clause-type', annotation.type)
                highlightSpan.setAttribute('data-annotation-id', `${annotation.type}-${annotation.position.start}`)
                highlightSpan.textContent = highlightedText
                
                // Rebuild the element
                const newElement = element.cloneNode(false) as HTMLElement;
                newElement.appendChild(highlightSpan)
                
                if (afterText) {
                  newElement.appendChild(doc.createTextNode(afterText))
                }
                
                element.parentNode?.replaceChild(newElement, element)
                foundMatch = true
              }
            }
          }
        }
        
        if (!foundMatch) {
          console.log(`Could not find element containing text at positions ${start}-${end}`)
        }
      })
      
      // Modify the document to display only the current page
      const pages = doc.querySelectorAll('.page');
      pages.forEach((page, index) => {
        if (index + 1 !== currentPage) {
          (page as HTMLElement).style.display = 'none';
        } else {
          (page as HTMLElement).style.display = 'block';
        }
      });
      
      // Convert the modified DOM back to HTML string
      return doc.body.innerHTML
    }
    
    // Fallback to the original content if not HTML
    return document.content
  }
  
  // Navigate to previous page
  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };
  
  // Navigate to next page
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
      <div className="lg:col-span-3">
        <Card className="overflow-hidden border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/90 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center">
              <h3 className="font-medium text-slate-800 dark:text-white">Document Content</h3>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={goToPreviousPage} 
                  disabled={currentPage === 1}
                  className="bg-white dark:bg-transparent"
                >
                  Previous
                </Button>
                <span className="text-sm text-slate-600 dark:text-slate-300">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline" 
                  size="sm"
                  onClick={goToNextPage} 
                  disabled={currentPage === totalPages}
                  className="bg-white dark:bg-transparent"
                >
                  Next
                </Button>
              </div>
            )}
          </div>
            <div
            className="min-h-[800px] text-slate-800 dark:text-slate-200 document-container"
              ref={contentRef}
            style={{ position: "relative" }}
              onClick={(e) => {
                const target = e.target as HTMLElement
                if (target.classList.contains("clause-highlight")) {
                  const clauseType = target.getAttribute("data-clause-type")
                const annotation = [
                  ...document.clauses, 
                  ...(userAnnotations || [])
                ].find(
                    (clause) =>
                      clause.type === clauseType &&
                    `${clauseType}-${clause.position?.start}` === target.getAttribute("data-annotation-id"),
                  )
                  if (annotation) {
                    onAnnotationClick(annotation)
                  }
                }
              }}
            dangerouslySetInnerHTML={{ __html: processContent() }}
            />
        </Card>
      </div>
      <div className="lg:col-span-1">
        <div className="space-y-4">
          <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/90 p-4 shadow-sm">
            <h3 className="text-xl font-medium text-slate-800 dark:text-white mb-6">
              Clause Analysis
            </h3>

          <div className="mb-6">
              <div className="flex items-center gap-1 mb-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Filter Clauses</span>
                <Info className="h-4 w-4 text-slate-400" />
            </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(clauses).map(([key, value]) => {
                  const isActive = activeFilters.includes(key);
                  return (
                    <Button
                      key={key}
                  variant="outline"
                      size="sm"
                  className={cn(
                        "text-xs border rounded-full px-3 py-1",
                        isActive
                          ? "bg-white text-slate-900 dark:bg-slate-800/80 dark:text-slate-100 dark:border-slate-700"
                          : "bg-slate-100 text-slate-500 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-700"
                  )}
                  style={{
                        borderColor: isActive ? value.color : undefined,
                        color: isActive ? value.color : undefined,
                      }}
                      onClick={() => toggleFilter(key)}
                    >
                      {value.name}
                    </Button>
                  );
                })}
              </div>
          </div>

          <div>
              <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">Detected Clauses</h4>
              <div className="space-y-4">
                {document.clauses.length === 0 ? (
                  <p className="text-center text-sm text-slate-500 dark:text-slate-400">No clauses detected</p>
                ) : (
                  Object.entries(clauses)
                    .filter(([key, _]) => activeFilters.includes(key))
                    .map(([key, clauseInfo]) => {
                      const clausesByType = document.clauses.filter(
                        (clause) => convertClauseTypeToFrontendFormat(clause.type) === key
                      );
                      
                      return clausesByType.length > 0 ? (
                        clausesByType.map((clause, index) => (
                          <div 
                            key={`${key}-${index}`} 
                            className="p-4 rounded-md bg-slate-50 dark:bg-slate-800/30 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50"
                        onClick={() => onAnnotationClick(clause)}
                      >
                            <div className="flex items-center gap-2 mb-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: clauseInfo.color }} 
                              />
                              <span className="font-medium text-slate-800 dark:text-slate-50">
                                {clauseInfo.name}
                              </span>
                        </div>
                            <p className="text-sm text-slate-600 dark:text-slate-200 line-clamp-2 mb-2">
                              {clause.selected_text.length > 100 
                                ? `${clause.selected_text.substring(0, 100)}...` 
                                : clause.selected_text}
                            </p>
                            <div className="flex items-center">
                              <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full">
                                <div 
                                  className="h-full rounded-full" 
                              style={{
                                    width: `${clause.confidence}%`,
                                    backgroundColor: clauseInfo.color 
                              }}
                            />
                              </div>
                              <span className="ml-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                                {Math.round(clause.confidence)}%
                              </span>
                            </div>
                          </div>
                        ))
                      ) : null;
                    })
                )}
              </div>
          </div>
        </Card>
        </div>
      </div>
    </div>
  )
}

