import { json } from "express";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
const userSchema = new mongoose.Schema({
        fullname : {
        type : String,
        require : true,
        },
        mobile: {
            type : String,
            require : true ,
            validate : {
                validator : function(v){
                    return /^\d{10}$/.test(v);
                },
                message : "enter the correct phone number"
            },
            },
        email:{
            type : String ,
            lowercase : true,
        },
        password :{
            type: String ,
            required : [ true , "password must be required"],
        },
        balance : {
            type : Number ,
            default: 0,
        },
        status : {
            type : String ,
            enum : ["active", "suspended"],
            default : "active"
        },
        refreshToken :{
            type : String,
            
        },
        avatar : {
            type : String,
        },
        lastLogin : {
            type : Date,
            default : Date.now
        },
},
{timestamps : true})

userSchema.pre("save", async function (next){ 
    if ( !this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password , 10);
    next();
})

userSchema.methods.isPasswordCorrect = async function (password) 
{
 return await bcrypt.compare(password , this.password)   
}
userSchema.methods.generateAccessToken = function(){
            jwt.sign({
                _id : this._id,
                mobile  : this.mobile,
            },process.env.ACCESS_TOKEN_SECRET,{
                expiresIn : process.env.ACCESS_TOKEN_EXPIRY
            }
        )
}
userSchema.methods.generateRefreshToken = function(){jwt.sign({
    _id : this._id,
    mobile  : this.mobile,
},process.env.REFRESH_TOKEN_SECRET,{
    expiresIn : process.env.REFRESH_TOKEN_EXPIRY
})}


const User = mongoose.model("User",userSchema)
export default User;