const express = require("express");
const app = express();

// Packages
const fileUpload = require("express-fileupload");
const cookieParser = require("cookie-parser");
const cors = require('cors');
require('dotenv').config();
console.log("happy happt");
// Connection to DB and Cloudinary
const { connection } = require("./config/database");
const { cloudinaryConnect } = require("./config/cloudinary");


// Routes
const userRoutes = require('./routes/user');
const profileRoutes = require('./routes/profile');
const paymentRoutes = require('./routes/payments');
const contactRoutes = require("./routes/contact");
const courseRoutes = require('./routes/course');
const quizRoutes = require("./routes/quiz")



// Middleware
app.use(express.json()); // To parse JSON body
app.use(cookieParser());
app.use(cors());
app.use(fileUpload({
    useTempFiles: true,
    tempFileDir: '/tmp'
}));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server Started on PORT ${PORT}`);
});

// Connections
connection();
// console.log("sb shi jh");
cloudinaryConnect();

// Mount Routes
app.use('/api/v1/auth', userRoutes);
app.use('/api/v1/profile', profileRoutes);
app.use('/api/v1/payment', paymentRoutes);
app.use('/api/v1/course', courseRoutes);
app.use('/api/v1',contactRoutes);
app.use('/api/v1/quiz',quizRoutes);

// Default Route
app.get('/', (req, res) => {
    res.send(`<div>
        Hello ! This is backend page 
        This is Default Route for Torned website  
        <p>Everything is OK</p>
    </div>`);
});
