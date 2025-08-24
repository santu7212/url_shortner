import express from "express";
import { shortnerRoutes } from "./routes/shorten.routes.js";
import { fileURLToPath } from "url";
import path from "path";
import { authRoutes } from "./routes/auth.routes.js";
import cookieParser from "cookie-parser";
import session from "express-session"
import flash from "connect-flash"
import {verifyAuthentication} from "./middlewares/verify-auth-middleware.js"
import requestIP from "request-ip";
 

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public"))); 
// app.use("/uploads", express.static(path.join(process.cwd(), "public/uploads")));
app.use(express.urlencoded({ extended: true }));

app.set("view engine", "ejs");

app.use(cookieParser());

app.use(session({secret: "my-secret",resave: true, saveUninitialized: false}));
app.use(flash());

app.use(requestIP.mw());




// after cookie parser middleware 
app.use(verifyAuthentication)
app.use((req,res,next)=>{
  res.locals.user=req.user;
  return next();
  
})

app.use(authRoutes)
app.use( shortnerRoutes); 



 
  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`🚀 Server running at http://localhost:${PORT}/register`);
  });

 