import mongoose from "mongoose";
const WalletSchema =new mongoose.Schema ({
    userId : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "User",
        required : true,
        index: true,
    },
    balance :{
        type : Number,
        default : 0,
        min : 0,
    },
    withdrawalAmount : {
        type : Number,
        default : 100,
        min : 100,
    },
    depositeAmount : {
        type : Number ,
        default : 100,
        min : 100,
    },
    transactions : [{
        amount : {
            type : Number,
            required :true,
        },
        paymentMethod : {
            type : String,
            enum : ["UPI" , "Bank Transfer", " Card" ],
            required :true,
        },
        status : {
        type : String,
        enum : ["Pending","Completed","Failed"],
        default : "Pending"
    },
    transactionType : {
        type : String,
        enum : ["Deposit","Withdrawal"],
        required :true,
    },
}],
savedPaymentMethods : [{
    upiID : {
        type : String,
        validate : {
            validator : function (value){
                return !this.upiID ? !!value : true;
            },
            message : "Either provide  UPI ID or  Account Details"
        }
    },
    accountNumber :{
        type : String ,
        validate :{
            validator : function (value){
                return !this.upiID ? !! value : true;
            },
            message : " either provide the UPI ID or Account Details"
        }
    },
    ifscCode : {
        type : String,
        validate : function (value){
            return !this.upiID ? !!value : true;
        },
        message : "IFSC Code required if using Bank Transfer"
    },}],

},{timestamps : true})

WalletSchema.index({ userId: 1 });

const Wallet = mongoose.model("Wallet", WalletSchema)

export default Wallet;