import type { Project, Task } from './db'

export interface ProjectWithTasks extends Project {
    tasks: Task[]
}

export function sortProjectsByCreatedAtDesc(projects: Project[]): Project[] {
    return projects.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

export function groupTasksByProject(projects: Project[], tasks: Task[]): ProjectWithTasks[] {
    const byProject = new Map<number, Task[]>()
    for (const task of tasks) {
        const list = byProject.get(task.projectId)
        if (list) list.push(task)
        else byProject.set(task.projectId, [task])
    }
    return projects.map((project) => ({
        ...project,
        tasks: byProject.get(project.id as number) ?? [],
    }))
}
