import { Request, Response } from "express";

import {
    createPosition,
    generatePositions,
    getPositions,
    getPositionById,
    updatePosition,
    deletePosition
} from "../services/position.service";


// =====================================================
// CREATE POSITION
// =====================================================

export async function create(
    req: Request,
    res: Response
) {

    try {

        const position = await createPosition(
            req.body
        );

        return res.status(201).json(position);

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            message: "Error creating position"
        });

    }

}


// =====================================================
// GENERATE MULTIPLE POSITIONS
// =====================================================

export async function generate(
    req: Request,
    res: Response
) {

    try {

        const positions = await generatePositions({

            locationId:
                String(req.body.locationId),

            areaId:
                String(req.body.areaId),

            prefix:
                String(req.body.prefix),

            quantity:
                Number(req.body.quantity),

            startNumber:
                req.body.startNumber !== undefined
                    ? Number(req.body.startNumber)
                    : undefined,

            wing:
                req.body.wing
                    ? String(req.body.wing)
                    : undefined

        });


        return res.status(201).json({

            message:
                "Positions generated successfully",

            count:
                positions.length,

            positions

        });

    } catch (error) {

        console.error(error);


        const message =
            error instanceof Error
                ? error.message
                : "Error generating positions";


        return res.status(400).json({

            message

        });

    }

}


// =====================================================
// GET ALL POSITIONS
// =====================================================

export async function list(
    req: Request,
    res: Response
) {

    try {

        const positions =
            await getPositions();

        return res.json(
            positions
        );

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            message: "Error loading positions"
        });

    }

}


// =====================================================
// GET POSITION BY ID
// =====================================================

export async function getOne(
    req: Request,
    res: Response
) {

    try {

        const id =
            String(req.params.id);


        const position =
            await getPositionById(
                id
            );


        if (!position) {

            return res.status(404).json({

                message:
                    "Position not found"

            });

        }


        return res.json(
            position
        );

    } catch (error) {

        console.error(error);

        return res.status(500).json({

            message:
                "Error loading position"

        });

    }

}


// =====================================================
// UPDATE POSITION
// =====================================================

export async function update(
    req: Request,
    res: Response
) {

    try {

        const id =
            String(req.params.id);


        const position =
            await updatePosition(

                id,

                req.body

            );


        return res.json(
            position
        );

    } catch (error) {

        console.error(error);

        return res.status(500).json({

            message:
                "Error updating position"

        });

    }

}


// =====================================================
// DELETE POSITION
// =====================================================

export async function remove(
    req: Request,
    res: Response
) {

    try {

        const id =
            String(req.params.id);


        await deletePosition(
            id
        );


        return res.json({

            message:
                "Position deleted"

        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({

            message:
                "Error deleting position"

        });

    }

}