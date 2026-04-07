import { createStartYourProject, viewStartYourProject, viewAllStartYourProject, updateStartYourProject, deleteStartYourProject } from "../../helper/startProject/startProjectHelper.js";
import { BAD_REQUEST } from "../../errorCodes.js"; 

export const addStartYourProjectAction = async (req, res) => {
    try {
        const reqBody = req.body;
        const result = await createStartYourProject(reqBody);
        return res.status(201).send(result); 
    } catch (error) {
        console.error(error);
        return res.status(BAD_REQUEST.code).send({ message: error.message }); 
    }
};

export const viewStartYourProjectAction = async (req, res) => {
    try {
        const projectId = req.params.id;
        const project = await viewStartYourProject(projectId);
        res.send(project);
    } catch (error) {
        console.error(error);
        return res.status(BAD_REQUEST.code).send({ message: error.message });
    }
};

export const viewAllStartYourProjectAction = async (req, res) => {
    try {
        const allProject = await viewAllStartYourProject();
        res.send(allProject);
    } catch (error) {
        console.error(error);
        return res.status(BAD_REQUEST.code).send({ message: error.message });
    }
};

export const updateStartYourProjectAction = async (req, res) => {
    try {
        const projectId = req.params.id;
        const projectData = req.body;
        const project = await updateStartYourProject(projectId, projectData);
        res.send(project);
    } catch (error) {
        console.error(error);
        return res.status(BAD_REQUEST.code).send({ message: error.message });
    }
};

export const deleteStartYourProjectAction = async (req, res) => {
    try {
        const projectId = req.params.id;
        const project = await deleteStartYourProject(projectId);
        res.send({ message: "Project deleted successfully", project });
    } catch (error) {
        console.error(error);
        return res.status(BAD_REQUEST.code).send({ message: error.message });
    }
};