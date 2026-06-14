import { NextResponse } from "next/server";
import { getScoreboardPayloadByFieldId } from "@/lib/services/scoreboard-display";

type FieldScoreboardApiProps = {
  params: Promise<{
    fieldId: string;
  }>;
};

export async function GET(_request: Request, { params }: FieldScoreboardApiProps) {
  try {
    const { fieldId } = await params;
    const payload = await getScoreboardPayloadByFieldId(fieldId);
    return NextResponse.json(payload);
  } catch (error) {
    console.error("Failed to load field scoreboard payload", error);
    return NextResponse.json({ error: "Unable to load scoreboard." }, { status: 500 });
  }
}
