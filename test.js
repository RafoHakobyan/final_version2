import fetch from 'node-fetch';
import fs from 'fs';
import dotenv from "dotenv";
dotenv.config();
async function getTasks(accessToken) {
    const response = await fetch('https://www.wrike.com/api/v4/tasks', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (!response.ok) {
        throw new Error(`Error: ${response.status}, ${response.statusText}`);
    }
    const data = await response.json();
    const tasks = data.data;
    const formattedTasks = tasks.map(task => ({
        id: task.id,
        name: task.title,
        assignee: task.accountId,
        status: task.importance,
        collections: task.parentIds,
        created_at: task.createdDate,
        updated_at: task.updatedDate,
        ticket_url: task.permalink
    }));
    fs.writeFileSync('tasks.json', JSON.stringify(formattedTasks, null, 2));
    return formattedTasks;
}
async function main() {
    const accessToken = process.env.TOKEN;
    try {
        const tasks = await getTasks(accessToken);
        console.log('Tasks retrieved:', tasks);
    }
    catch (error) {
        console.error('Error fetching tasks:', error);
    }
}
main();
