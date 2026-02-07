import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// Marcar/desmarcar asistencia
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { bandId, attending } = body;

    if (!bandId) {
      return NextResponse.json({ error: "Band ID requerido" }, { status: 400 });
    }

    if (attending) {
      // Crear asistencia
      const attendance = await prisma.attendance.create({
        data: {
          userId: session.user.id,
          bandId,
        },
      });
      return NextResponse.json(attendance);
    } else {
      // Eliminar asistencia
      await prisma.attendance.deleteMany({
        where: {
          userId: session.user.id,
          bandId,
        },
      });
      return NextResponse.json({ success: true });
    }
  } catch (error: any) {
    // Si ya existe (unique constraint)
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Ya estás marcado para esta banda" }, { status: 400 });
    }

    console.error("Error toggling attendance:", error);
    return NextResponse.json({ error: "Error al marcar asistencia" }, { status: 500 });
  }
}

// Obtener asistencias del usuario
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const bandId = searchParams.get("bandId");

    if (bandId) {
      const userId = session.user.id;

      // Obtener IDs de miembros de los mismos grupos
      const userGroups = await prisma.groupMember.findMany({
        where: { userId },
        select: { groupId: true },
      });
      const groupIds = userGroups.map((g) => g.groupId);

      const groupMembers = groupIds.length > 0
        ? await prisma.groupMember.findMany({
            where: { groupId: { in: groupIds }, userId: { not: userId } },
            select: { userId: true },
          })
        : [];
      const groupMemberIds = new Set(groupMembers.map((m) => m.userId));

      // Obtener IDs de amigos directos aceptados
      const friendshipsSent = await prisma.friendship.findMany({
        where: { requesterId: userId, status: "accepted" },
        select: { addresseeId: true },
      });
      const friendshipsReceived = await prisma.friendship.findMany({
        where: { addresseeId: userId, status: "accepted" },
        select: { requesterId: true },
      });
      const friendIds = new Set([
        ...friendshipsSent.map((f) => f.addresseeId),
        ...friendshipsReceived.map((f) => f.requesterId),
      ]);

      // Unir todos los IDs de conexiones
      const connectedIds = new Set([...groupMemberIds, ...friendIds]);

      if (connectedIds.size === 0) {
        return NextResponse.json([]);
      }

      // Obtener asistencias solo de usuarios conectados
      const attendances = await prisma.attendance.findMany({
        where: {
          bandId,
          userId: { in: Array.from(connectedIds) },
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatar: true,
            },
          },
        },
      });

      // Agregar source: "group" | "friend" a cada resultado
      const withSource = attendances.map((a) => ({
        ...a,
        source: groupMemberIds.has(a.userId) ? "group" as const : "friend" as const,
      }));

      return NextResponse.json(withSource);
    } else {
      // Obtener bandas del usuario
      const attendances = await prisma.attendance.findMany({
        where: { userId: session.user.id },
        include: {
          band: true,
        },
        orderBy: {
          band: {
            startTime: "asc",
          },
        },
      });

      return NextResponse.json(attendances);
    }
  } catch (error) {
    console.error("Error fetching attendance:", error);
    return NextResponse.json({ error: "Error al obtener asistencias" }, { status: 500 });
  }
}
