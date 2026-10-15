import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: "gmail",
    port: 587,
    secure: false,

    auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_APP_PASSWORD,
    }
});

export const sendEmail = async (sender, receiver, html) => {

    const info = await transporter.sendMail({
        from: sender,
        to: receiver,
        html: html
    });

    return info;
};