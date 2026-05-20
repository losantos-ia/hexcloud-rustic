import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

// PATCH /api/hr/users/[uid] — enable or disable a user
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await params;
    const { disabled } = await req.json();

    if (typeof disabled !== "boolean") {
      return NextResponse.json({ error: "El campo 'disabled' es obligatorio y debe ser booleano." }, { status: 400 });
    }

    await adminAuth().updateUser(uid, { disabled });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("[PATCH /api/hr/users/[uid]]", err);
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE /api/hr/users/[uid] — delete Firebase Auth user + Firestore users doc + unlink from employee
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await params;
    const auth = adminAuth();
    const db = adminDb();

    // Delete Firebase Auth user
    await auth.deleteUser(uid);

    // Delete Firestore users doc
    await db.collection("users").doc(uid).delete();

    // Unlink uid from any employee document that references this uid
    const empSnap = await db
      .collection("employees")
      .where("uid", "==", uid)
      .get();

    const batch = db.batch();
    empSnap.docs.forEach((doc) => {
      batch.update(doc.ref, { uid: null });
    });
    await batch.commit();

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("[DELETE /api/hr/users/[uid]]", err);
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
