import bcrypt from 'bcryptjs';

export const encriptarPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};
