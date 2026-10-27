import { Request, Response } from "express";

import {
    getInventoryPeople,
    getInventoryPersonById,
    createInventoryPerson,
    updateInventoryPerson,
    updateInventoryPersonStatus
} from "../services/inventory-person.service";

export async function list(
    req: Request,
    res: Response
) {
    try {
        const people = await getInventoryPeople();

        return res.json(people);

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Error loading inventory people"
        });
    }
}

export async function getOne(
    req: Request,
    res: Response
) {
    try {
        const id = String(req.params.id);

        const person = await getInventoryPersonById(id);

        if (!person) {
            return res.status(404).json({
                message: "Inventory person not found"
            });
        }

        return res.json(person);

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Error loading inventory person"
        });
    }
}

export async function create(
    req: Request,
    res: Response
) {
    try {
        const {
            employeeId,
            firstName,
            lastName,
            email,
            phone,
            jobTitle,
            departmentId
        } = req.body;

        if (!employeeId || !firstName || !lastName) {
            return res.status(400).json({
                message: "employeeId, firstName and lastName are required"
            });
        }

        const person = await createInventoryPerson({
            employeeId,
            firstName,
            lastName,
            email,
            phone,
            jobTitle,
            departmentId
        });

        return res.status(201).json(person);

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message:
                error instanceof Error
                    ? error.message
                    : "Error creating inventory person"
        });
    }
}

export async function update(
    req: Request,
    res: Response
) {
    try {
        const id = String(req.params.id);

        const person = await updateInventoryPerson(
            id,
            req.body
        );

        return res.json(person);

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message:
                error instanceof Error
                    ? error.message
                    : "Error updating inventory person"
        });
    }
}

export async function updateStatus(
    req: Request,
    res: Response
) {
    try {
        const id = String(req.params.id);
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({
                message: "status is required"
            });
        }

        const person = await updateInventoryPersonStatus(
            id,
            status
        );

        return res.json(person);

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message:
                error instanceof Error
                    ? error.message
                    : "Error updating inventory person status"
        });
    }
}