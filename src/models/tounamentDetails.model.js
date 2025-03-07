import mongoose from "mongoose";

const tournamentDetailsSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    banner: {
        type: String,
        required: true,
    },
    startDate: {
        type: Date,
        required: true,
    },
    endDate: {
        type: Date,
        required: true,
    },
    prizePool: {
        type: Number,
        required: true,
    },
    participantsTeamName: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "TeamDetails",
        required: true,
    }],
    status: {
        type: String,
        required: true,
        enum: ['scheduled', 'ongoing', 'completed'],
        default: 'scheduled'
    },  
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date, 
        default: Date.now,
    },
})

const TournamentDetails = mongoose.model("TournamentDetails", tournamentDetailsSchema)

export default TournamentDetails ;

