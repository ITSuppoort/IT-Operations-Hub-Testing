import {
    Request,
    Response,
    NextFunction
} from "express";

import { verifyToken } from "../config/jwt";

import {
    getAuthToken
} from "../config/auth-cookie";

import {
    getValidSession
} from "../services/session.service";


export interface AuthRequest
    extends Request {

    user?: {
        id: string;
        email: string;
        role: string;
    };

}


export async function authenticate(

    req: AuthRequest,

    res: Response,

    next: NextFunction

) {

    try {

        const token =
            getAuthToken(req);

        if (!token) {

            return res.status(401).json({

                message:
                    "Authentication required"

            });

        }


        const decoded =
            verifyToken(token);


        if (
            typeof decoded !==
            "object" ||
            decoded === null
        ) {

            return res.status(401).json({

                message:
                    "Invalid authentication token"

            });

        }


        const userId =
            String(decoded.id ?? "");

        const email =
            String(decoded.email ?? "");

        const role =
            String(decoded.role ?? "");


        if (
            !userId ||
            !email ||
            !role
        ) {

            return res.status(401).json({

                message:
                    "Invalid authentication token"

            });

        }


        const session =
            await getValidSession(token);


        if (!session) {

            return res.status(401).json({

                message:
                    "Session expired or revoked"

            });

        }


        if (
            session.userId !==
            userId
        ) {

            return res.status(401).json({

                message:
                    "Invalid session"

            });

        }


        req.user = {

            id: userId,

            email,

            role

        };


        next();

    } catch (error) {

        return res.status(401).json({

            message:
                "Invalid or expired session"

        });

    }

}
