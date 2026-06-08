import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

// Safe lazy initialization of the Gemini API client to prevent crash on missing variables
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required but missing");
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

export async function POST(req: NextRequest) {
  try {
    const ai = getAiClient();
    const { action, name, company, role, website, notes } = await req.json();

    if (!name || !company) {
      return NextResponse.json({ error: "Name and Company are required." }, { status: 400 });
    }

    if (action === "analyze") {
      const prompt = `
        You are an elite Sales Intel Analyst. Run a B2B sales readiness analysis on this prospect:
        - Name: ${name}
        - Company: ${company}
        - Role: ${role || "Not specified"}
        - Website: ${website || "Not specified"}
        - Context/Notes: ${notes || "No extra context provided"}

        Please provide a detailed, highly professional analysis in a valid JSON format.
        Your response must be JSON only. Do not wrap it in any comments or markdown except standard markdown block with "json" tag if necessary, but returning pure JSON string is preferred.
        The JSON must strictly match this shape:
        {
          "score": <number between 10 and 99 reflecting BANT (Budget, Authority, Need, Timeline) fit>,
          "bantAnalysis": {
            "budget": "Brief text assessing likely budget readiness or indicators",
            "authority": "Assessing this contact's role decision-making influence",
            "need": "Evaluating probable pain point or business need based on company size/industry context",
            "timeline": "Relevance timeline based on context or average sales cycle"
          },
          "strengths": ["list of 2-3 key reasons this lead fits"],
          "risks": ["list of 1-2 major risks or blockers"],
          "nextSteps": ["list of 2 concrete professional next-step recommendations"]
        }
      `;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const responseText = response.text || "{}";
      const parsedData = JSON.parse(responseText.trim());
      return NextResponse.json(parsedData);

    } else if (action === "email") {
      const prompt = `
        You are an exceptional Cold Outreach Copywriter. Draft a modern, hyper-personalized, high-converting outbound email to this prospect:
        - Lead Name: ${name}
        - Lead Company: ${company}
        - Lead Role: ${role || "Decision Maker"}
        - Business context: ${notes || "Prospecting for core B2B solutions"}

        Instructions:
        - Keep it punchy, warm, brief (under 180 words).
        - No corporate canned buzzwords. Frame it with high genuine relevance.
        - Must include a catchy, single-subject line.
        - Leave distinct [placeholders] for the sender (like [My Company] or [My Product]) so it remains easy to customize.

        Please output response as a clean JSON with the following schema:
        {
          "subject": "Compelling subject line",
          "body": "Formatted body copy with double newlines for linebreaks"
        }
      `;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const responseText = response.text || "{}";
      const parsedData = JSON.parse(responseText.trim());
      return NextResponse.json(parsedData);
    }

    return NextResponse.json({ error: "Invalid action type" }, { status: 400 });

  } catch (error: any) {
    console.error("Gemini API Error in proxy route:", error);
    return NextResponse.json(
      { error: "AI service is currently unavailable or failed to generate insights.", detail: error.message },
      { status: 500 }
    );
  }
}
