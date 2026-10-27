import { Request, Response } from "express";

import {
    getEquipmentReport,
    getComponentReport,
    getDamageReport,
    getMovementReport,
    getPositionReport,
    getGeneralReport
} from "../services/report.service";


// =====================================================
// GENERAL REPORT
// =====================================================

export async function general(
    req: Request,
    res: Response
) {

    try {

        const report =
            await getGeneralReport();


        return res.json(report);

    } catch (error) {

        console.error(error);

        return res.status(500).json({

            message:
                "Error loading general report"

        });

    }

}


// =====================================================
// EQUIPMENT REPORT
// =====================================================

export async function equipment(
    req: Request,
    res: Response
) {

    try {

        const report =
            await getEquipmentReport();


        return res.json(report);

    } catch (error) {

        console.error(error);

        return res.status(500).json({

            message:
                "Error loading equipment report"

        });

    }

}


// =====================================================
// COMPONENT REPORT
// =====================================================

export async function components(
    req: Request,
    res: Response
) {

    try {

        const report =
            await getComponentReport();


        return res.json(report);

    } catch (error) {

        console.error(error);

        return res.status(500).json({

            message:
                "Error loading component report"

        });

    }

}


// =====================================================
// DAMAGE REPORT
// =====================================================

export async function damages(
    req: Request,
    res: Response
) {

    try {

        const report =
            await getDamageReport();


        return res.json(report);

    } catch (error) {

        console.error(error);

        return res.status(500).json({

            message:
                "Error loading damage report"

        });

    }

}


// =====================================================
// MOVEMENT REPORT
// =====================================================

export async function movements(
    req: Request,
    res: Response
) {

    try {

        const report =
            await getMovementReport();


        return res.json(report);

    } catch (error) {

        console.error(error);

        return res.status(500).json({

            message:
                "Error loading movement report"

        });

    }

}


// =====================================================
// POSITION REPORT
// =====================================================

export async function positions(
    req: Request,
    res: Response
) {

    try {

        const report =
            await getPositionReport();


        return res.json(report);

    } catch (error) {

        console.error(error);

        return res.status(500).json({

            message:
                "Error loading position report"

        });

    }

}