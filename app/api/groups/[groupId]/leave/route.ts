import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// Leave a group
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { groupId } = await params;

    const group = await prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      return NextResponse.json({ error: "Grupo no encontrado" }, { status: 404 });
    }

    // Admin can't leave, they should delete the group
    if (group.createdBy === session.user.id) {
      return NextResponse.json({ error: "El admin no puede salir del grupo. Podés eliminarlo." }, { status: 400 });
    }

    // Remove membership
    await prisma.groupMember.deleteMany({
      where: {
        groupId,
        userId: session.user.id,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error leaving group:", error);
    return NextResponse.json({ error: "Error al salir del grupo" }, { status: 500 });
  }
}
