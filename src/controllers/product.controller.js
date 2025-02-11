import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Product } from "../models/product.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const addProduct = asyncHandler(async (req, res) => {
        const {
                name,
                price,
                description,
                Category,
                stocks,
                length,
                breadth,
                height,
                weight,
        } = req.body;

        if ([name, price].some((feild) => feild.trim === "")) {
                throw new ApiError(401, "all feilds are comlusory");
        }
        const existedProduct = await Product.findOne({
                $or: [{ name }],
        });
        if (existedProduct) {
                throw new ApiError(409, "Product Already exist");
        }

        // local path from multer
        const ProductImagelocalPath = req.file?.path;

        if (!ProductImagelocalPath) {
                throw new ApiError(400, "product Image is required");
        }

        // Url from the cloudinary
        const ProductImage = await uploadOnCloudinary(ProductImagelocalPath);
        if (!ProductImage) {
                throw new ApiError(400, "Product is needed");
        }
        const product = await Product.create({
                name,
                price,
                description,
                Category,
                ProductImage: ProductImage.url,
                stocks,
                length,
                breadth,
                height,
                weight,
        });
        return res
                .status(201)
                .json(
                        new ApiResponse(
                                200,
                                product,
                                "Product added  succesfully",
                        ),
                );
});

const searchresult = asyncHandler(async (req, res) => {
        const { name } = req.body;

        const result = await Product.aggregate([
                {
                        $match: {
                                name: { 
                                        $regex: name,
                                        $options: "i",
                                        
                                },
                        },
                },
        ]);

        return res.json({ result });
});

const getProduct = asyncHandler(async (req, res) => {
        const product = await Product.find();

        if (!product) {
                throw new ApiError(404, "Product does not found ");
        } else {
                res.json(product);
        }
});

const FillingProduct = asyncHandler(async (req, res) => {
        const product = await Product.find({ Category: "Filling" });

        if (!product) {
                throw new ApiError(404, "Product does not found ");
        } else {
                res.json(product);
        }
});
const ReusableProduct = asyncHandler(async (req, res) => {
        const product = await Product.find({ Category: "Reusable" });

        if (!product) {
                throw new ApiError(404, "Product does not found ");
        } else {
                res.json(product);
        }
});
const WritingProduct = asyncHandler(async (req, res) => {
        const product = await Product.find({ Category: "Writing" });

        if (!product) {
                throw new ApiError(404, "Product does not found ");
        } else {
                res.json(product);
        }
});
const PaperProduct = asyncHandler(async (req, res) => {
        const product = await Product.find({ Category: "Paper" });

        if (!product) {
                throw new ApiError(404, "Product does not found ");
        } else {
                res.json(product);
        }
});

const DeskSupplies = asyncHandler(async (req, res) => {
        const product = await Product.find({ Category: "DeskSupplies" });

        if (!product) {
                throw new ApiError(404, "Product does not found ");
        } else {
                res.json(product);
        }
});

const getTrendingProduct=asyncHandler(async(req,res)=>{
        const products = await Product.aggregate([
                { $sort: { bought: -1 } },  
                { $limit: 5 }              
              ]);
              if (!products) {
                throw new ApiError(404, "Product does not found ");
        } else {
                res.json(products);
        }
})

export {
        getTrendingProduct,
        addProduct,
        WritingProduct,
        DeskSupplies,
        PaperProduct,
        FillingProduct,
        ReusableProduct,
        getProduct,
        searchresult,
};
