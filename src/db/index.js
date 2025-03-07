import mongoose from "mongoose";
import { DB_NAME } from "../constant.js";


const connectDB = async()=>{
    try {
        const connectstring = `${process.env.MONGO_URI}/${DB_NAME}`;
        const connectionInstance = await mongoose.connect(connectstring)
        console.log("MongoDB connect");
    }catch(err){
        console.log("mongodb connection error : ",err);
    }
}
export default connectDB

