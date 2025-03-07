import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser";
import redisService from './config/redis.config.js';
import mongoose from 'mongoose';

export const app =express();
app.use(cors({
    origin : process.env.CORS_ORIGIN, 
    credentials : true
}))
app.use(express.json({ limit : "16kb"}))
app.use(express.urlencoded({extended : true, limit : "16kb"}))
app.use(express.static("public"))
app.use(cookieParser())



import userRouter from './routes/user.routes.js';
import adminAuthRoutes from './routes/adminAuth.routes.js';
import betRoutes from './routes/bet.routes.js';


app.use("/users",userRouter)


app.get("/",(req,res)=>{
    res.send('chal raha h ')
})

app.get('/health', async (req, res) => {
    res.json({
        status: 'healthy',
        redis: redisService.isConnected ? 'connected' : 'disconnected'
    });
});

app.use('/api/admin/auth', adminAuthRoutes);

app.use('/api/bets', betRoutes);

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});
process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection:', error);
    process.exit(1);
});

const cleanup = () => {
    mongoose.connection.close(() => {
        console.log('MongoDB connection closed');
        redisService.quit(() => {
            console.log('Redis connection closed');
            process.exit(0);
        });
    });
};

process.on('SIGTERM', cleanup);
process.on('SIGINT', cleanup);

export default  app;