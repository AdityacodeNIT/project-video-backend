import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import Jwt from "jsonwebtoken";
import redis from "../utils/redisClients.js";

const generateAccessAndRefreshToken = async (userId) => {
        try {
                const user = await User.findById(userId);
                if (!user) throw new ApiError(404, "User not found");

                const accessToken = user.generateAccessToken();
                const refreshToken = user.generateRefreshToken();

                // Store new refresh token
                user.refreshToken = refreshToken;
                await user.save({ validateBeforeSave: false });

                return { accessToken, refreshToken };
        } catch (error) {
                console.error("Error generating tokens:", error);
                throw new ApiError(500, "Error generating tokens");
        }
};

// registering user
const registerUser = asyncHandler(async (req, res) => {
        // Get user details from frontend
        const { fullName, email, username, password } = req.body;

        // Check for missing fields
        if (
                [fullName, email, username, password].some(
                        (field) => field?.trim() === "",
                )
        ) {
                throw new ApiError(400, "All fields are required");
        }

        const existedUser = await User.findOne({
                $or: [{ username }, { email }],
        });

        if (existedUser) {
                throw new ApiError(
                        409,
                        "User with email or username already exists",
                );
        }

        const avatarlocalPath = req.files?.avatar?.[0]?.path;
        let coverImageLocalPath;

        // Handle cover image if provided
        if (
                req.files &&
                Array.isArray(req.files.coverImage) &&
                req.files.coverImage.length > 0
        ) {
                coverImageLocalPath = req.files.coverImage[0]?.path;
        }

        if (!avatarlocalPath) {
                throw new ApiError(400, "Avatar file is required");
        }

        let avatar;
        try {
                avatar = await uploadOnCloudinary(avatarlocalPath);
        } catch (error) {
                console.error("Error uploading avatar:", error);
                throw new ApiError(500, "Error uploading avatar");
        }

        let coverImage;
        if (coverImageLocalPath) {
                try {
                        coverImage =
                                await uploadOnCloudinary(coverImageLocalPath);
                } catch (error) {
                        console.error("Error uploading cover image:", error);
                        throw new ApiError(500, "Error uploading cover image");
                }
        }

        // Create user in the database
        let user;
        try {
                user = await User.create({
                        fullName,
                        avatar: avatar.url,
                        coverImage: coverImage?.url || "",
                        email,
                        password,
                        username: username.toLowerCase(),
                });
        } catch (error) {
                console.error("Error creating user in DB:", error);
                throw new ApiError(500, "Error creating user in database");
        }

        // Retrieve the created user without password and refresh token fields
        const createdUser = await User.findById(user._id).select(
                "-password -refreshToken",
        );

        if (!createdUser) {
                throw new ApiError(
                        500,
                        "User created but could not be retrieved",
                );
        }

        return res
                .status(201)
                .json(
                        new ApiResponse(
                                200,
                                createdUser,
                                "Registered successfully",
                        ),
                );
});

const loginUser = asyncHandler(async (req, res) => {
        const { email, username, password } = req.body;

        if (!username && !email) {
                throw new ApiError(400, "username or email is required");
        }

        const user = await User.findOne({
                $or: [{ username }, { email }],
        });

        if (!user) {
                throw new ApiError(404, "User does not exist");
        }

        const isPasswordValid = await user.isPasswordCorrect(password);

        if (!isPasswordValid) {
                throw new ApiError(401, "Invalid user credentials");
        }

        const { accessToken, refreshToken } =
                await generateAccessAndRefreshToken(user._id);

        const loggedInUser = await User.findById(user._id).select("-password ");

        const options = {
                httpOnly: true,
                secure: true,
                sameSite: "None",
        };

        return res

                .status(200)
                .cookie("refreshToken", refreshToken, options)
                .cookie("accessToken", accessToken, options)

                .json(
                        new ApiResponse(
                                200,
                                {
                                        user: loggedInUser,
                                },
                                "User logged In Successfully",
                        ),
                );
});

