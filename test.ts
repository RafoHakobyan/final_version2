import fetch from 'node-fetch';
import fs from 'fs';
import dotenv from "dotenv"
dotenv.config()



interface Task {
    id: string;
    title: string;
    accountId: string;
    importance: string;
    parentIds: string[];
    createdDate: string;
    updatedDate: string;
    permalink: string;
}

interface FormattedTask {
    id: string;
    name: string;
    assignee: string;
    status: string;
    collections: string[];
    created_at: string;
    updated_at: string;
    ticket_url: string;
}


async function getTasks(accessToken: string):Promise<void>{
    const response = await fetch('https://www.wrike.com/api/v4/tasks', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!response.ok) {
        throw new Error(`Error: ${response.status}, ${response.statusText}`);
    }

    const data:any = await response.json();
    const tasks: Task[] = data.data;

    const formattedTasks: FormattedTask[] = tasks.map(task => ({
        id: task.id,
        name: task.title,
        assignee: task.accountId,
        status: task.importance,
        collections: task.parentIds,
        created_at: task.createdDate,
        updated_at: task.updatedDate,
        ticket_url: task.permalink
    }));
}

 async function file(formatedtask:FormattedTask):Promise<FormattedTask>{
    fs.writeFileSync('tasks.json', JSON.stringify(formatedtask, null, 2));
    return formatedtask
 }   
    


async function main() {
    const accessToken:any = process.env.TOKEN 
    try {
        const tasks = await getTasks(accessToken);
        await file(tasks)
        console.log('Tasks are ready:', tasks);
    } catch (error) {
        console.error('Error tasks:', error);
    }
}

main();

