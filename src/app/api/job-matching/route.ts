import { headers } from "../_utils/requestHeaders";
import { JobDescription } from "../../../types/JobDescription";
import { extractJobExperienceLevel } from "../_extractors/extractJobExperienceLevel";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { jobTitle, industry, detailedDescription, skills } =
      (await request.json()) as Omit<
        JobDescription,
        "id" | "createdAt" | "experienceLevel"
      >;

    // TODO: implement data validation using zod

    // Extract the experience level
    const experienceLevel = await extractJobExperienceLevel(
      jobTitle,
      detailedDescription
    );

    // Store Job Descriptions in the database
    const { data, error } = await supabase.from("job_descriptions").insert({
      experience_level: experienceLevel,
      detailed_description: detailedDescription,
      job_title: jobTitle,
      industry,
      skills,
    });

    if (error) {
      console.error("Error saving job description:", error);
      return new Response(
        JSON.stringify({ error: "Failed to save Job Description." }),
        {
          status: 500,
          headers: { ...headers, "Content-Type": "application/json" },
        }
      );
    }

    // TODO: Find matching CVs

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error processing job description:", e);
    return new Response(
      JSON.stringify({ error: "Failed to process Job Description." }),
      {
        status: 500,
        headers: { ...headers, "Content-Type": "application/json" },
      }
    );
  }
}