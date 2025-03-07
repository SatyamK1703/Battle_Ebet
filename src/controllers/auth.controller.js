import  User  from "../models/User.model.js";
import  ApiError  from "../utils/ApiError.js";
import ApiResponse  from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import uploadOnCloudinary from "../utils/cloudinary.js";

const generateAccessAndRefreshTokens = async(userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating tokens");
    }
}

const registerUser = asyncHandler(async (req, res) => {
    // get user details
    const {fullname, email, mobile, password} = req.body

    // validation - check if required fields are empty
    if ([fullname, mobile, password].some((field) => 
        field?.toString().trim() === "")) {
        throw new ApiError(400, "Fill all required fields")
    }

    // validate email if provided
    if (email && !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        throw new ApiError(400, "Invalid email format")
    }

    // validate mobile number
    if (isNaN(mobile) || mobile.toString().length !== 10) {
        throw new ApiError(400, "Invalid mobile number")
    }

    // check if user already exists
    const existedUser = await User.findOne({
        $or: [
            { mobile: mobile },
            ...(email ? [{ email: email }] : [])
        ]
    })
    
    if (existedUser) {
        throw new ApiError(409, "User with mobile number or email already exists")
    }

    // Handle avatar upload
    let avatarImage = null
    const avatarLocalPath = req.files?.avatar?.[0]?.path
    
    if (avatarLocalPath) {
        try {
            avatarImage = await uploadOnCloudinary(avatarLocalPath)
            if (!avatarImage) {
                throw new ApiError(400, "Error while uploading avatar")
            }
        } catch (error) {
            throw new ApiError(400, "Error while uploading avatar: " + error.message)
        }
    }

    // Create user
    try {
        const user = await User.create({
            fullname,
            avatar: avatarImage?.url || "",
            mobile,
            email,
            password
        })

        const createdUser = await User.findById(user._id).select("-password -refreshToken")

        if (!createdUser) {
            throw new ApiError(500, "Something went wrong while creating user")
        }

        return res.status(201).json(
            new ApiResponse(201, createdUser, "User registered successfully")
        )

    } catch (error) {
        throw new ApiError(400, "Error creating user: " + error.message)
    }
})

const loginUser = asyncHandler(async (req, res) => {
    try {
        const { mobile, password } = req.body;

    const user = await User.findOne({ mobile });

    if (!user) {
        throw new ApiError(404, "User does not exist");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid credentials");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");
    res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: true
    });
    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: true
    });
    const options = {
        httpOnly: true,
        secure: true
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: {
                        _id: loggedInUser._id,
                        fullname: loggedInUser.fullname,
                        mobile: loggedInUser.mobile,
                        email: loggedInUser.email,
                        balance: loggedInUser.balance
                    }
                },
                "User logged in successfully"
            )
        );
    } catch (error) {
        throw new ApiError(400, "Error logging in: " + error.message)
    }
});

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    );

    const options = {
        httpOnly: true,
        secure: true
    };

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request");
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );

        const user = await User.findById(decodedToken?._id);

        if (!user) {
            throw new ApiError(401, "Invalid refresh token");
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used");
        }

        const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

        const options = {
            httpOnly: true,
            secure: true
        };

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken },
                    "Access token refreshed"
                )
            );
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token");
    }
});

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken
}; 