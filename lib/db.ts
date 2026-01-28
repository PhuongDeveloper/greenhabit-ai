import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  serverTimestamp,
  getDoc,
  setDoc,
  increment,
  orderBy,
  limit as firestoreLimit
  , deleteDoc
} from "firebase/firestore";
import { getDb } from "./firebase";

export function usersCollection() {
  return collection(getDb(), "users");
}

export function cardsCollection() {
  return collection(getDb(), "cards");
}

export function redeemsCollection() {
  return collection(getDb(), "redeems");
}

export async function addCardToFirestore(card: any) {
  return await addDoc(cardsCollection(), {
    ...card,
    createdAt: serverTimestamp()
  });
}

export async function redeemCard(payload: any) {
  // Save redeem history
  const r = await addDoc(redeemsCollection(), {
    ...payload,
    createdAt: serverTimestamp()
  });
  return { id: r.id };
}

export async function fetchAvailableCard(provider: string, value: number) {
  const q = query(cardsCollection(), where("provider", "==", provider), where("value", "==", value), where("used", "==", false), firestoreLimit(1));
  const snaps = await getDocs(q);
  if (!snaps.docs.length) return null;
  const d = snaps.docs[0];
  return { id: d.id, ...(d.data() as any) };
}

export async function fetchAvailableCardGroups() {
  const snaps = await getDocs(query(cardsCollection(), where("used", "==", false)));
  const groups: Record<string, { provider: string; value: number; pointsRequired?: number; count: number }> = {};
  snaps.forEach((d) => {
    const data = d.data() as any;
    const key = `${data.provider}::${data.value}`;
    if (!groups[key]) {
      groups[key] = { provider: data.provider, value: data.value, pointsRequired: data.pointsRequired || 0, count: 0 };
    }
    groups[key].count += 1;
  });
  return Object.values(groups);
}

export async function fetchCards() {
  const snaps = await getDocs(cardsCollection());
  return snaps.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}

export async function fetchRedeems(limitNumber = 100) {
  const q = query(redeemsCollection(), orderBy("createdAt", "desc"), firestoreLimit(limitNumber));
  const snaps = await getDocs(q);
  return snaps.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}

export async function markCardUsed(cardId: string, usedBy?: string) {
  const d = doc(getDb(), "cards", cardId);
  await updateDoc(d, {
    used: true,
    usedBy: usedBy || null,
    usedAt: serverTimestamp()
  });
}

export async function getUserByUid(uid: string) {
  const d = doc(getDb(), "users", uid);
  const snap = await getDoc(d);
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as any) };
}

export async function createUserIfNotExists(uid: string, email = "", displayName = "", avatarUrl = "") {
  const d = doc(getDb(), "users", uid);
  const snap = await getDoc(d);
  if (!snap.exists()) {
    await setDoc(d, {
      uid,
      email,
      displayName,
      avatarUrl,
      greenPoints: 0,
      createdAt: serverTimestamp()
    });
    return { uid, email, displayName, avatarUrl, greenPoints: 0 };
  }
  return { id: snap.id, ...(snap.data() as any) };
}

export async function incrementUserPoints(uid: string, delta: number) {
  const d = doc(getDb(), "users", uid);
  await updateDoc(d, {
    greenPoints: increment(delta)
  });
}

export async function getTopUsers(limitNumber = 5) {
  const q = query(collection(getDb(), "users"), orderBy("greenPoints", "desc"), firestoreLimit(limitNumber));
  const snaps = await getDocs(q);
  return snaps.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}

export async function getAllUsersForAggregation() {
  const snaps = await getDocs(collection(getDb(), "users"));
  return snaps.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}

/**
 * Redeem one available card: fetch an unused card, mark it used, and record redeem entry.
 * Returns { code, cardId } or null if none available.
 */
export async function redeemAvailableCard(provider: string, value: number, userId?: string) {
  const card = await fetchAvailableCard(provider, value);
  if (!card) return null;
  try {
    await markCardUsed(card.id, userId);
    const payload: any = {
      provider,
      value,
      cardId: card.id,
      code: card.code || null,
      userId: userId || null
    };
    const r = await redeemCard(payload);
    return { code: card.code || r.id, cardId: card.id };
  } catch (err) {
    console.error("redeemAvailableCard error:", err);
    return null;
  }
}

export async function deleteCard(cardId: string) {
  const d = doc(getDb(), "cards", cardId);
  await deleteDoc(d);
}

/**
 * Lấy lịch sử điểm của tất cả users để tính điểm tăng
 */
export async function getPointsHistory(limitNumber = 100) {
  const q = query(collection(getDb(), "points_history"), orderBy("createdAt", "desc"), firestoreLimit(limitNumber));
  const snaps = await getDocs(q);
  return snaps.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}

/**
 * Lưu snapshot điểm hàng ngày (gọi lúc đầu ngày hoặc khi cần)
 */
export async function savePointsSnapshot(userId: string, points: number) {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const docId = `${userId}_${today}`;
  const d = doc(getDb(), "points_snapshots", docId);
  await setDoc(d, {
    userId,
    points,
    date: today,
    createdAt: serverTimestamp()
  }, { merge: true });
}

/**
 * Lấy snapshot điểm của ngày cụ thể
 */
export async function getPointsSnapshotsByDate(date: string) {
  const q = query(collection(getDb(), "points_snapshots"), where("date", "==", date));
  const snaps = await getDocs(q);
  return snaps.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}

