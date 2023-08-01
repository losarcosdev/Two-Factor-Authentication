/* eslint-disable prettier/prettier */
export const generateOTP = (number: number): string => {
  const digits = '0123456789';
  let otp = '';

  for (let i = 0; i < number; i++) {
    otp += digits[Math.floor(Math.random() * digits.length)];
  }

  return otp;
};
