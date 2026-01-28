import { NextResponse } from 'next/server';
import { getDb } from '../../../lib/firebase';
import { collection, getDocs, doc, setDoc, getDoc, deleteDoc, query, where } from 'firebase/firestore';

/**
 * API để merge accounts ảo với accounts thật
 * Quét accounts có điểm=0, tìm match theo email hoặc tên
 */

// Normalize string để so sánh
function normalizeString(s: string): string {
    return (s || '').toLowerCase().trim()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/[^a-z0-9]/g, ''); // Remove special chars
}

// POST: Thực hiện merge
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { action, newUid, oldUid, mergeList } = body;

        const db = getDb();

        if (action === 'merge_uid') {
            // Merge data từ oldUid sang newUid
            if (!newUid || !oldUid) {
                return NextResponse.json({ error: 'Both newUid and oldUid required' }, { status: 400 });
            }

            // Lấy data từ old document
            const oldDocRef = doc(db, 'users', oldUid);
            const oldDocSnap = await getDoc(oldDocRef);

            if (!oldDocSnap.exists()) {
                return NextResponse.json({ error: 'Old user document not found' }, { status: 404 });
            }

            const oldData = oldDocSnap.data();

            // Lấy data từ new document (nếu có)
            const newDocRef = doc(db, 'users', newUid);
            const newDocSnap = await getDoc(newDocRef);
            const newData = newDocSnap.exists() ? newDocSnap.data() : {};

            // Merge data (giữ lại greenPoints từ account ảo có điểm cao hơn)
            const mergedData = {
                ...oldData,
                ...newData,
                uid: newUid,
                greenPoints: Math.max(oldData.greenPoints || 0, newData.greenPoints || 0),
                displayName: oldData.displayName || newData.displayName || '',
                photoURL: oldData.photoURL || newData.photoURL || '',
                // Preserve old data
                originalUid: oldUid,
                mergedAt: new Date().toISOString(),
            };

            // Lưu merged data vào new document
            await setDoc(newDocRef, mergedData);

            // Update team_members nếu có
            const teamMembersSnap = await getDocs(query(collection(db, 'team_members'), where('userId', '==', oldUid)));
            for (const memberDoc of teamMembersSnap.docs) {
                // Check if new user already in team
                const existingCheck = await getDocs(query(
                    collection(db, 'team_members'),
                    where('userId', '==', newUid),
                    where('teamId', '==', memberDoc.data().teamId)
                ));

                if (existingCheck.empty) {
                    // Add new membership
                    const memberRef = doc(db, 'team_members', memberDoc.id);
                    await setDoc(memberRef, { ...memberDoc.data(), userId: newUid }, { merge: true });
                }
                // Delete old membership
                await deleteDoc(doc(db, 'team_members', memberDoc.id));
            }

            // Update points_snapshots
            const snapshotsSnap = await getDocs(query(collection(db, 'points_snapshots'), where('userId', '==', oldUid)));
            for (const snapDoc of snapshotsSnap.docs) {
                const data = snapDoc.data() as any;
                const newSnapId = `${newUid}_${data.date}`;
                await setDoc(doc(db, 'points_snapshots', newSnapId), { ...data, userId: newUid });
                await deleteDoc(doc(db, 'points_snapshots', snapDoc.id));
            }

            // Xóa old document
            await deleteDoc(oldDocRef);

            return NextResponse.json({
                success: true,
                message: 'Account merged successfully',
                mergedData: {
                    newUid,
                    oldUid,
                    greenPoints: mergedData.greenPoints,
                }
            });
        }

        if (action === 'merge_all') {
            // Merge tất cả các cặp trong mergeList
            if (!mergeList || !Array.isArray(mergeList) || mergeList.length === 0) {
                return NextResponse.json({ error: 'mergeList required' }, { status: 400 });
            }

            let successCount = 0;
            let errorCount = 0;
            const results: any[] = [];

            for (const pair of mergeList) {
                const { newUid, oldUid, email } = pair;

                try {
                    // Lấy data từ old document
                    const oldDocRef = doc(db, 'users', oldUid);
                    const oldDocSnap = await getDoc(oldDocRef);

                    if (!oldDocSnap.exists()) {
                        results.push({ email, error: 'Old account not found' });
                        errorCount++;
                        continue;
                    }

                    const oldData = oldDocSnap.data();

                    // Lấy data từ new document
                    const newDocRef = doc(db, 'users', newUid);
                    const newDocSnap = await getDoc(newDocRef);
                    const newData = newDocSnap.exists() ? newDocSnap.data() : {};

                    // Merge data
                    const mergedData = {
                        ...oldData,
                        ...newData,
                        uid: newUid,
                        greenPoints: Math.max(oldData.greenPoints || 0, newData.greenPoints || 0),
                        displayName: oldData.displayName || newData.displayName || '',
                        photoURL: oldData.photoURL || newData.photoURL || '',
                        originalUid: oldUid,
                        mergedAt: new Date().toISOString(),
                    };

                    await setDoc(newDocRef, mergedData);

                    // Update team_members
                    const teamMembersSnap = await getDocs(query(collection(db, 'team_members'), where('userId', '==', oldUid)));
                    for (const memberDoc of teamMembersSnap.docs) {
                        const existingCheck = await getDocs(query(
                            collection(db, 'team_members'),
                            where('userId', '==', newUid),
                            where('teamId', '==', memberDoc.data().teamId)
                        ));

                        if (existingCheck.empty) {
                            await setDoc(doc(db, 'team_members', memberDoc.id), { ...memberDoc.data(), userId: newUid }, { merge: true });
                        }
                        await deleteDoc(doc(db, 'team_members', memberDoc.id));
                    }

                    // Update points_snapshots
                    const snapshotsSnap = await getDocs(query(collection(db, 'points_snapshots'), where('userId', '==', oldUid)));
                    for (const snapDoc of snapshotsSnap.docs) {
                        const data = snapDoc.data() as any;
                        const newSnapId = `${newUid}_${data.date}`;
                        await setDoc(doc(db, 'points_snapshots', newSnapId), { ...data, userId: newUid });
                        await deleteDoc(doc(db, 'points_snapshots', snapDoc.id));
                    }

                    // Delete old document
                    await deleteDoc(oldDocRef);

                    results.push({ email, success: true, greenPoints: mergedData.greenPoints });
                    successCount++;
                } catch (err: any) {
                    results.push({ email, error: err.message });
                    errorCount++;
                }
            }

            return NextResponse.json({
                success: true,
                message: `Merged ${successCount}/${mergeList.length} accounts`,
                successCount,
                errorCount,
                results
            });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (err: any) {
        console.error('[merge-accounts] Error:', err);
        return NextResponse.json({
            error: 'Failed to merge accounts',
            message: err?.message
        }, { status: 500 });
    }
}