/**
 * Tính điểm tăng trong ngày cho tất cả users
 * Lấy avatar từ photoURL và tên đội từ team_members + teams
 */
export async function getDailyPointsGrowth() {
  const db = getDb();
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // Lấy tất cả users hiện tại
  const allUsers = await getAllUsersForAggregation();

  // Lấy snapshot hôm qua
  const yesterdaySnapshots = await getPointsSnapshotsByDate(yesterday);
  const yesterdayMap: Record<string, number> = {};
  yesterdaySnapshots.forEach((s: any) => {
    yesterdayMap[s.userId] = s.points || 0;
  });

  // Lấy team memberships để map userId -> teamId
  const teamMembersSnap = await getDocs(collection(db, "team_members"));
  const userTeamMap: Record<string, string> = {};
  teamMembersSnap.forEach((d) => {
    const data = d.data() as any;
    userTeamMap[data.userId] = data.teamId;
  });

  // Lấy tất cả teams để map teamId -> teamName
  const teamsSnap = await getDocs(collection(db, "teams"));
  const teamNameMap: Record<string, string> = {};
  teamsSnap.forEach((d) => {
    const data = d.data() as any;
    teamNameMap[d.id] = data.name || "Đội xanh";
  });

  // Tính điểm tăng
  const growth = allUsers.map((u: any) => {
    const userId = u.uid || u.id;
    const currentPoints = u.greenPoints || 0;
    const yesterdayPoints = yesterdayMap[userId] || 0;
    const pointsGrowth = currentPoints - yesterdayPoints;

    // Lấy tên đội từ team_members -> teams
    const teamId = userTeamMap[userId];
    const teamName = teamId ? teamNameMap[teamId] : "";

    // Lấy avatar với nhiều fallback
    const avatar = u.photoURL || u.avatarUrl || u.avatar || "/images/user.png";

    return {
      uid: userId,
      name: u.displayName || u.email || "Người dùng",
      avatar,
      team: teamName,
      currentPoints,
      yesterdayPoints,
      growth: pointsGrowth
    };
  });

  // Sort theo điểm tăng
  return growth.sort((a, b) => b.growth - a.growth);
}

/**
 * Lấy thống kê đội nhóm với điểm tăng
 * Sử dụng teams và team_members collections
 */
export async function getTeamsWithGrowth() {
  const db = getDb();
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // 1. Lấy tất cả teams
  const teamsSnap = await getDocs(collection(db, "teams"));
  if (teamsSnap.empty) return [];

  // 2. Lấy snapshot hôm qua
  const yesterdaySnapshots = await getPointsSnapshotsByDate(yesterday);
  const yesterdayMap: Record<string, number> = {};
  yesterdaySnapshots.forEach((s: any) => {
    yesterdayMap[s.userId] = s.points || 0;
  });

  // 3. Lấy tất cả users để map greenPoints
  const allUsers = await getAllUsersForAggregation();
  const usersMap: Record<string, any> = {};
  allUsers.forEach((u: any) => {
    const uid = u.uid || u.id;
    usersMap[uid] = u;
  });

  // 4. Xử lý từng team
  const teamsWithGrowth: any[] = [];

  for (const teamDoc of teamsSnap.docs) {
    const teamData = teamDoc.data() as any;
    const teamId = teamDoc.id;

    // Lấy members của team
    const membersSnap = await getDocs(query(collection(db, "team_members"), where("teamId", "==", teamId)));

    let totalPoints = 0;
    let yesterdayPoints = 0;
    let growth = 0;
    const members: any[] = [];

    membersSnap.forEach((memberDoc) => {
      const memberData = memberDoc.data() as any;
      const userId = memberData.userId;
      const user = usersMap[userId];

      if (user) {
        const currentPts = user.greenPoints || 0;
        const yesterdayPts = yesterdayMap[userId] || 0;
        const memberGrowth = currentPts - yesterdayPts;

        totalPoints += currentPts;
        yesterdayPoints += yesterdayPts;
        growth += memberGrowth;

        members.push({
          uid: userId,
          name: user.displayName || user.email || "Người dùng",
          avatar: user.avatarUrl || user.photoURL || "/images/user.png",
          currentPoints: currentPts,
          yesterdayPoints: yesterdayPts,
          growth: memberGrowth,
          role: memberData.role || "member"
        });
      }
    });

    // Sort members by growth
    members.sort((a, b) => b.growth - a.growth);

    teamsWithGrowth.push({
      id: teamId,
      name: teamData.name || "Đội xanh",
      avatarUrl: teamData.avatarUrl || "",
      memberCount: teamData.memberCount || members.length,
      totalPoints,
      yesterdayPoints,
      growth,
      members
    });
  }

  // Sort teams by growth
  return teamsWithGrowth.sort((a, b) => b.growth - a.growth);
}

/**
 * Lưu snapshot điểm cho tất cả users (chạy hàng ngày)
 */
export async function saveAllUsersPointsSnapshot() {
  const allUsers = await getAllUsersForAggregation();
  const today = new Date().toISOString().split('T')[0];

  for (const u of allUsers) {
    const userId = u.uid || u.id;
    const points = u.greenPoints || 0;
    await savePointsSnapshot(userId, points);
  }

  return { date: today, usersCount: allUsers.length };
}
