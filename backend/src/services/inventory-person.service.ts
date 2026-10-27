import prisma from "../config/prisma";

export async function getInventoryPeople() {
    return await prisma.inventoryPerson.findMany({
        orderBy: [
            { firstName: "asc" },
            { lastName: "asc" }
        ],
        include: {
            department: true,
            position: true,
            equipment: true
        }
    });
}

export async function getInventoryPersonById(id: string) {
    return await prisma.inventoryPerson.findUnique({
        where: { id },
        include: {
            department: true,
            position: true,
            equipment: true
        }
    });
}

export async function createInventoryPerson(data: {
    employeeId: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    jobTitle?: string;
    departmentId?: string;
}) {
    return await prisma.inventoryPerson.create({
        data: {
            employeeId: data.employeeId,
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email || null,
            phone: data.phone || null,
            jobTitle: data.jobTitle || null,
            departmentId: data.departmentId || null
        },
        include: {
            department: true,
            position: true,
            equipment: true
        }
    });
}

export async function updateInventoryPerson(
    id: string,
    data: {
        employeeId?: string;
        firstName?: string;
        lastName?: string;
        email?: string | null;
        phone?: string | null;
        jobTitle?: string | null;
        departmentId?: string | null;
    }
) {
    return await prisma.inventoryPerson.update({
        where: { id },
        data,
        include: {
            department: true,
            position: true,
            equipment: true
        }
    });
}

export async function updateInventoryPersonStatus(
    id: string,
    status: string
) {
    return await prisma.inventoryPerson.update({
        where: { id },
        data: { status },
        include: {
            department: true,
            position: true,
            equipment: true
        }
    });
}