import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// Unirse a un grupo con código
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { inviteCode } = body;

    if (!inviteCode || inviteCode.trim().length === 0) {
      return NextResponse.json({ error: "Código de invitación requerido" }, { status: 400 });
    }

    // Buscar grupo
    const group = await prisma.group.findUnique({
      where: { inviteCode: inviteCode.trim().toUpperCase() },
      include: {
        members: {
          where: {
            userId: session.user.id,
          },
        },
      },
    });

    if (!group) {
      return NextResponse.json({ error: "Código inválido" }, { status: 404 });
    }

    // Verificar si ya es miembro
    if (group.members.length > 0) {
      return NextResponse.json({ error: "Ya eres miembro de este grupo" }, { status: 400 });
    }

    // Agregar miembro
    await prisma.groupMember.create({
      data: {
        groupId: group.id,
        userId: session.user.id,
      },
    });

    // Auto-agregar como amigos a todos los miembros del grupo
    const existingMembers = await prisma.groupMember.findMany({
      where: {
        groupId: group.id,
        userId: { not: session.user.id },
      },
      select: { userId: true },
    });

    // Crear amistades mutuas con cada miembro (si no existen ya)
    for (const member of existingMembers) {
      // Verificar si ya son amigos
      const existingFriendship = await prisma.friendship.findFirst({
        where: {
          OR: [
            { requesterId: session.user.id, addresseeId: member.userId },
            { requesterId: member.userId, addresseeId: session.user.id },
          ],
        },
      });

      if (!existingFriendship) {
        // Crear amistad automáticamente aceptada
        await prisma.friendship.create({
          data: {
            requesterId: session.user.id,
            addresseeId: member.userId,
            status: "accepted",
          },
        });
      }
    }

    // Devolver grupo completo
    const updatedGroup = await prisma.group.findUnique({
      where: { id: group.id },
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
    console.error("Error joining group:", error);
    return NextResponse.json({ error: "Error al unirse al grupo" }, { status: 500 });
  }
}
