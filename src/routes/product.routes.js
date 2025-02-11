import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import {
        addProduct,
        WritingProduct,
        ReusableProduct,
        FillingProduct,
        PaperProduct,
        DeskSupplies,
        getTrendingProduct,
        getProduct,
        searchresult,
} from "../controllers/product.controller.js";

const router = Router();

router.route("/addProduct").post(
        upload.single("ProductImage"),

        addProduct,
);
router.route("/WritingProduct").get(WritingProduct);
router.route("/PaperProduct").get(PaperProduct);
router.route("/ReusableProduct").get(ReusableProduct);
router.route("/FillingProduct").get(FillingProduct);
router.route("/DeskSupplies").get(DeskSupplies);
router.route("/getProduct").get(getProduct);
router.route("/getTrendingProduct").get(getTrendingProduct);

router.route("/searchProduct").post(searchresult);

export default router;
