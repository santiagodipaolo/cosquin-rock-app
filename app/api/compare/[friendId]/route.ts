import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ friendId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { friendId } = await params;

    // Obtener mis bandas
    const myBands = await prisma.attendance.findMany({
      where: { userId: session.user.id },
      include: {
        band: true,
      },
    });

    // Obtener bandas del amigo
    const friendBands = await prisma.attendance.findMany({
      where: { userId: friendId },
      include: {
        band: true,
      },
    });

    // Obtener info del amigo
    const friend = await prisma.user.findUnique({
      where: { id: friendId },
      select: { username: true, avatar: true },
    });

    if (!friend) {
      return NextResponse.json({ error: "Amigo no encontrado" }, { status: 404 });
    }

    const myBandIds = new Set(myBands.map((a) => a.bandId));
    const friendBandIds = new Set(friendBands.map((a) => a.bandId));

    // Clasificar bandas
    const both = myBands.filter((a) => friendBandIds.has(a.bandId)).map((a) => a.band);
    const onlyMe = myBands.filter((a) => !friendBandIds.has(a.bandId)).map((a) => a.band);
    const onlyFriend = friendBands.filter((a) => !myBandIds.has(a.bandId)).map((a) => a.band);

    return NextResponse.json({
      friend,
      both,
      onlyMe,
      onlyFriend,
    });
  } catch (error) {
    console.error("Error comparing agendas:", error);
    return NextResponse.json({ error: "Error al comparar agendas" }, { status: 500 });
  }
}
