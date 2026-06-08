import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { name, vertical, website, notes } = await req.json();

    if (!name || !vertical) {
      return NextResponse.json(
        { error: "Organization name and vertical are required." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY environment variable is not configured." },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    // Configure detailed search prompt
    const prompt = `
You are "Pat", an elite Strategic Account Executive at D2L (Desire2Learn), pitching "D2L Brightspace" LMS.
Your target is:
- Organization Name: ${name}
- Vertical: ${vertical}
- Website/Domain: ${website || 'Not specified'}
- Additional Context/Notes: ${notes || 'None'}

Your purpose is to perform B2B prospecting research. Search online for learning systems, compliance software, corporate training, academic courses, or enterprise instruction frameworks operated by ${name}.
Specifically, detect:
1. What Learning Management System (LMS) they are currently using (e.g. Canvas, Blackboard, Moodle, Litmos, Cornerstone, Docebo, or "In-house / Unknown").
2. Estimated displacement friction score (integer from 1 to 100, where 1 means extremely eager/vulnerable to change, and 100 means highly locked-in or content).
3. Live B2B news, press bulletins, learning rollouts, state training mandates, or local training events of this target (provide 2 items with actual context).
4. Major pain points of their current setup (e.g., outdated UI/UX, deficient accessibility, rigid course authoring, lack of gamification elements).
5. D2L Brightspace value proposition: Native templates, robust accessibility compliance, drag-and-drop course-builder, or mobile-first layouts. Design a tailored approach.
6. A high-conversion B2B cold email pitching D2L Brightspace. Match their current LMS vulnerabilities or training goals. Sign off professionally as "Pat, Enterprise Solutions AE at D2L".

You MUST return a JSON object matching this schema exactly:
{
  "orgName": "${name}",
  "vertical": "${vertical}",
  "detectedLms": "string",
  "displacementScore": number,
  "lmsPainPoints": ["string", "string"],
  "learningNews": [
    {
      "headline": "string",
      "summary": "string",
      "source_url": "string",
      "date": "string"
    }
  ],
  "customerStoryAngle": "string",
  "draftEmail": "string"
}

Respond ONLY with valid JSON.
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        tools: [{ googleSearch: {} }],
      },
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Gemini returned an empty response.");
    }

    // Extract grounding metadata to show the search sequence in the UI
    const searchQueries: string[] = [];
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    if (groundingMetadata?.webSearchQueries) {
      searchQueries.push(...groundingMetadata.webSearchQueries);
    }

    const data = JSON.parse(resultText);

    return NextResponse.json({
      data,
      searchQueries: searchQueries.length > 0 ? searchQueries : [
        `What LMS platform does ${name} currently use`,
        `${name} learning and development training program`,
        `${name} enterprise software news brief`
      ]
    });

  } catch (error: any) {
    console.error("Research API error:", error);
    return NextResponse.json(
      { error: error?.message || "An error occurred during Gemini research." },
      { status: 500 }
    );
  }
}
