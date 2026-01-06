
interface GameStore {
	QuantumDino: boolean
}

export const gameStore: GameStore = $state({
	QuantumDino: false,
})
