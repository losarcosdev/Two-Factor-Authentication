/* eslint-disable prettier/prettier */
import * as bcrypt from 'bcrypt';

interface PasswordVerifier {
  password: string;
  hashedPassword: string;
}

export const verifyPassword = ({
  password,
  hashedPassword,
}: PasswordVerifier) => {
  return bcrypt.compareSync(password, hashedPassword);
};
