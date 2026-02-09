import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { username: true, avatar: true, instagram: true, isPublic: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json({ error: "Error al obtener perfil" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { instagram, isPublic } = await request.json();

    // Sanitizar: quitar @ del inicio si lo tiene, y espacios
    let handle = instagram?.trim() || null;
    if (handle) {
      handle = handle.replace(/^@/, "").trim();
      // Validar formato: solo letras, números, puntos y guiones bajos
      if (!/^[a-zA-Z0-9._]{1,30}$/.test(handle)) {
        return NextResponse.json(
          { error: "Handle de Instagram inválido" },
          { status: 400 }
        );
      }
    }

    const data: { instagram?: string | null; isPublic?: boolean } = { instagram: handle };
    if (typeof isPublic === "boolean") {
      data.isPublic = isPublic;
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data,
      select: { username: true, avatar: true, instagram: true, isPublic: true },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json({ error: "Error al actualizar perfil" }, { status: 500 });
  }
}
