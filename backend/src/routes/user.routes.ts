import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";


const router = Router();



router.get(
    "/profile",
    authenticate,
    async (req:any,res)=>{

        res.json({

            message:"Profile access granted",

            user:req.user

        });

    }
);



export default router;