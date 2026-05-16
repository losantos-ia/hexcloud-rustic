import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

// POST /api/hr/users — create a Firebase Auth user + Firestore users doc + link to employee
export async function POST(req: NextRequest) {
  try {
    const { email, password, displayName, role, employeeId } = await req.json();

    if (!email || !password || !displayName || !role || !employeeId) {
      return NextResponse.json({ error: "Faltan campos obligatorios." }, { status: 400 });
    }

    const auth = adminAuth();
    const db = adminDb();

    // Create Firebase Auth user
    const userRecord = await auth.createUser({
      email,
      password,
      displayName,
    });

    // Create Firestore users doc
    await db.collection("users").doc(userRecord.uid).set({
      uid: userRecord.uid,
      email,
      displayName,
      role,
      createdAt: new Date(),
    });

    // Link uid to the employee document
    await db.collection("employees").doc(employeeId).update({ uid: userRecord.uid });

    return NextResponse.json({ uid: userRecord.uid }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    const code = (err as { code?: string }).code;

    if (code === "auth/email-already-exists") {
      return NextResponse.json(
        { error: "Ya existe una cuenta con ese correo electrónico." },
        { status: 409 }
      );
    }

    console.error("[POST /api/hr/users]", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
