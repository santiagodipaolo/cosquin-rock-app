import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// Generar token aleatorio
function generateToken(): string {
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15);
}

// Crear link compartible
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { type } = body; // "day1" | "day2" | "both"

    if (!["day1", "day2", "both"].includes(type)) {
      return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
    }

    // Verificar si ya existe un token para este tipo
    let shareToken = await prisma.shareToken.findFirst({
      where: {
        userId: session.user.id,
        type,
      },
    });

    if (!shareToken) {
      // Crear nuevo token
      const token = generateToken();
      shareToken = await prisma.shareToken.create({
        data: {
          userId: session.user.id,
          token,
          type,
        },
      });
    }

    const url = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/agenda/${shareToken.token}`;

    return NextResponse.json({ url, token: shareToken.token });
  } catch (error) {
    console.error("Error creating share token:", error);
    return NextResponse.json({ error: "Error al crear link" }, { status: 500 });
  }
}
