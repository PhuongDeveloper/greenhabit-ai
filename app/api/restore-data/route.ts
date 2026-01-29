import { NextResponse } from 'next/server';
import { getDb } from '../../../lib/firebase';
import { collection, getDocs, doc, getDoc, setDoc, query, where } from 'firebase/firestore';

/**
 * API để khôi phục data cho users bị ảnh hưởng bởi merge accounts
 * 
 * Problem: Khi merge, ...newData ghi đè ...oldData, làm mất farm/trees/achievements
 * Solution: Tìm users có originalUid → check backup/snapshots → khôi phục
 */

// GET: Liệt kê tất cả users đã bị merge
export async function GET() {
    try {
        const db = getDb();

        // Tìm tất cả users có originalUid (đã merge)
        const usersSnap = await getDocs(collection(db, 'users'));
        const mergedUsers: any[] = [];

        usersSnap.forEach(d => {
            const data = d.data();
            if (data.originalUid) {
                mergedUsers.push({
                    currentUid: d.id,
                    originalUid: data.originalUid,
                    email: data.email,
                    displayName: data.displayName,
                    greenPoints: data.greenPoints || 0,
                    mergedAt: data.mergedAt,
                    // Check các data quan trọng có bị mất không
                    hasFarm: !!data.farm,
                    hasTreesProgress: !!data.treesProgress,
                    hasAchievements: !!data.achievements,
                });
            }
        });

        // Tìm backup trong points_snapshots
        const snapshotsSnap = await getDocs(collection(db, 'points_snapshots'));
        const snapshotsByUser: Record<string, any[]> = {};

        snapshotsSnap.forEach(d => {
            const data = d.data();
            const userId = data.userId;
            if (!snapshotsByUser[userId]) snapshotsByUser[userId] = [];
            snapshotsByUser[userId].push({
                id: d.id,
                date: data.date,
                points: data.points,
                ...data
            });
        });

        // Tìm farm data
        const farmSnap = await getDocs(collection(db, 'farms'));
        const farmByUser: Record<string, any> = {};
        farmSnap.forEach(d => {
            const data = d.data();
            farmByUser[data.userId || d.id] = {
                id: d.id,
                trees: data.trees?.length || 0,
                ...data
            };
        });

        // Tìm achievements
        const achievementsSnap = await getDocs(collection(db, 'user_achievements'));
        const achievementsByUser: Record<string, any[]> = {};
        achievementsSnap.forEach(d => {
            const data = d.data();
            const userId = data.userId;
            if (!achievementsByUser[userId]) achievementsByUser[userId] = [];
            achievementsByUser[userId].push(data);
        });

        // Kết hợp thông tin
        const recoveryInfo = mergedUsers.map(user => ({
            ...user,
            hasOldSnapshots: !!snapshotsByUser[user.originalUid],
            oldSnapshotsCount: snapshotsByUser[user.originalUid]?.length || 0,
            hasOldFarm: !!farmByUser[user.originalUid],
            oldFarmTrees: farmByUser[user.originalUid]?.trees || 0,
            hasOldAchievements: !!achievementsByUser[user.originalUid],
            oldAchievementsCount: achievementsByUser[user.originalUid]?.length || 0,
        }));

        return NextResponse.json({
            totalMergedUsers: mergedUsers.length,
            recoveryInfo,
            summary: {
                usersWithOldSnapshots: recoveryInfo.filter(u => u.hasOldSnapshots).length,
                usersWithOldFarm: recoveryInfo.filter(u => u.hasOldFarm).length,
                usersWithOldAchievements: recoveryInfo.filter(u => u.hasOldAchievements).length,
            }
        });

    } catch (err: any) {
        console.error('[restore-data] GET error:', err);
        return NextResponse.json({
            error: 'Failed to get restore info',
            message: err?.message
        }, { status: 500 });
    }
}

