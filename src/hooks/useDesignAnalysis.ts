import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { functionErrorMessage } from "@/lib/functions";
import { toast } from "sonner";
import { saveAnalysisSession } from "@/lib/designData";
import type { Region, TextElement } from "@/lib/measure";


export interface Finding {
  type: "strength" | "improvement";
  title: string;
  description: string;
  /** Which screenshot the finding is about (0-based). */
  screen?: number;
  /** Where on that screenshot, as fractions of its size; null means the whole screen. */
  region?: Region | null;
}

export interface Category {
  name: string;
  score: number;
  status: "excellent" | "good" | "needs-work";
  findings: Finding[];
}

export interface FlowFeedback {
  score: number;
  summary: string;
  consistency?: string;
  missingSteps?: string[];
  transitions?: { from: number; to: number; note: string }[];
}

export interface DesignFeedback {
  overallScore: number;
  summary: string;
  categories: Category[];
  topPriorities: string[];
  textElements?: TextElement[];
  flow?: FlowFeedback | null;
}

export const useDesignAnalysis = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [feedback, setFeedback] = useState<DesignFeedback | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyzeDesign = async (file: File) => {
    setIsAnalyzing(true);
    setError(null);
    setFeedback(null);
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(URL.createObjectURL(file));

    try {
      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          // Remove the data URL prefix to get just the base64 string
          const base64String = result.split(",")[1];
          resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const { data, error: functionError } = await supabase.functions.invoke(
        "analyze-design",
        {
          body: {
            imageBase64: base64,
            mimeType: file.type,
          },
        }
      );

      if (functionError) {
        throw new Error(await functionErrorMessage(functionError));
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (!data?.feedback) {
        throw new Error("No feedback received");
      }

      setFeedback(data.feedback);

      // Persist the analysis for signed-in users so it survives a refresh
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user) {
          await saveAnalysisSession({
            userId: authData.user.id,
            source: "landing",
            feedback: data.feedback,
            overallScore: data.feedback.overallScore
              ? Math.round(data.feedback.overallScore * 10)
              : null,
          });
        }
      } catch (persistError) {
        console.error("Could not save analysis session:", persistError);
      }

      toast.success("Design analysis complete!");

    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to analyze design";
      setError(message);
      toast.error(message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetAnalysis = () => {
    setFeedback(null);
    setError(null);
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(null);
  };

  return {
    isAnalyzing,
    feedback,
    imageUrl,
    error,
    analyzeDesign,
    resetAnalysis,
  };
};
