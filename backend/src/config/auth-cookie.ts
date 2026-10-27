import { Request, Response } from "express";

export const AUTH_COOKIE_NAME = "it_hub_session";

const COOKIE_MAX_AGE =
    8 * 60 * 60 * 1000;

export function getAuthToken(
    req: Request
): string | null {

    const cookieHeader =
        req.headers.cookie;

    if (!cookieHeader) {
        return null;
    }

    const cookies =
        cookieHeader
            .split(";")
            .map((cookie) => cookie.trim());

    const authCookie =
        cookies.find((cookie) =>
            cookie.startsWith(
                `${AUTH_COOKIE_NAME}=`
            )
        );

    if (!authCookie) {
        return null;
    }

    return decodeURIComponent(
        authCookie.substring(
            AUTH_COOKIE_NAME.length + 1
        )
    );
}

export function setAuthCookie(
    res: Response,
    token: string
): void {

    const secure =
        process.env.NODE_ENV === "production";

    res.cookie(
        AUTH_COOKIE_NAME,
        token,
        {
            httpOnly: true,
            secure,
            sameSite: secure ? "none" : "lax",
            maxAge: COOKIE_MAX_AGE,
            path: "/"
        }
    );
}

export function clearAuthCookie(
    res: Response
): void {

    const secure =
        process.env.NODE_ENV === "production";

    res.clearCookie(
        AUTH_COOKIE_NAME,
        {
            httpOnly: true,
            secure,
            sameSite: secure ? "none" : "lax",
            path: "/"
        }
    );
}

