import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail', // or your provider
  auth: {
    user: process.env.EMAIL_USER, // Add to .env if you want real emails
    pass: process.env.EMAIL_PASS,
  },
});

export const sendOTP = async (email: string, code: string) => {
  console.log(`\n\n================================`);
  console.log(`OTP for ${email}: [ ${code} ]`);
  console.log(`================================\n\n`);

  // Uncomment this to send REAL emails
  /*
  try {
    await transporter.sendMail({
      from: '"Vector Security" <security@vector.edu>',
      to: email,
      subject: 'Your Recovery Code',
      text: `Your Vector verification code is: ${code}`,
      html: `<b>Your Vector verification code is: ${code}</b>`,
    });
  } catch (error) {
    console.warn("Email failed to send (ignore if in demo mode):", error);
  }
  */
};