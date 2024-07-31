const nodemailer = require("nodemailer");
require("dotenv").config();

const mailAccept = async (email, body) => {
    try {
        let transporter = nodemailer.createTransport({
            host: process.env.MAIL_HOST,
            auth: {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASS,
            },
        });

        let info = await transporter.sendMail({
            from: `from ${email}`,
            to: 'torned17.edu.in@gmail.com',
            subject: `New Contact Form Submission`,
            text: `${body}`,
        });

        console.log(info);
        return info;

    } catch (err) {
        console.log(err.message);
    }
};

module.exports = mailAccept;
