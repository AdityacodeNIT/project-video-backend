import express from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
        createOrderController,
        getAllOrdersController,
        getOrder,
} from "../controllers/shipRocket.controllers.js";

const shiprouter = express.Router();

// Route to create an order
shiprouter.post("/order", verifyJWT, createOrderController);

shiprouter.get("/getOrder", verifyJWT, getAllOrdersController);

shiprouter.get("/getOrder/:id", verifyJWT, getOrder);

export default shiprouter;
