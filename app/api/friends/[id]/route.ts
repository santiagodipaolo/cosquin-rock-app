import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// Aceptar solicitud de amistad
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;

    const friendship = await prisma.friendship.findUnique({
      where: { id },
    });

    if (!friendship) {
      return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
    }

    // Solo el destinatario puede aceptar
    if (friendship.addresseeId !== session.user.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    if (friendship.status !== "pending") {
      return NextResponse.json({ error: "Solicitud ya procesada" }, { status: 400 });
    }

    const updated = await prisma.friendship.update({
      where: { id },
      data: { status: "accepted" },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error accepting friend request:", error);
    return NextResponse.json({ error: "Error al aceptar solicitud" }, { status: 500 });
  }
}

// Rechazar solicitud o eliminar amistad
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;

    const friendship = await prisma.friendship.findUnique({
      where: { id },
    });

    if (!friendship) {
      return NextResponse.json({ error: "Amistad no encontrada" }, { status: 404 });
    }

    // Solo las partes involucradas pueden eliminar
    if (friendship.requesterId !== session.user.id && friendship.addresseeId !== session.user.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    await prisma.friendship.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting friendship:", error);
    return NextResponse.json({ error: "Error al eliminar amistad" }, { status: 500 });
  }
}
