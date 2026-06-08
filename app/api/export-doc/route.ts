import { NextRequest, NextResponse } from "next/server";
import { createSharedProspectingDoc } from "../../../lib/drive";

export async function POST(req: NextRequest) {
  try {
    const { accessToken, title, content } = await req.json();

    if (!accessToken || !title || !content) {
      return NextResponse.json(
        { error: "Access token, document title, and content are required for export." },
        { status: 400 }
      );
    }

    const docUrl = await createSharedProspectingDoc(accessToken, title, content);
    return NextResponse.json({ docUrl });

  } catch (error: any) {
    console.error("Google Docs Export API error:", error);
    return NextResponse.json(
      { error: error?.message || "An error occurred while creating the Google Doc." },
      { status: 500 }
    );
  }
}
