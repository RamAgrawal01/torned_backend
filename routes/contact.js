const express = require("express");
const router = express.Router();
const Contact = require("../models/Contact");
const mailAccept = require("../utils/contacusEmail");
// Define the ContactUs function within the same file
router.post("/contact-us", async (req, res) => {
    try {
        const { firstName, lastName, email, message, phoneNo } = req.body;

        console.log("firstName: ",firstName);
        // Validation
        if (!firstName || !lastName || !email || !message || !phoneNo) {
            return res.status(401).json({
                success: false,
                message: "All fields are required..!"
            });
        }

        const messageDetails = await Contact.create({
            firstName, lastName, email,phoneNo, message
        });

        // If you want to send an email, add your email-sending logic here

        res.status(200).json({
            success: true,
            message: "Thanks for contacting us!",
            messageDetails
        });
        
            //Email Send Logic
             const userEmail = `${email}`
             const emailBody = `
                Name: ${firstName} ${lastName}
                Email: ${email}
                Contact No: ${phoneNo}
                Message: ${message}
        `;

    //send Email
    await mailAccept(userEmail,emailBody);
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message,
            message: "Your details could not be sent"
        });
    }
    

});

module.exports = router;