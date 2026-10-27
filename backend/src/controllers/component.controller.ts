import { Request, Response } from "express";

import {
    createComponent,
    getComponents,
    getComponentById,
    updateComponent,
    deleteComponent
} from "../services/component.service";


// ================================
// CREATE COMPONENT
// ================================

export async function create(
    req: Request,
    res: Response
) {

    try {

        const component = await createComponent(
            req.body
        );

        return res.status(201).json(
            component
        );

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            message: "Error creating component"
        });

    }

}


// ================================
// GET ALL COMPONENTS
// ================================

export async function list(
    req: Request,
    res: Response
) {

    try {

        const components = await getComponents();

        return res.status(200).json(
            components
        );

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            message: "Error loading components"
        });

    }

}


// ================================
// GET COMPONENT BY ID
// ================================

export async function getOne(
    req: Request,
    res: Response
) {

    try {

        const id = String(req.params.id);

        const component = await getComponentById(
            id
        );

        if (!component) {

            return res.status(404).json({
                message: "Component not found"
            });

        }

        return res.status(200).json(
            component
        );

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            message: "Error finding component"
        });

    }

}


// ================================
// UPDATE COMPONENT
// ================================

export async function update(
    req: Request,
    res: Response
) {

    try {

        const id = String(req.params.id);

        const component = await updateComponent(
            id,
            req.body
        );

        return res.status(200).json(
            component
        );

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            message: "Error updating component"
        });

    }

}


// ================================
// DELETE COMPONENT
// ================================

export async function remove(
    req: Request,
    res: Response
) {

    try {

        const id = String(req.params.id);

        await deleteComponent(
            id
        );

        return res.status(200).json({
            message: "Component deleted"
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            message: "Error deleting component"
        });

    }

}