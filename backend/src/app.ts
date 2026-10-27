import express from "express";
import cors from "cors";
import helmet from "helmet";

import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import equipmentRoutes from "./routes/equipment.routes";
import componentRoutes from "./routes/component.routes";
import movementRoutes from "./routes/movement.routes";
import damageRoutes from "./routes/damage.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import mapRoutes from "./routes/map.routes";
import positionRoutes from "./routes/position.routes";
import mapOverviewRoutes from "./routes/map-overview.routes";
import inventoryRoutes from "./routes/inventory.routes";
import stockEngineRoutes from "./routes/stock-engine.routes";
import positionLotsRoutes from "./routes/position-lots.routes";
import reportRoutes from "./routes/report.routes";
import configurationRoutes from "./routes/configuration.routes";
import historyRoutes from "./routes/history.routes";
import inventoryPersonRoutes from "./routes/inventory-person.routes";

import {
    authenticate
} from "./middleware/auth.middleware";


const app = express();


// =====================================================
// SECURITY
// =====================================================

app.use(
    helmet()
);


// =====================================================
// CORS
// =====================================================

const corsOptions = {
    origin: (origin: string | undefined, callback: (error: Error | null, success?: boolean) => void) => {

        if (!origin) {
            return callback(null, true);
        }

        const configuredOrigins = (process.env.FRONTEND_ORIGINS || "")
            .split(",")
            .map((item) => item.trim().replace(/\/$/, ""))
            .filter(Boolean);

        const isAllowed =
            configuredOrigins.includes(origin) ||
            origin === "https://it-operations-hub.vercel.app" ||
            origin === "https://it-operations-hub-mu.vercel.app" ||
            origin === "http://localhost:3000" ||
            origin === "http://localhost:5173" ||
            /^https:\/\/it-operations-(?:hub-)?[a-z0-9-]+-it-trueshore\.vercel\.app$/i.test(origin);

        if (isAllowed) {
            return callback(null, true);
        }

        return callback(
            new Error(`CORS blocked origin: ${origin}`)
        );
    },

    credentials: true,

    methods: [
        "GET",
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
        "OPTIONS",
    ],

    allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-Confirm-Delete-Asset-Id",
    ],

    optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

// =====================================================
// JSON BODY
// =====================================================

app.use(
    express.json()
);


// =====================================================
// PUBLIC HEALTH CHECK
// =====================================================

app.get(
    "/",
    (req, res) => {

        return res.json({

            message:
                "IT Operations Hub API running",

            status:
                "OK"

        });

    }
);


// =====================================================
// PUBLIC AUTH ROUTES
// =====================================================
//
// Login and 2FA verification must be reachable
// without an authenticated session.
//
// /auth/me has its own authenticate middleware.
// /auth/logout intentionally remains reachable so
// the client can always clear the session.
// =====================================================

app.use(
    "/auth",
    authRoutes
);


// =====================================================
// PROTECT ALL INTERNAL API ROUTES
// =====================================================
//
// Everything registered after this middleware requires:
//
// 1. Valid authentication cookie
// 2. Valid JWT
// 3. Existing session in PostgreSQL
// 4. Non-expired session
//
// This prevents accidentally leaving a new internal
// route exposed simply because someone forgot to add
// authenticate() to its router.
// =====================================================

app.use(
    authenticate
);


// =====================================================
// USER ROUTES
// =====================================================

app.use(
    "/users",
    userRoutes
);


// =====================================================
// EQUIPMENT
// =====================================================

app.use(
    "/equipment",
    equipmentRoutes
);


// =====================================================
// INVENTORY
// =====================================================

app.use(
    "/inventory",
    inventoryRoutes
);


// =====================================================
// MAP
// =====================================================

app.use(
    "/map",
    mapRoutes
);


// =====================================================
// MAP OVERVIEW
// =====================================================

app.use(
    "/map",
    mapOverviewRoutes
);


// =====================================================
// POSITIONS
// =====================================================

app.use(
    "/positions",
    positionRoutes
);


// =====================================================
// DASHBOARD
// =====================================================

app.use(
    "/dashboard",
    dashboardRoutes
);


// =====================================================
// DAMAGES
// =====================================================

app.use(
    "/damages",
    damageRoutes
);


// =====================================================
// COMPONENTS / STOCK
// =====================================================

app.use(
    "/components",
    componentRoutes
);


// =====================================================
// MOVEMENTS
// =====================================================

app.use(
    "/movements",
    movementRoutes
);


// =====================================================
// CONFIGURATION
// =====================================================

app.use(
    "/configuration",
    configurationRoutes
);


// =====================================================
// HISTORY
// =====================================================

app.use(
    "/history",
    historyRoutes
);


// =====================================================
// REPORTS
// =====================================================

app.use(
    "/reports",
    reportRoutes
);


// =====================================================
// INVENTORY PEOPLE
// =====================================================

app.use(
    "/inventory-people",
    inventoryPersonRoutes
);


app.use(
    "/stock-engine",
    stockEngineRoutes
);

app.use("/position-lots", positionLotsRoutes);


export default app;

