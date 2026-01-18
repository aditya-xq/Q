
interface FireStore {
	FireDashboard: boolean
}

export const fireStore: FireStore = $state({
	FireDashboard: false,
})
