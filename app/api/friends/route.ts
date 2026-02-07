import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// Listar amigos + solicitudes pendientes
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userId = session.user.id;

    // Amigos aceptados (enviadas o recibidas)
    const acceptedSent = await prisma.friendship.findMany({
      where: { requesterId: userId, status: "accepted" },
      include: { addressee: { select: { id: true, username: true, avatar: true } } },
    });

    const acceptedReceived = await prisma.friendship.findMany({
      where: { addresseeId: userId, status: "accepted" },
      include: { requester: { select: { id: true, username: true, avatar: true } } },
    });

    const friends = [
      ...acceptedSent.map((f) => ({
        id: f.addressee.id,
        username: f.addressee.username,
        avatar: f.addressee.avatar,
        friendshipId: f.id,
      })),
      ...acceptedReceived.map((f) => ({
        id: f.requester.id,
        username: f.requester.username,
        avatar: f.requester.avatar,
        friendshipId: f.id,
      })),
    ];

    // Solicitudes pendientes recibidas
    const pendingReceived = await prisma.friendship.findMany({
      where: { addresseeId: userId, status: "pending" },
      include: { requester: { select: { id: true, username: true, avatar: true } } },
    });

    // Solicitudes pendientes enviadas
    const pendingSent = await prisma.friendship.findMany({
      where: { requesterId: userId, status: "pending" },
      include: { addressee: { select: { id: true, username: true, avatar: true } } },
    });

    return NextResponse.json({
      friends,
      pendingReceived: pendingReceived.map((f) => ({
        id: f.requester.id,
        friendshipId: f.id,
        username: f.requester.username,
        avatar: f.requester.avatar,
      })),
      pendingSent: pendingSent.map((f) => ({
        id: f.addressee.id,
        friendshipId: f.id,
        username: f.addressee.username,
        avatar: f.addressee.avatar,
      })),
    });
  } catch (error) {
    console.error("Error fetching friends:", error);
    return NextResponse.json({ error: "Error al obtener amigos" }, { status: 500 });
  }
}

// Enviar solicitud de amistad
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { username } = await request.json();
    if (!username?.trim()) {
      return NextResponse.json({ error: "Username requerido" }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { username: username.trim().toLowerCase() },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    if (targetUser.id === session.user.id) {
      return NextResponse.json({ error: "No podes agregarte a vos mismo" }, { status: 400 });
    }

    // Verificar que no exista amistad previa (en cualquier dirección)
    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: session.user.id, addresseeId: targetUser.id },
          { requesterId: targetUser.id, addresseeId: session.user.id },
        ],
      },
    });

    if (existing) {
      if (existing.status === "accepted") {
        return NextResponse.json({ error: "Ya son amigos" }, { status: 400 });
      }
      return NextResponse.json({ error: "Ya existe una solicitud pendiente" }, { status: 400 });
    }

    const friendship = await prisma.friendship.create({
      data: {
        requesterId: session.user.id,
        addresseeId: targetUser.id,
        status: "pending",
      },
    });

    return NextResponse.json(friendship);
  } catch (error) {
    console.error("Error sending friend request:", error);
    return NextResponse.json({ error: "Error al enviar solicitud" }, { status: 500 });
  }
}
