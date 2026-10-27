import { Router } from "express";
import prisma from "../config/prisma";

import {
    list,
    getOne,
    create,
    update,
    updateStatus
} from "../controllers/inventory-person.controller";

const router = Router();

router.get("/", list);

router.get("/departments", async (_req, res) => {
  try {
    const departments = await prisma.department.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    res.json(departments);
  } catch (error) {
    console.error("Department list failure", error);
    res.status(500).json({ message: "No se pudieron consultar los departamentos" });
  }
});

router.get("/:id", getOne);

router.post("/", create);

router.put("/:id", update);

router.patch("/:id/status", updateStatus);

export default router;