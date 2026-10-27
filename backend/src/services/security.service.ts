import prisma from "../config/prisma";


export async function createSecurityLog(
    userId:string,
    action:string,
    ipAddress?:string
){

    return await prisma.securityLog.create({

        data:{
            userId,
            action,
            ipAddress
        }

    });

}