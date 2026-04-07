import userModel from "../model/userModel.js";
import oauthModel from '../model/oauthModel.js';
import bcrypt from "bcrypt";

export const userValidation = async function (userName, password) {
    const trimmedUserName = userName.trim();
    const trimmedPassword = password.trim();

    try {
        const user = await userModel.findOne({ userName: trimmedUserName }).exec();

        if (!user) {
            console.error('User not found');
            throw { error: 'User not found', status: 404 };
        }

        if (user.hide) {
            console.error('User is blocked');
            throw { error: 'User is blocked', status: 401 };
        }
 
        const isMatched = await bcrypt.compare(trimmedPassword, user.password);
        if (!isMatched) {
            console.error('Invalid password');
            throw { error: 'Invalid password', status: 401 };
        }

        await oauthModel.deleteMany({ 'user.userName': trimmedUserName }).exec();

        return user;

    } catch (err) {
        console.error('Error finding/updating user:', err);
        throw err.error ? err : { error: 'Internal server error', status: 500 };
    }
};