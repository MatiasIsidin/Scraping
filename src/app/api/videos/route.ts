import { supabaseAdmin } from "@lib/supabaseClient";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("videos")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("[VIDEOS-API-ERROR]", error.message);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("[VIDEOS-API-CRITICAL]", err.message);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
