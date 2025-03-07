import multer from 'multer';
import fs from 'fs';
import path from 'path';

const storage = multer.diskStorage({
    destination : function (req,file,cb){
        cb(null , "./public/temp")
    },
    filename : function (req , file , cb){
        cb(null , file.originalname)
    }
   
})
const upload = multer({storage})

export default upload;
