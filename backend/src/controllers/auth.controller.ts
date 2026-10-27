import {
    Request,
    Response
} from "express";

import bcrypt from "bcrypt";

import prisma from "../config/prisma";

import {
    sendVerificationEmail
} from "../services/email.service";

import {
    generateToken
} from "../config/jwt";

import {
    createSession,
    revokeSession
} from "../services/session.service";

import {
    getAuthToken,
    setAuthCookie,
    clearAuthCookie
} from "../config/auth-cookie";

import {
    AuthRequest
} from "../middleware/auth.middleware";


const TWO_FACTOR_ENABLED =
    String(
        process.env.AUTH_2FA_ENABLED
    ).toLowerCase() === "true";


// =====================================================
// LOGIN
// =====================================================

export async function login(
    req: Request,
    res: Response
) {

    try {

        const email =
            String(
                req.body?.email ?? ""
            )
                .trim()
                .toLowerCase();

        const password =
            String(
                req.body?.password ?? ""
            );


        if (
            !email ||
            !password
        ) {

            return res.status(400).json({

                message:
                    "Email y contraseña son requeridos"

            });

        }


        const user =
            await prisma.systemUser.findUnique({

                where: {
                    email
                },

                include: {
                    role: true
                }

            });


        if (!user) {

            return res.status(401).json({

                message:
                    "Credenciales incorrectas"

            });

        }


        if (
            user.status !==
            "ACTIVE"
        ) {

            return res.status(403).json({

                message:
                    "La cuenta no está activa"

            });

        }


        const passwordValid =
            await bcrypt.compare(
                password,
                user.passwordHash
            );


        if (!passwordValid) {

            await prisma.securityLog.create({

                data: {

                    userId: user.id,

                    action:
                        "LOGIN_FAILED",

                    ipAddress:
                        req.ip

                }

            });

            return res.status(401).json({

                message:
                    "Credenciales incorrectas"

            });

        }


        // =================================================
        // 2FA
        // =================================================

        if (
            TWO_FACTOR_ENABLED
        ) {

            const code =
                Math.floor(
                    100000 +
                    Math.random() *
                    900000
                ).toString();


            await prisma.verificationCode.create({

                data: {

                    userId:
                        user.id,

                    code,

                    expiresAt:
                        new Date(
                            Date.now() +
                            5 * 60 * 1000
                        )

                }

            });


            await sendVerificationEmail(

                user.backupEmail ??
                user.email,

                code

            );


            await prisma.securityLog.create({

                data: {

                    userId:
                        user.id,

                    action:
                        "LOGIN_2FA_REQUIRED",

                    ipAddress:
                        req.ip

                }

            });


            return res.json({

                requiresTwoFactor:
                    true,

                userId:
                    user.id,

                email:
                    user.email

            });

        }


        // =================================================
        // DIRECT LOGIN
        // =================================================

        const token =
            generateToken({

                id:
                    user.id,

                email:
                    user.email,

                role:
                    user.role?.name ??
                    "USER"

            });


        await createSession(

            user.id,

            token,

            req.ip,

            req.headers[
                "user-agent"
            ]

        );


        setAuthCookie(
            res,
            token
        );


        await prisma.systemUser.update({

            where: {
                id:
                    user.id
            },

            data: {

                lastLogin:
                    new Date()

            }

        });


        await prisma.securityLog.create({

            data: {

                userId:
                    user.id,

                action:
                    "LOGIN_SUCCESS",

                ipAddress:
                    req.ip

            }

        });


        return res.json({

            message:
                "Login successful",

            requiresTwoFactor:
                false,

            user: {

                id:
                    user.id,

                firstName:
                    user.firstName,

                lastName:
                    user.lastName,

                email:
                    user.email,

                role:
                    user.role?.name ??
                    "USER"

            }

        });


    } catch (error) {

        console.error(
            "LOGIN ERROR:",
            error
        );

        return res.status(500).json({

            message:
                "Error interno del servidor"

        });

    }

}


// =====================================================
// CURRENT USER
// =====================================================

