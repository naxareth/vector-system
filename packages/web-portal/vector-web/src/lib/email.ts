import nodemailer from 'nodemailer';

// Reusable transporter instance
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD, 
  },
});

export const sendVerificationEmail = async (to: string, code: string) => {
  const mailOptions = {
    from: `"VECTOR System" <${process.env.SMTP_EMAIL}>`,
    to,
    subject: 'VECTOR - Verify Your Account',
    html: `
      <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #6b21a8; margin: 0; font-size: 28px; letter-spacing: -0.5px;">VECTOR</h1>
          <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Decentralized Micro-Credentialing</p>
        </div>
        
        <p style="color: #334155; font-size: 16px; line-height: 1.5;">Hello,</p>
        <p style="color: #334155; font-size: 16px; line-height: 1.5;">Your security is our priority. Please use the verification code below to verify your email address and activate your account.</p>
        
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; text-align: center; margin: 30px 0; border: 1px dashed #cbd5e1;">
          <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #0f172a;">${code}</span>
        </div>
        
        <p style="color: #64748b; font-size: 14px; text-align: center;">This code will expire in 15 minutes.</p>
        
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">If you did not request this code, please safely ignore this email.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error("Error sending email:", error);
    return { success: false, error };
  }
};

export const sendPasswordResetEmail = async (to: string, code: string) => {
  const mailOptions = {
    from: `"VECTOR System" <${process.env.SMTP_EMAIL}>`,
    to,
    subject: 'VECTOR - Password Reset Request',
    html: `
      <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #6b21a8; margin: 0; font-size: 28px; letter-spacing: -0.5px;">VECTOR</h1>
          <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Decentralized Micro-Credentialing</p>
        </div>
        
        <p style="color: #334155; font-size: 16px; line-height: 1.5;">Hello,</p>
        <p style="color: #334155; font-size: 16px; line-height: 1.5;">We received a request to reset the password for your VECTOR account. Please use the verification code below to proceed with setting up a new password.</p>
        
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; text-align: center; margin: 30px 0; border: 1px dashed #cbd5e1;">
          <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #0f172a;">${code}</span>
        </div>
        
        <p style="color: #64748b; font-size: 14px; text-align: center;">This code will expire in 15 minutes.</p>
        
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">If you did not request a password reset, please safely ignore this email. Your password will remain unchanged.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error("Error sending password reset email:", error);
    return { success: false, error };
  }
};