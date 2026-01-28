import { NextResponse } from "next/server";
import { addCardToFirestore } from "../../../../lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await addCardToFirestore(body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}


