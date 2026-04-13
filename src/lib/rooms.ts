import { supabase } from "@/lib/supabase";

export type RoomStatus = "waiting" | "locked" | "in_game" | "closed";

export type RoomRow = {
  id: string;
  invite_code: string;
  status: RoomStatus;
  owner_player_id: string;
  mode: string;
  difficulty: string;
  seed: number | null;
  game_version: number;
  game_state: unknown | null;
  created_at: string;
  updated_at: string;
};

export type RoomPlayerRow = {
  id: string;
  room_id: string;
  player_id: string;
  display_name: string;
  is_owner: boolean;
  is_ai: boolean;
  seat_index: number;
  joined_at: string;
};

function randomInviteCode(len: number = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) {
    out += chars[Math.floor(Math.random() * chars.length)]!;
  }
  return out;
}

export async function getRoomById(roomId: string) {
  return supabase.from("rooms").select("*").eq("id", roomId).single<RoomRow>();
}

export async function getRoomByCode(inviteCode: string) {
  return supabase.from("rooms").select("*").eq("invite_code", inviteCode).single<RoomRow>();
}

export async function listRoomPlayers(roomId: string) {
  return supabase
    .from("room_players")
    .select("*")
    .eq("room_id", roomId)
    .order("seat_index", { ascending: true })
    .returns<RoomPlayerRow[]>();
}

export async function createRoom(params: {
  ownerPlayerId: string;
  ownerName: string;
  mode: "solo" | "duo";
  difficulty: "easy" | "normal" | "hard";
}) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const inviteCode = randomInviteCode(6);
    const insertRoom = await supabase
      .from("rooms")
      .insert({
        invite_code: inviteCode,
        status: "waiting",
        owner_player_id: params.ownerPlayerId,
        mode: params.mode,
        difficulty: params.difficulty,
      })
      .select("*")
      .single<RoomRow>();

    if (insertRoom.error) {
      if ((insertRoom.error as any).code === "23505") continue;
      return insertRoom;
    }

    const room = insertRoom.data;
    const join = await supabase.from("room_players").insert({
      room_id: room.id,
      player_id: params.ownerPlayerId,
      display_name: params.ownerName,
      is_owner: true,
      is_ai: false,
      seat_index: 0,
    });
    if (join.error) return { data: room, error: join.error } as any;

    return insertRoom;
  }

  return { data: null, error: new Error("invite_code collision") } as any;
}

export async function joinRoomById(params: { roomId: string; playerId: string; displayName: string }) {
  const roomRes = await getRoomById(params.roomId);
  if (roomRes.error) return { room: null as RoomRow | null, players: null as RoomPlayerRow[] | null, error: roomRes.error };
  const room = roomRes.data;
  if (room.status !== "waiting") {
    return { room, players: null, error: new Error(room.status === "in_game" ? "对局已开始，无法加入" : "房间不可加入") };
  }

  const playersRes = await listRoomPlayers(room.id);
  if (playersRes.error) return { room, players: null, error: playersRes.error };
  const players = playersRes.data;
  if (players.some((p) => p.player_id === params.playerId)) {
    return { room, players, error: null };
  }
  if (players.length >= 4) {
    return { room, players, error: new Error("房间已满") };
  }
  const used = new Set(players.map((p) => p.seat_index));
  const seat = [0, 1, 2, 3].find((s) => !used.has(s));
  if (seat === undefined) return { room, players, error: new Error("房间已满") };

  const join = await supabase.from("room_players").insert({
    room_id: room.id,
    player_id: params.playerId,
    display_name: params.displayName,
    is_owner: false,
    is_ai: false,
    seat_index: seat,
  });
  if (join.error) return { room, players, error: join.error };
  const nextPlayers = await listRoomPlayers(room.id);
  return { room, players: nextPlayers.data ?? players, error: nextPlayers.error };
}

