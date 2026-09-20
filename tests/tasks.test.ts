import { describe, expect, test } from 'bun:test'
import type { Project, Task } from '$lib/utils/db'
import { groupTasksByProject, sortProjectsByCreatedAtDesc } from '$lib/utils/tasks'

function makeTask(overrides: Partial<Task> & { id: number; projectId: number }): Task {
    return {
        text: `task-${overrides.id}`,
        completed: false,
        createdAt: new Date(0),
        updatedAt: new Date(0),
        ...overrides,
    }
}

function makeProject(overrides: Partial<Project> & { id: number }): Project {
    return { title: `project-${overrides.id}`, createdAt: new Date(0), ...overrides }
}

describe('sortProjectsByCreatedAtDesc', () => {
    test('orders projects newest first', () => {
        const projects: Project[] = [
            makeProject({ id: 1, createdAt: new Date(1000) }),
            makeProject({ id: 2, createdAt: new Date(3000) }),
            makeProject({ id: 3, createdAt: new Date(2000) }),
        ]
        expect(sortProjectsByCreatedAtDesc(projects).map((p) => p.id)).toEqual([2, 3, 1])
    })
})

describe('groupTasksByProject', () => {
    test('groups tasks into their projects and preserves project order', () => {
        const projects: Project[] = [makeProject({ id: 10 }), makeProject({ id: 20 })]
        const tasks: Task[] = [
            makeTask({ id: 1, projectId: 20 }),
            makeTask({ id: 2, projectId: 10 }),
            makeTask({ id: 3, projectId: 10 }),
        ]

        const grouped = groupTasksByProject(projects, tasks)
        expect(grouped.map((p) => p.id)).toEqual([10, 20])
        expect(grouped[0].tasks.map((t) => t.id)).toEqual([2, 3])
        expect(grouped[1].tasks.map((t) => t.id)).toEqual([1])
    })

    test('gives projects with no tasks an empty array', () => {
        const grouped = groupTasksByProject([makeProject({ id: 1 })], [])
        expect(grouped[0].tasks).toEqual([])
    })

    test('drops tasks whose project is not in the list', () => {
        const projects: Project[] = [makeProject({ id: 1 })]
        const tasks: Task[] = [
            makeTask({ id: 1, projectId: -1 }),
            makeTask({ id: 2, projectId: 999 }),
            makeTask({ id: 3, projectId: 1 }),
        ]
        const grouped = groupTasksByProject(projects, tasks)
        expect(grouped).toHaveLength(1)
        expect(grouped[0].tasks.map((t) => t.id)).toEqual([3])
    })
})
