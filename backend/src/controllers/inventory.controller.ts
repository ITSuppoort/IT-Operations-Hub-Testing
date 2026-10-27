import { Request, Response } from "express";

import {
    createInventoryEntry,
    createInventoryExit,
    createInventoryAdjustment,
    getInventoryMovements,
    getComponentInventoryHistory,
    getLowStockComponents
} from "../services/inventory.service";


// =====================================================
// INVENTORY ENTRY
// =====================================================

export async function entry(
    req: Request,
    res: Response
) {

    try {

        const {
            componentId,
            quantity,
            reason,
            createdBy
        } = req.body;


        const result =
            await createInventoryEntry(
                componentId,
                Number(quantity),
                reason,
                createdBy
            );


        return res.status(201).json(result);

    } catch (error) {

        console.error(error);

        return res.status(500).json({

            message:
                error instanceof Error
                    ? error.message
                    : "Error creating inventory entry"

        });

    }

}


// =====================================================
// INVENTORY EXIT
// =====================================================

export async function exit(
    req: Request,
    res: Response
) {

    try {

        const {
            componentId,
            quantity,
            reason,
            createdBy
        } = req.body;


        const result =
            await createInventoryExit(
                componentId,
                Number(quantity),
                reason,
                createdBy
            );


        return res.status(201).json(result);

    } catch (error) {

        console.error(error);

        return res.status(500).json({

            message:
                error instanceof Error
                    ? error.message
                    : "Error creating inventory exit"

        });

    }

}


// =====================================================
// INVENTORY ADJUSTMENT
// =====================================================

export async function adjustment(
    req: Request,
    res: Response
) {

    try {

        const {
            componentId,
            newQuantity,
            reason,
            createdBy
        } = req.body;


        const result =
            await createInventoryAdjustment(
                componentId,
                Number(newQuantity),
                reason,
                createdBy
            );


        return res.status(201).json(result);

    } catch (error) {

        console.error(error);

        return res.status(500).json({

            message:
                error instanceof Error
                    ? error.message
                    : "Error creating inventory adjustment"

        });

    }

}


// =====================================================
// GET INVENTORY MOVEMENTS
// =====================================================

export async function movements(
    req: Request,
    res: Response
) {

    try {

        const result =
            await getInventoryMovements();


        return res.json(result);

    } catch (error) {

        console.error(error);

        return res.status(500).json({

            message:
                "Error loading inventory movements"

        });

    }

}


// =====================================================
// GET COMPONENT HISTORY
// =====================================================

export async function history(
    req: Request,
    res: Response
) {

    try {

        const componentId =
            String(req.params.id);


        const result =
            await getComponentInventoryHistory(
                componentId
            );


        return res.json(result);

    } catch (error) {

        console.error(error);

        return res.status(500).json({

            message:
                "Error loading inventory history"

        });

    }

}


// =====================================================
// GET LOW STOCK
// =====================================================

export async function lowStock(
    req: Request,
    res: Response
) {

    try {

        const result =
            await getLowStockComponents();


        return res.json(result);

    } catch (error) {

        console.error(error);

        return res.status(500).json({

            message:
                "Error loading low stock components"

        });

    }

}