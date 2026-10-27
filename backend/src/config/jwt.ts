import jwt from "jsonwebtoken";

const SECRET: string =
    process.env.JWT_SECRET || "IT-HUB-SECRET";

export function generateToken(payload: object): string {

    return jwt.sign(
        payload,
        SECRET,
        {
            expiresIn: "8h"
        }
    );
}

export function verifyToken(token: string): jwt.JwtPayload | string {

    return jwt.verify(
        token,
        SECRET
    );
}
