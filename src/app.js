import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(
        cors({
                origin: process.env.CORS_ORIGIN.split(","),
                credentials: true,
                // the credentails are set to true so that we can send cookies , berer token and others with cors.
        }),
);

app.use(express.json({ limit: "2mb" }));

app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.use(express.static("public"));
app.use(cookieParser());

//routes
import userRouter from "./routes/user.routes.js";
import productRouter from "./routes/product.routes.js";
import addressRouter from "./routes/address.routes.js";
import paymentRouter from "./routes/payment.routes.js";
import orderRouter from "./routes/order.routes.js";
import Reviewrouter from "./routes/review.routes.js";
import WishListRouter from "./routes/wishlist.routes.js";
import adminRouter from "./routes/admin.routes.js";
import shiprouter from "./routes/shiprocket.routes.js";

//routes Decleration
app.use("/api/v1/users", userRouter);
app.use("/api/v1/product", productRouter);
app.use("/api/v1/address", addressRouter);
app.use("/api/v2/payments", paymentRouter);
app.use("/api/v2/order", orderRouter);
app.use("/api/v2/feedback", Reviewrouter);
app.use("/api/v2/wishlist", WishListRouter);
app.use("/api/v2/admin", adminRouter);
app.use("/shiprocket", shiprouter);

app.get("/api/getKey", (req, res) =>
        res.status(200).json({ key: process.env.RAZORPAY_API_KEY }),
);
export { app };
