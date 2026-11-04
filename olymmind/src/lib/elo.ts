// Elo nhiều người chơi: so từng cặp theo thứ hạng điểm, chia K cho (n-1) cặp.

export interface EloInput {
  id: string;
  rating: number;
  score: number;
}

export function computeElo(players: EloInput[], k = 32): Record<string, number> {
  const delta: Record<string, number> = Object.fromEntries(players.map((p) => [p.id, 0]));
  const n = players.length;
  if (n < 2) return delta;
  const kk = k / (n - 1);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = players[i];
      const b = players[j];
      const ea = 1 / (1 + 10 ** ((b.rating - a.rating) / 400));
      const sa = a.score > b.score ? 1 : a.score < b.score ? 0 : 0.5;
      delta[a.id] += kk * (sa - ea);
      delta[b.id] += kk * (1 - sa - (1 - ea));
    }
  }
  for (const id of Object.keys(delta)) delta[id] = Math.round(delta[id]);
  return delta;
}
