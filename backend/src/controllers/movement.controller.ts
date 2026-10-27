import { Request, Response } from "express";

import {
    createMovement,
    getMovements,
    getMovementById,
    deleteMovement
} from "../services/movement.service";


// ================================
// CREATE
// ================================

export async function create(
    req: Request,
    res: Response
) {

    try {

        const movement = await createMovement(
            req.body
        );

        return res.status(201).json(
            movement
        );

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            message: "Error creating movement"
        });

    }

}


// ================================
// GET ALL
// ================================

export async function list(
    req: Request,
    res: Response
) {

    try {

        const movements = await getMovements();

        return res.status(200).json(
            movements
        );

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            message: "Error loading movements"
        });

    }

}


// ================================
// GET ONE
// ================================

export async function getOne(
    req: Request,
    res: Response
) {

    try {

        const id = String(req.params.id);

        const movement = await getMovementById(
            id
        );

        if (!movement) {

            return res.status(404).json({
                message: "Movement not found"
            });

        }

        return res.status(200).json(
            movement
        );

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            message: "Error finding movement"
        });

    }

}


// ================================
// DELETE
// ================================

export async function remove(
    req: Request,
    res: Response
) {

    try {

        const id = String(req.params.id);

        await deleteMovement(
            id
        );

        return res.status(200).json({
            message: "Movement deleted"
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            message: "Error deleting movement"
        });

    }

}