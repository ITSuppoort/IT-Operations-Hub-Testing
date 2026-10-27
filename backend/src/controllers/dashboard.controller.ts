import {
    Request,
    Response
} from "express";

import {
    getDashboardSummary
} from "../services/dashboard.service";


// ======================================================
// GET DASHBOARD
// ======================================================

export async function getDashboard(
    req: Request,
    res: Response
) {

    try {

        const dashboard =
            await getDashboardSummary();


        return res.status(200).json({

            message:
                "Dashboard data loaded successfully",

            data:
                dashboard

        });

    } catch (error) {

        console.error(
            "Dashboard error:",
            error
        );


        return res.status(500).json({

            message:
                "Error loading dashboard"

        });

    }

}