export async function me(
    req: AuthRequest,
    res: Response
) {

    try {

        if (!req.user) {

            return res.status(401).json({

                message:
                    "Authentication required"

            });

        }


        const user =
            await prisma.systemUser.findUnique({

                where: {
                    id:
                        req.user.id
                },

                include: {
                    role: true
                }

            });


        if (!user) {

            return res.status(401).json({

                message:
                    "User not found"

            });

        }


        if (
            user.status !==
            "ACTIVE"
        ) {

            return res.status(403).json({

                message:
                    "La cuenta no está activa"

            });

        }


        return res.json({

            authenticated:
                true,

            user: {

                id:
                    user.id,

                firstName:
                    user.firstName,

                lastName:
                    user.lastName,

                email:
                    user.email,

                role:
                    user.role?.name ??
                    "USER"

            }

        });

    } catch (error) {

        console.error(
            "ME ERROR:",
            error
        );

        return res.status(500).json({

            message:
                "Error interno del servidor"

        });

    }

}


// =====================================================
// LOGOUT
// =====================================================

export async function logout(
    req: Request,
    res: Response
) {

    try {

        const token =
            getAuthToken(req);


        if (token) {

            await revokeSession(
                token
            );

        }


        clearAuthCookie(
            res
        );


        return res.json({

            message:
                "Logout successful"

        });

    } catch (error) {

        console.error(
            "LOGOUT ERROR:",
            error
        );


        clearAuthCookie(
            res
        );


        return res.status(500).json({

            message:
                "Logout completed locally"

        });

    }

}


// =====================================================
// VERIFY 2FA
// =====================================================

export async function verifyCode(
    req: Request,
    res: Response
) {

    try {

        const email =
            String(
                req.body?.email ?? ""
            )
                .trim()
                .toLowerCase();

        const code =
            String(
                req.body?.code ?? ""
            )
                .trim();


        if (
            !email ||
            !code
        ) {

            return res.status(400).json({

                message:
                    "Email y código son requeridos"

            });

        }


        const user =
            await prisma.systemUser.findUnique({

                where: {
                    email
                },

                include: {
                    role: true
                }

            });


        if (!user) {

            return res.status(404).json({

                message:
                    "Usuario no encontrado"

            });

        }


        const verification =
            await prisma.verificationCode.findFirst({

                where: {

                    userId:
                        user.id,

                    code,

                    used:
                        false,

                    expiresAt: {

                        gt:
                            new Date()

                    }

                },

                orderBy: {

                    createdAt:
                        "desc"

                }

            });


        if (!verification) {

            await prisma.securityLog.create({

                data: {

                    userId:
                        user.id,

                    action:
                        "2FA_FAILED",

                    ipAddress:
                        req.ip

                }

            });


            return res.status(401).json({

                message:
                    "Código de verificación incorrecto o expirado"

            });

        }


        await prisma.verificationCode.update({

            where: {

                id:
                    verification.id

            },

            data: {

                used:
                    true

            }

        });


        const token =
            generateToken({

                id:
                    user.id,

                email:
                    user.email,

                role:
                    user.role?.name ??
                    "USER"

            });


        await createSession(

            user.id,

            token,

            req.ip,

            req.headers[
                "user-agent"
            ]

        );


        setAuthCookie(
            res,
            token
        );


        await prisma.systemUser.update({

            where: {

                id:
                    user.id

            },

            data: {

                lastLogin:
                    new Date()

            }

        });


        await prisma.securityLog.create({

            data: {

                userId:
                    user.id,

                action:
                    "LOGIN_2FA_SUCCESS",

                ipAddress:
                    req.ip

            }

        });


        return res.json({

            message:
                "Verificación exitosa",

            tokenCreated:
                true,

            user: {

                id:
                    user.id,

                firstName:
                    user.firstName,

                lastName:
                    user.lastName,

                email:
                    user.email,

                role:
                    user.role?.name ??
                    "USER"

            }

        });


    } catch (error) {

        console.error(
            "2FA ERROR:",
            error
        );


        return res.status(500).json({

            message:
                "Error interno del servidor"

        });

    }

}
