import fetch from 'node-fetch';
import fs from 'fs/promises';
import dotenv from 'dotenv';

dotenv.config();


interface Task {
    id: string;
    title: string;
    accountId: string;
    importance: string;
    createdDate: string;
    updatedDate: string;
    permalink: string;
    responsibleIds?: string[];
    parentIds?: string[];
}

interface User {
    id: string;
    userid:string
    firstName: string;
    lastName: string;
    primaryEmail: string;
}

interface Project {
    id: string;
    title: string;
}

interface TaskWithUser extends Task {
    users: User[];
}

interface ProjectStructure {
    projectId: string;
    projectName: string;
    tasks: TaskWithUser[];
}

async function fetchTasks(accessToken: string): Promise<Task[]> {
    const response = await fetch('https://www.wrike.com/api/v4/tasks?fields=[responsibleIds,parentIds]', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Error fetching tasks: ${response.status}, ${response.statusText}, ${JSON.stringify(errorData)}`);
    }

    const data:any = await response.json();
    return data.data;
}

async function fetchUsers(accessToken: string): Promise<User[]> {
    const tasksResponse = await fetch('https://www.wrike.com/api/v4/tasks?fields=[responsibleIds]', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (!tasksResponse.ok) {
        const errorData = await tasksResponse.json();
        throw new Error(`Error fetching tasks: ${tasksResponse.status}, ${tasksResponse.statusText}, ${JSON.stringify(errorData)}`);
    }

    const tasksData:any = await tasksResponse.json();
    const allResponsibleIds = tasksData.data.map((task: Task) => task.responsibleIds).flat();

    const usersResponse = await fetch(`https://www.wrike.com/api/v4/users/${allResponsibleIds.join(',')}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (!usersResponse.ok) {
        const errorData = await usersResponse.json();
        throw new Error(`Error fetching user details: ${usersResponse.status}, ${usersResponse.statusText}, ${JSON.stringify(errorData)}`);
    }

    const usersData:any = await usersResponse.json();
    return usersData.data;
}

async function fetchProjects(accessToken: string): Promise<Project[]> {
    const response = await fetch('https://www.wrike.com/api/v4/folders?project', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Error fetching projects: ${response.status}, ${response.statusText}, ${JSON.stringify(errorData)}`);
    }

    const data:any = await response.json();
    return data.data;
}

function formatTasks(tasks: Task[]):any {
    return tasks.map((task) => ({
        id: task.id,
        name: task.title,
        assignee: task.accountId,
        status: task.importance,
        created_at: task.createdDate,
        updated_at: task.updatedDate,
        ticket_url: task.permalink,
        responsibleIds: task.responsibleIds || [],
        parentIds: task.parentIds || [],
    }));
}

function formatUsers(users: User[]): any {
    return users.map((user) => ({
        userid: user.id,
        userfirstname: user.firstName,
        userlastname: user.lastName,
        userprimaryEmail: user.primaryEmail,
    }));
}

async function buildProjectsStructure(projects: Project[], tasks: Task[], users: User[]): Promise<ProjectStructure[]> {
    return projects.map(project => {
        const projectTasks = tasks.filter(task => task.parentIds?.includes(project.id));

        const tasksWithUsers = projectTasks.map(task => {
            const taskUsers = task.responsibleIds?.map(responsibleId =>
                users.find(user => user.userid === responsibleId)
            ).filter((user):user is User => user !== undefined);

            return {
                ...task,
                users: taskUsers || [],
            };
        });

        return {
            projectId: project.id,
            projectName: project.title,
            tasks: tasksWithUsers,
        };
    });
}

async function saveToFile(data: ProjectStructure[]): Promise<void> {
    await fs.writeFile('projects_with_tasks_and_users.json', JSON.stringify(data, null, 2));
}

async function main(): Promise<void> {
    const accessToken = process.env.TOKEN;
    if (!accessToken) {
        console.error('Access token is not defined. Please set the TOKEN in your .env file.');
        return;
    }

    try {
        const tasks = await fetchTasks(accessToken);
        const users = await fetchUsers(accessToken);
        const projects = await fetchProjects(accessToken);

        const formattedTasks = formatTasks(tasks);
        const formattedUsers = formatUsers(users);

        const projectStructure = await buildProjectsStructure(projects, formattedTasks, formattedUsers);

        await saveToFile(projectStructure);

        console.log('Projects structure is ready and saved to projects_with_tasks_and_users.json');
    } catch (error) {
        console.error('Error:', error);
    }
}

main();