// POST: Thực hiện khôi phục data
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { action, userId, restoreAll } = body;

        const db = getDb();

        if (action === 'restore_user') {
            // Khôi phục data cho 1 user
            if (!userId) {
                return NextResponse.json({ error: 'userId required' }, { status: 400 });
            }

            const userRef = doc(db, 'users', userId);
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
                return NextResponse.json({ error: 'User not found' }, { status: 404 });
            }

            const userData = userSnap.data();
            const originalUid = userData.originalUid;

            if (!originalUid) {
                return NextResponse.json({ error: 'User was not merged (no originalUid)' }, { status: 400 });
            }

            let restored: string[] = [];

            // 1. Khôi phục Farm data
            const oldFarmRef = doc(db, 'farms', originalUid);
            const oldFarmSnap = await getDoc(oldFarmRef);
            if (oldFarmSnap.exists()) {
                const newFarmRef = doc(db, 'farms', userId);
                const newFarmSnap = await getDoc(newFarmRef);

                // Merge farm data - ưu tiên data cũ nếu data mới trống
                const oldFarmData = oldFarmSnap.data();
                const newFarmData = newFarmSnap.exists() ? newFarmSnap.data() : {};

                const mergedFarm = {
                    ...oldFarmData,
                    userId: userId,
                    trees: oldFarmData.trees?.length > (newFarmData.trees?.length || 0)
                        ? oldFarmData.trees
                        : (newFarmData.trees || oldFarmData.trees),
                    restoredAt: new Date().toISOString(),
                    restoredFrom: originalUid,
                };

                await setDoc(newFarmRef, mergedFarm, { merge: true });
                restored.push('farm');
            }

            // 2. Khôi phục Achievements
            const oldAchievementsSnap = await getDocs(
                query(collection(db, 'user_achievements'), where('userId', '==', originalUid))
            );

            for (const achDoc of oldAchievementsSnap.docs) {
                const achData = achDoc.data();
                // Tạo achievement mới cho user mới
                const newAchId = `${userId}_${achData.achievementId}`;
                await setDoc(doc(db, 'user_achievements', newAchId), {
                    ...achData,
                    userId: userId,
                    restoredAt: new Date().toISOString(),
                }, { merge: true });
            }
            if (oldAchievementsSnap.docs.length > 0) {
                restored.push(`achievements (${oldAchievementsSnap.docs.length})`);
            }

            // 3. Khôi phục Mission Progress
            const oldMissionsSnap = await getDocs(
                query(collection(db, 'user_missions'), where('userId', '==', originalUid))
            );

            for (const missionDoc of oldMissionsSnap.docs) {
                const missionData = missionDoc.data();
                const newMissionId = `${userId}_${missionData.missionId}`;
                await setDoc(doc(db, 'user_missions', newMissionId), {
                    ...missionData,
                    userId: userId,
                    restoredAt: new Date().toISOString(),
                }, { merge: true });
            }
            if (oldMissionsSnap.docs.length > 0) {
                restored.push(`missions (${oldMissionsSnap.docs.length})`);
            }

            // 4. Update user document với các field quan trọng từ old data
            // Lấy lại old user data nếu còn backup
            const backupRef = doc(db, 'users_backup', originalUid);
            const backupSnap = await getDoc(backupRef);

            if (backupSnap.exists()) {
                const backupData = backupSnap.data();
                await setDoc(userRef, {
                    treesProgress: backupData.treesProgress || userData.treesProgress,
                    totalTreesPlanted: Math.max(backupData.totalTreesPlanted || 0, userData.totalTreesPlanted || 0),
                    streak: Math.max(backupData.streak || 0, userData.streak || 0),
                    restoredAt: new Date().toISOString(),
                }, { merge: true });
                restored.push('user_profile_backup');
            }

            return NextResponse.json({
                success: true,
                userId,
                originalUid,
                restored,
                message: `Restored: ${restored.join(', ') || 'No data found to restore'}`
            });
        }

        if (action === 'restore_all') {
            // Khôi phục tất cả users đã merge
            const usersSnap = await getDocs(collection(db, 'users'));
            const results: any[] = [];
            let successCount = 0;
            let errorCount = 0;

            for (const userDoc of usersSnap.docs) {
                const userData = userDoc.data();
                if (!userData.originalUid) continue;

                try {
                    // Gọi logic restore như trên
                    const originalUid = userData.originalUid;
                    const userId = userDoc.id;
                    let restored: string[] = [];

                    // Farm
                    const oldFarmRef = doc(db, 'farms', originalUid);
                    const oldFarmSnap = await getDoc(oldFarmRef);
                    if (oldFarmSnap.exists()) {
                        const newFarmRef = doc(db, 'farms', userId);
                        await setDoc(newFarmRef, {
                            ...oldFarmSnap.data(),
                            userId: userId,
                            restoredAt: new Date().toISOString(),
                        }, { merge: true });
                        restored.push('farm');
                    }

                    // Achievements
                    const oldAchSnap = await getDocs(
                        query(collection(db, 'user_achievements'), where('userId', '==', originalUid))
                    );
                    for (const achDoc of oldAchSnap.docs) {
                        const newAchId = `${userId}_${achDoc.data().achievementId}`;
                        await setDoc(doc(db, 'user_achievements', newAchId), {
                            ...achDoc.data(),
                            userId: userId,
                        }, { merge: true });
                    }
                    if (oldAchSnap.docs.length > 0) restored.push('achievements');

                    results.push({
                        userId,
                        email: userData.email,
                        restored,
                        success: true
                    });
                    successCount++;
                } catch (err: any) {
                    results.push({
                        userId: userDoc.id,
                        email: userData.email,
                        error: err.message,
                        success: false
                    });
                    errorCount++;
                }
            }

            return NextResponse.json({
                success: true,
                message: `Restored ${successCount} users, ${errorCount} errors`,
                successCount,
                errorCount,
                results
            });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (err: any) {
        console.error('[restore-data] POST error:', err);
        return NextResponse.json({
            error: 'Failed to restore data',
            message: err?.message
        }, { status: 500 });
    }
}
