import { Request, Response } from "express";

import {
    getMapOverview,
    getMapSummary
} from "../services/map-overview.service";


// =====================================================
// GET COMPLETE MAP OVERVIEW
// =====================================================
//
// Devuelve:
//
// Locations
//     ↓
// Areas
//     ↓
// Positions
//     ↓
// Equipment
//     ↓
// Assigned User
//
// =====================================================

export async function overview(
    req: Request,
    res: Response
) {

    try {

        const map =
            await getMapOverview();


        return res.json({

            message:
                "Map overview loaded successfully",

            data:
                map

        });

    } catch (error) {

        console.error(
            "MAP OVERVIEW ERROR:",
            error
        );


        return res.status(500).json({

            message:
                "Error loading map overview"

        });

    }

}


// =====================================================
// GET MAP SUMMARY
// =====================================================
//
// Devuelve los números generales:
//
// locations
// areas
// positions
// occupiedPositions
// emptyPositions
// equipmentAssigned
//
// =====================================================

export async function summary(
    req: Request,
    res: Response
) {

    try {

        const mapSummary =
            await getMapSummary();


        return res.json({

            message:
                "Map summary loaded successfully",

            data:
                mapSummary

        });

    } catch (error) {

        console.error(
            "MAP SUMMARY ERROR:",
            error
        );


        return res.status(500).json({

            message:
                "Error loading map summary"

        });

    }

}