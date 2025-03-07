import mongoose from "mongoose";
const BetTranscationSchema = new mongoose.Schema({
    userId :{
        type : mongoose.Schema.Types.ObjectId,
        ref : "User",
        required :true,
        index: true,
    },
    matchId :{
        type: mongoose.Schema.Types.ObjectId,
        ref : "MatchDetails",
        required : true,
        index: true,
    },
    odds: {
        type : Number,
        required : true,
    },
    amount : {
        type : Number,
        required : true,
    },
    betType : {
        type : String ,
        enum :["win", "lose","draw","custom"],
        required : true ,
    },
    status :{
        type : String,
        enum:["pending", "won","lost","cancelled"],
        default : "pending",
    },
    selectedTeam: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "TeamDetail",
        required: true,
    },
    potentialWinning: {
        type: Number,
        required: true,
    },
    transcationId: {
        type: String,
        unique: true,
        required: true,
    },
    createdAt : {
        type : Date,
        default: Date.now
    },
    timetamp:{
        type : String,
        default : ()=> new Date().toLocaleDateString("en-US", {timeZone: "Asia/Kolkata"})
    }
}
)

BetTranscationSchema.index({ userId: 1, matchId: 1 });

const BetTransaction = mongoose.model("BetTransaction" , BetTranscationSchema)

export default BetTransaction;