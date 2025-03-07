import mongoose from "mongoose";

const MatchSchema = new mongoose.Schema({
    matchId: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: "TournamentDetails",
        required: true,
    },
    matchNumber:{
        type: Number,
    },
    map: {
        type: String,
        required: true,
        enum: ['Erangel', 'Miramar', 'Sanhok', 'Vikendi', 'Karakin','Livik','TDM']
    },
    teams: [{
        teamId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'TeamDetail',
            required: true,
        },
        position: {
            type: Number,
            required: true,
            default: 0
        },
        killPoints: {
            type: Number,
            default: 0
        },
        placementPoints: {
            type: Number,
            default: 0
        },
        totalPoints: {
            type: Number,
            default: 0
        },       
    
    }], 
    status: {
        type: String,
        enum: ['scheduled', 'ongoing', 'completed'],
        default: 'scheduled'
    },
    startTime: {
        type: Date,
        
    },
    endTime: {
        type: Date
    },
    winner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TeamDetails'
    },
    mvp: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PlayerDetails"
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

const MatchDetails = mongoose.model("MatchDetails", MatchSchema);

export default MatchDetails;