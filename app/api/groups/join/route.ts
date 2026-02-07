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