const logOutUser = asyncHandler(async (req, res) => {
        const accessToken = req.cookies?.accessToken;
        const refreshToken = req.cookies?.refreshToken;

        if (!req.user) {
                return res
                        .status(401)
                        .json(new ApiResponse(401, {}, "Unauthorized"));
        }

        if (accessToken) {
                const decoded = Jwt.decode(accessToken);
                if (decoded?.exp) {
                        const expiresIn =
                                decoded.exp - Math.floor(Date.now() / 1000);
                        await redis.set(
                                `bl_${accessToken}`,
                                "1",
                                "EX",
                                expiresIn,
                        );
                }
        }

        // Remove refreshToken from DB
        await User.findByIdAndUpdate(
                req.user._id,
                { $unset: { refreshToken: 1 } },
                { new: true },
        );

        // Clear cookies
        const cookieOptions = {
                httpOnly: true,
                secure: true,
                sameSite: "None",
        };

        res.clearCookie("accessToken", cookieOptions)
                .clearCookie("refreshToken", cookieOptions)
                .status(200)
                .json(new ApiResponse(200, {}, "User Logged Out Successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
        const incomingrefreshToken = req.cookies.refreshToken;
        if (!incomingrefreshToken) {
                throw new ApiError(401, "Unauthorized Request");
        }

        try {
                const decodedToken = Jwt.verify(
                        incomingrefreshToken,
                        process.env.REFRESH_TOKEN_SECRET,
                );

                const user = await User.findById(decodedToken?._id);
                if (!user) {
                        throw new ApiError(401, "Invalid refresh token");
                }

                if (incomingrefreshToken !== user.refreshToken) {
                        throw new ApiError(
                                401,
                                "Refresh token is expired or does not match",
                        );
                }

                const currentAccessToken = req.cookies.accessToken;

                try {
                        Jwt.verify(
                                currentAccessToken,
                                process.env.ACCESS_TOKEN_SECRET,
                        ); // Try to verify it

                        return res
                                .status(200)
                                .json(
                                        new ApiResponse(
                                                200,
                                                "Access token is still valid",
                                        ),
                                );
                        // Generate new tokens
                } catch {
                        const { accessToken } =
                                await user.generateAccessToken();

                        const options = {
                                httpOnly: true,
                                secure: true,
                                // secure: process.env.NODE_VAR=="production",
                                sameSite: "None",
                        };

                        return res
                                .status(200)
                                .cookie("accessToken", accessToken, options)

                                .json(
                                        new ApiResponse(
                                                200,
                                                { accessToken },
                                                "Tokens refreshed successfully",
                                        ),
                                );
                }
        } catch (error) {
                console.error("Error during token refresh:", error);

                if (error.name === "TokenExpiredError") {
                        throw new ApiError(
                                401,
                                "Refresh token expired. Please log in again.",
                        );
                }

                throw new ApiError(
                        401,
                        error.message || "Invalid refresh token",
                );
        }
});

const changePassword = asyncHandler(async (req, res) => {
        const { currentPassword, newPassword, confirmPassword } = req.body;

        if (!(confirmPassword === newPassword)) {
                throw new ApiError(404, "password not matching");
        }

        const user = await User.findById(req.user?.id);
        const isPasswordCorrect = await user.isPasswordCorrect(currentPassword);

        if (!isPasswordCorrect) {
                throw new ApiError(400, "Invalid Password");
        }

        user.password = newPassword;

        await user.save({ validateBeforeSave: false });

        return res
                .status(200)
                .json(new ApiResponse(200, {}, "password changed succesfully"));
});


const getCurrentUser = asyncHandler(async (req, res) => {
        return res
                .status(200)
                .json(
                        new ApiResponse(
                                200,
                                req.user,
                                "current user fetched succesfully",
                        ),
                );
});

const updateAccountdetail = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body;

    if (!(fullName || email)) {
        throw new ApiError(400, "All fields are required");
    }

    const userId = req.user?._id;
    if (!userId) {
        throw new ApiError(401, "Unauthorized - user not found in request");
    }

    // First, update the user
    await User.findByIdAndUpdate(
        userId,
        {
            $set: { fullName, email }
        },
        { new: true, runValidators: true }
    );

    // Now fetch the updated user properly
    const updatedUser = await User.findById(userId).select("-password");

    if (!updatedUser) {
        throw new ApiError(404, "User not found");
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            updatedUser,
            "Account details updated successfully"
        )
    );
});


const updateUserAvatar = asyncHandler(async (req, res) => {
        const avatarLocalPath = req.files?.path;
        if (!avatarLocalPath) {
                throw new ApiError(400, "Avatar File is missing");
        }
        const avatar = await uploadOnCloudinary(avatarLocalPath);

        if (!avatar.url) {
                throw new ApiError(400, "error while uploading");
        }
        const currentUser = await User.findById(req.user?._id).select(
                "-password",
        );

        if (currentUser && currentUser.avatar) {
                await deleteFromCloudinary(currentUser.avatar);
        }

        const updateuser = await User.findByIdAndUpdate(
                req.user?._id,
                {
                        $set: { avatar: avatar.url },
                },
                { new: true },
        ).select("-password");

        return res
                .status(200)
                .json(
                        new ApiResponse(
                                200,
                                updateuser,
                                "image updated succesfully",
                        ),
                );
});
export {
        registerUser,
        loginUser,
        logOutUser,
        refreshAccessToken,
        getCurrentUser,
        changePassword,
        updateAccountdetail,
        updateUserAvatar,
};
