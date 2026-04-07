import mongoose from "mongoose"


const rolesSchema = new mongoose.Schema({
    roleName: { type: String, default: '', isUnique: true, required: true },
    permissions: { type: String, default: '', required: true  },
    description: { type: String, default: '', },
    createdBy: {type: String, default: ''},
    isActive: { type: Boolean, default: true },
});

export default rolesSchema;