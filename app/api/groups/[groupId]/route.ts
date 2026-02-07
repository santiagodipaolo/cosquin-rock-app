import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// Update group name (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { groupId } = await params;
    const body = await request.json();
    const { name } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
    }

    const group = await prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      return NextResponse.json({ error: "Grupo no encontrado" }, { status: 404 });
    }

    if (group.createdBy !== session.user.id) {
      return NextResponse.json({ error: "Solo el admin puede editar el grupo" }, { status: 403 });
    }

    const updatedGroup = await prisma.group.update({
      where: { id: groupId },
      data: { name: name.trim() },
      include: {
        members: {
          include: {
            user: true,
          },
        },
      },
    });

    return NextResponse.json(updatedGroup);
  } catch (error) {
    console.error("Error updating group:", error);
    return NextResponse.json({ error: "Error al actualizar grupo" }, { status: 500 });
  }
}

// Delete group (admin only)
export async function DELETE(
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

    if (group.createdBy !== session.user.id) {
      return NextResponse.json({ error: "Solo el admin puede eliminar el grupo" }, { status: 403 });
    }

    await prisma.group.delete({
      where: { id: groupId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error deleting group:", error);
    return NextResponse.json({ error: "Error al eliminar grupo" }, { status: 500 });
  }
}
