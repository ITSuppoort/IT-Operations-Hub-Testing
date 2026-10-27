import prisma from "../config/prisma";

const SESSION_DURATION =
    8 * 60 * 60 * 1000;


// =====================================================
// CREATE SESSION
// =====================================================

export async function createSession(
    userId: string,
    token: string,
    ipAddress?: string,
    device?: string
) {

    return await prisma.session.create({

        data: {

            userId,

            token,

            ipAddress,

            device,

            expiresAt:
                new Date(
                    Date.now() +
                    SESSION_DURATION
                )

        }

    });

}


// =====================================================
// GET VALID SESSION
// =====================================================

export async function getValidSession(
    token: string
) {

    return await prisma.session.findFirst({

        where: {

            token,

            expiresAt: {
                gt: new Date()
            }

        }

    });

}


// =====================================================
// REVOKE SESSION
// =====================================================

export async function revokeSession(
    token: string
) {

    await prisma.session.deleteMany({

        where: {

            token

        }

    });

}


// =====================================================
// GET USER SESSIONS
// =====================================================

export async function getUserSessions(
    userId: string
) {

    return await prisma.session.findMany({

        where: {

            userId

        },

        orderBy: {

            createdAt: "desc"

        }

    });

}
