import mongoose from "mongoose";
import { STARTPROJECT } from "../../collectionName.js";

import startProject from "../../schema/startProject/startProject.js"

const startProjectModel = mongoose.model(STARTPROJECT, startProject);

export default startProjectModel; 
