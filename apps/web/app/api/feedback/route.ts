import { NextResponse } from "next/server";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { category, description, diagnostics } = body;

    if (!description || typeof description !== "string") {
      return NextResponse.json({ error: "Description is required." }, { status: 400 });
    }

    // Log diagnostic feedback for engineering team
    console.log("[PansGPT Feedback/Bug Report]", {
      category: category || "general",
      description: description.slice(0, 1000),
      diagnostics,
      receivedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, message: "Feedback received." });
  } catch {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }
}