// GET: Quét accounts cần merge (điểm=0 hoặc email/tên trùng)
export async function GET(req: Request) {
    try {
        const db = getDb();

        // Lấy tất cả users
        const usersSnap = await getDocs(collection(db, 'users'));
        const users: any[] = [];
        usersSnap.forEach(d => {
            users.push({ id: d.id, ...d.data() as any });
        });

        // Accounts có điểm > 0 (potential source - account ảo)
        const sourceAccounts = users.filter(u => (u.greenPoints || 0) > 0);

        // Accounts có điểm = 0 (potential target - account mới đăng nhập)  
        const zeroPointAccounts = users.filter(u => (u.greenPoints || 0) === 0);

        // Tìm matches
        const matches: any[] = [];
        const matchedSourceIds = new Set<string>();

        for (const zeroAcc of zeroPointAccounts) {
            const zeroEmail = normalizeString(zeroAcc.email || '');
            const zeroName = normalizeString(zeroAcc.displayName || '');

            // Tìm source account match
            for (const sourceAcc of sourceAccounts) {
                if (matchedSourceIds.has(sourceAcc.id)) continue; // Đã match rồi
                if (sourceAcc.id === zeroAcc.id) continue; // Cùng account

                const sourceEmail = normalizeString(sourceAcc.email || '');
                const sourceName = normalizeString(sourceAcc.displayName || '');

                let matchType = null;
                let matchScore = 0;

                // Match by email (exact)
                if (zeroEmail && sourceEmail && zeroEmail === sourceEmail) {
                    matchType = 'email';
                    matchScore = 100;
                }
                // Match by name (exact)
                else if (zeroName && sourceName && zeroName === sourceName && zeroName.length > 3) {
                    matchType = 'name_exact';
                    matchScore = 90;
                }
                // Match by name (similar - starts with or contains)
                else if (zeroName && sourceName && zeroName.length > 5 && sourceName.length > 5) {
                    if (zeroName.startsWith(sourceName) || sourceName.startsWith(zeroName)) {
                        matchType = 'name_similar';
                        matchScore = 70;
                    } else if (zeroName.includes(sourceName) || sourceName.includes(zeroName)) {
                        matchType = 'name_partial';
                        matchScore = 50;
                    }
                }

                if (matchType) {
                    matches.push({
                        matchType,
                        matchScore,
                        zeroAccount: {
                            uid: zeroAcc.uid || zeroAcc.id,
                            email: zeroAcc.email,
                            displayName: zeroAcc.displayName,
                            greenPoints: zeroAcc.greenPoints || 0,
                        },
                        sourceAccount: {
                            uid: sourceAcc.uid || sourceAcc.id,
                            email: sourceAcc.email,
                            displayName: sourceAcc.displayName,
                            greenPoints: sourceAcc.greenPoints || 0,
                        }
                    });
                    matchedSourceIds.add(sourceAcc.id);
                    break; // Một zero account chỉ match 1 source
                }
            }
        }

        // Sort by match score
        matches.sort((a, b) => b.matchScore - a.matchScore);

        // Also find duplicate emails (legacy)
        const emailMap: Record<string, any[]> = {};
        users.forEach(u => {
            const email = (u.email || '').toLowerCase().trim();
            if (!email) return;
            if (!emailMap[email]) emailMap[email] = [];
            emailMap[email].push(u);
        });

        const duplicateEmails: any[] = [];
        Object.entries(emailMap).forEach(([email, users]) => {
            if (users.length > 1) {
                duplicateEmails.push({
                    email,
                    count: users.length,
                    users: users.map(u => ({
                        uid: u.uid || u.id,
                        displayName: u.displayName,
                        greenPoints: u.greenPoints || 0,
                    }))
                });
            }
        });

        return NextResponse.json({
            totalUsers: users.length,
            zeroPointAccounts: zeroPointAccounts.length,
            sourceAccounts: sourceAccounts.length,
            matchesFound: matches.length,
            matches,
            duplicateEmails: duplicateEmails.length,
            duplicates: duplicateEmails
        });

    } catch (err: any) {
        console.error('[merge-accounts] GET error:', err);
        return NextResponse.json({
            error: 'Failed to get accounts',
            message: err?.message
        }, { status: 500 });
    }
}
