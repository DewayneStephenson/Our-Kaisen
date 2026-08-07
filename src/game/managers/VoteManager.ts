// VoteManager.ts
export default class VoteManager {
    votes: Record<string, string>;

    constructor(votes: Record<string, string>) {
        this.votes = votes;
    }

    start() {
        this.votes = {};
        return { success: true };
    }

    cast(voterId: string, targetId: string) {
        this.votes[voterId] = targetId;
        return { success: true };
    }

    tally() {
        const tally: Record<string, number> = {};

        for (const target of Object.values(this.votes)) {
            tally[target] = (tally[target] || 0) + 1;
        }

        return { success: true, data: tally };
    }
}
