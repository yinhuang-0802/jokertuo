export type SeatPos = "bottom" | "left" | "top" | "right";

export function seatForPlayerIndex(playerIndex: number, baseIndex: number): SeatPos {
  const d = (playerIndex - baseIndex + 4) % 4;
  if (d === 0) return "bottom";
  if (d === 1) return "left";
  if (d === 2) return "top";
  return "right";
}

export function playerIndexForSeat(seat: SeatPos, baseIndex: number) {
  if (seat === "bottom") return baseIndex;
  if (seat === "left") return (baseIndex + 1) % 4;
  if (seat === "top") return (baseIndex + 2) % 4;
  return (baseIndex + 3) % 4;
}

