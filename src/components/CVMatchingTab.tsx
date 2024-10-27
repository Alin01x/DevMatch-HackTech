"use client";

import React, { useState, useCallback } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { FileText, Search, Upload, Loader2, X } from "lucide-react";
import mammoth from "mammoth";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import "@mdxeditor/editor/style.css";
import { Skeleton } from "./ui/skeleton";
import dynamic from "next/dynamic";
import { MatchingJob } from "@/types/MatchResult";
import {
  diffSourcePlugin,
  frontmatterPlugin,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
} from "@mdxeditor/editor";
import { DialogClose, DialogTitle } from "@radix-ui/react-dialog";
import NoResultsDialog from "./NoResultsDialog";

// Dynamically import MDXEditor with SSR disabled
const MDXEditor = dynamic(
  () => import("@mdxeditor/editor").then((mod) => mod.MDXEditor),
  {
    ssr: false,
    loading: () => (
      <div className="h-[420px] space-y-2 p-4">
        <Skeleton className="h-[400px] w-full animate-pulse" />
      </div>
    ),
  }
);

const CVMatchingTab = () => {
  const [cvContent, setCvContent] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [matchingJob, setMatchingJob] = useState<MatchingJob | null>(null);
  const [isResultsOpen, setIsResultsOpen] = useState(false);
  const [showNoResults, setShowNoResults] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file && file.name.endsWith(".docx")) {
      setFileName(file.name);
      const arrayBuffer = await file.arrayBuffer();
      try {
        const result = await mammoth.extractRawText({ arrayBuffer });
        const text = result.value;
        setCvContent(text);
      } catch (error) {
        toast({
          title: "Error",
          description:
            "Error extracting text from docx. Please try with a different document.",
          variant: "destructive",
        });
        console.error("Error extracting text from docx:", error);
      }
    } else {
      toast({
        title: "Error",
        description: "Unsupported file format. Please upload a .docx file.",
        variant: "destructive",
      });
      console.error("Unsupported file format. Please upload a .docx file.");
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
    },
    multiple: false,
  });

  const handleFindMatchingJob = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/cv-matching", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fullContent: cvContent }),
      });
      const data = await response.json();

      if (data.data?.length > 0) {
        setMatchingJob(data);
        setIsResultsOpen(true);
      } else {
        setShowNoResults(true);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while finding a matching job.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          CV Matching
        </CardTitle>
        <CardDescription>
          Upload a CV to find the best matching job requirement
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Upload Section */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center dark:bg-gray-800 cursor-pointer
              ${isDragActive ? "border-primary" : "border-gray-300"}`}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            {fileName ? (
              <div>
                <p className="text-sm text-gray-600">File added: </p>
                <p className="text font-medium text-gray-600">{fileName}</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-600">
                  {isDragActive
                    ? "Drop the file here"
                    : "Drag and drop your CV here, or click to select"}
                </p>
                <p className="mt-2 text-xs text-gray-500">
                  Supported format: .docx (Microsoft Word)
                </p>
              </>
            )}
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleFindMatchingJob}
              disabled={!cvContent || loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Finding matching job...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Find Matching Job
                </>
              )}
            </Button>
          </div>

          {/* Custom Modal for Matching Job */}
          <Dialog open={isResultsOpen} onOpenChange={setIsResultsOpen}>
            <DialogContent className="max-w-4xl p-0">
              <ScrollArea className="h-[calc(100vh-200px)] rounded-lg">
                <DialogHeader className="w-full fixed p-6 bg-white opac shadow-md rounded-lg z-20">
                  <DialogTitle className="w-full flex items-center justify-between text-2xl font-bold gap-2">
                    <div>Best Matching Job</div>
                    <DialogClose asChild>
                      <div className="rounded-full p-2 hover:bg-gray-100 transition-all duration-200 ease-in-out transform hover:scale-110">
                        <X className="h-4 w-4 cursor-pointer" />
                      </div>
                    </DialogClose>
                  </DialogTitle>
                </DialogHeader>
                {matchingJob && (
                  <div className="space-y-6 p-6 mt-20">
                    <div>
                      <h3 className="text-xl font-semibold mb-2">
                        {matchingJob.jobDescription.job_title}
                      </h3>
                      <p className="text-gray-600">
                        {matchingJob.jobDescription.industry}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Required Skills:</h4>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(matchingJob.jobDescription.skills).map(
                          ([skill, weight]) => (
                            <Badge key={skill} variant="secondary">
                              {skill} ({weight}%)
                            </Badge>
                          )
                        )}
                      </div>
                    </div>
                    <div className="-z-10">
                      <h4 className="font-medium mb-2">Job Description:</h4>
                      <MDXEditor
                        markdown={
                          matchingJob.jobDescription.detailed_description
                        }
                        contentEditableClassName="-z-10"
                        readOnly
                        plugins={[
                          listsPlugin(),
                          quotePlugin(),
                          headingsPlugin(),
                          frontmatterPlugin(),
                          diffSourcePlugin(),
                        ]}
                      />
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Match Scores:</h4>
                      <p>Industry Score: {matchingJob.industryScore}%</p>
                      <p>Technical Score: {matchingJob.technicalScore}%</p>
                      <p>Overall Score: {matchingJob.overallScore}%</p>
                      <p>Final Score: {matchingJob.finalScore}%</p>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">
                        Best Match Reasoning:
                      </h4>
                      <p>{matchingJob.bestMatchReasoning}</p>
                    </div>
                  </div>
                )}
              </ScrollArea>
            </DialogContent>
          </Dialog>
          <NoResultsDialog
            isOpen={showNoResults}
            onOpenChange={setShowNoResults}
            type="jobs"
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default CVMatchingTab;
