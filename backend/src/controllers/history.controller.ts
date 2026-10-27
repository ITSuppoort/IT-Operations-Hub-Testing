// =====================================================
// IT OPERATIONS HUB
// HISTORY CONTROLLER
// =====================================================

import { Request, Response } from "express";

import {
    getHistory,
    getHistoryByType,
    getRecentHistory
} from "../services/history.service";


// =====================================================
// GET COMPLETE HISTORY
// =====================================================

export async function list(
    req: Request,
    res: Response
) {

    try {

        const history =
            await getHistory();

        return res.json({
            message:
                "History loaded successfully",
            data: history
        });

    } catch (error) {

        console.error(
            "Error loading history:",
            error
        );

        return res
            .status(500)
            .json({
                message:
                    "Error loading history"
            });

    }

}


// =====================================================
// GET HISTORY BY TYPE
// =====================================================

export async function listByType(
    req: Request,
    res: Response
) {

    try {

        const type =
            String(req.params.type);

        const history =
            await getHistoryByType(
                type
            );

        return res.json({
            message:
                "History filtered successfully",
            data: history
        });

    } catch (error) {

        console.error(
            "Error loading filtered history:",
            error
        );

        return res
            .status(500)
            .json({
                message:
                    "Error loading filtered history"
            });

    }

}


// =====================================================
// GET RECENT HISTORY
// =====================================================

export async function recent(
    req: Request,
    res: Response
) {

    try {

        const requestedLimit =
            Number(req.query.limit);

        const limit =
            Number.isFinite(requestedLimit) &&
            requestedLimit > 0
                ? Math.min(
                    requestedLimit,
                    100
                )
                : 20;


        const history =
            await getRecentHistory(
                limit
            );


        return res.json({

            message:
                "Recent history loaded successfully",

            data: history

        });

    } catch (error) {

        console.error(
            "Error loading recent history:",
            error
        );

        return res
            .status(500)
            .json({
                message:
                    "Error loading recent history"
            });

    }

}