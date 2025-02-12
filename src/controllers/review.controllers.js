import { ObjectId } from "mongodb"; // Ensure ObjectId is imported
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Review } from "../models/review.models.js";
import { ApiResponse } from "../utils/ApiResponse.js";

// Function to add a review
const review = asyncHandler(async (req, res) => {
        const { rating, productId, message } = req.body;
        // Add new review
        const reviews = await Review.create({ rating, productId, message });

        // Return the created review and the total count of reviews
        return res.status(201).json(new ApiResponse(200, reviews));
});

const averageReview = asyncHandler(async (req, res) => {
        const { productId } = req.body;
        // Convert productId to ObjectId
        const objectId = new ObjectId(productId);
        // Aggregation to calculate the average rating for the product
        const result = await Review.aggregate([
                {
                        $match: { productId: objectId },
                },
                {
                        $group: {
                                _id: "$productId",
                                averageRating: { $avg: "$rating" },
                                count: { $sum: 1 },
                        },
                },
        ]);
        // Return the average rating and the total count
        const averageRating = result.length > 0 ? result[0].averageRating : 0;
        const count = result.length > 0 ? result[0].count : 0;
        return res.json({ averageRating, count });
});

export { review, averageReview };
