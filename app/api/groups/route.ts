import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// Generar código aleatorio de 6 caracteres
function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Crear grupo
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: "Nombre de grupo requerido" }, { status: 400 });
    }

    // Generar código único
    let inviteCode = generateInviteCode();
    let exists = await prisma.group.findUnique({ where: { inviteCode } });

    while (exists) {
      inviteCode = generateInviteCode();
      exists = await prisma.group.findUnique({ where: { inviteCode } });
    }

    // Crear grupo
    const group = await prisma.group.create({
      data: {
        name: name.trim(),
        inviteCode,
        createdBy: session.user.id,
        members: {
          create: {
            userId: session.user.id,
          },
        },
      },
      include: {
        members: {
          include: {
            user: true,
          },
        },
      },
    });

    return NextResponse.json(group);
  } catch (error) {
    console.error("Error creating group:", error);
    return NextResponse.json({ error: "Error al crear grupo" }, { status: 500 });
  }
}

// Obtener grupos del usuario
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const groups = await prisma.group.findMany({
      where: {
        members: {
          some: {
            userId: session.user.id,
          },
        },
      },
      include: {
        members: {
          include: {
            user: true,
          },
        },
      },
    });

    return NextResponse.json(groups);
  } catch (error) {
    console.error("Error fetching groups:", error);
    return NextResponse.json({ error: "Error al obtener grupos" }, { status: 500 });
  }
}
