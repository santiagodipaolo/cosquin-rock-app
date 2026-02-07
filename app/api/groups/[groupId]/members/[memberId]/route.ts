import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// Remove a member from group (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string; memberId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { groupId, memberId } = await params;

    const group = await prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      return NextResponse.json({ error: "Grupo no encontrado" }, { status: 404 });
    }

    if (group.createdBy !== session.user.id) {
      return NextResponse.json({ error: "Solo el admin puede sacar miembros" }, { status: 403 });
    }

    // Can't remove yourself as admin
    const member = await prisma.groupMember.findUnique({
      where: { id: memberId },
    });

    if (!member) {
      return NextResponse.json({ error: "Miembro no encontrado" }, { status: 404 });
    }

    if (member.userId === session.user.id) {
      return NextResponse.json({ error: "No podés sacarte a vos mismo" }, { status: 400 });
    }

    await prisma.groupMember.delete({
      where: { id: memberId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error removing member:", error);
    return NextResponse.json({ error: "Error al sacar miembro" }, { status: 500 });
  }
}
