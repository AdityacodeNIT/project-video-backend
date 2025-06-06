import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

const sellerSchema = new Schema(
        {
                username: {
                        type: String,
                        required: [true, "UserName is Required"],
                        unique: true,
                        lowercase: true,
                        trim: true,
                        index: true,
                },
                email: {
                        type: String,
                        required: true,
                        unique: true,
                        lowercase: true,
                        trim: true,
                },
                fullName: {
                        type: String,
                        required: true,
                        trim: true,
                        index: true,
                },
                coverImage: {
                        type: String, // cloudinary
                },
                avatar: {
                        type: String,
                        required: true, // Cloudnary
                },
                gstNumber: {
                    type: String,
                    required: true, // Cloudnary
            },
                password: {
                        type: String,
                        required: [true, "Password is required"],
                },
                refreshToken: {
                        type: String,
                        trim:true,
                },
                role: {
                        type: String,
                        enum: ["customer", "seller", "admin", "superadmin"],
                        default: "customer", // Default role
                    },

                approved: {
                        type:Boolean,
                        default:false
                }
                

        },
        { timestamp: true },
);

sellerSchema.pre("save", async function (next) {
        if (!this.isModified("password")) return next();

        this.password = await bcrypt.hash(this.password, 10);
        next();
});

sellerSchema.methods.isPasswordCorrect = async function (password) {
        return await bcrypt.compare(password, this.password);
};

sellerSchema.methods.generateAccessToken = function () {
        return jwt.sign(
                {
                        _id: this._id,
                        email: this.email,
                        username: this.username,
                        fullName: this.fullName,
                },
                process.env.ACCESS_TOKEN_SECRET,
                {
                        expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
                },
        );
};

sellerSchema.methods.generateRefreshToken = function () {
        return jwt.sign(
                {
                        _id: this._id,
                        email: this.email,
                },
                process.env.REFRESH_TOKEN_SECRET,
                
                {
                        expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
                },
        );
};

export const Seller = mongoose.model("Seller", sellerSchema);
