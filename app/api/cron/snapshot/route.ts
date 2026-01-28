import { NextResponse } from 'next/server';
import { getDb } from '../../../../lib/firebase';
import { collection, getDocs, doc, setDoc, serverTimestamp } from 'firebase/firestore';

// Secret key để bảo vệ API
const CRON_SECRET = process.env.CRON_SECRET || 'greenhabit-cron-2026';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const secret = searchParams.get('secret');

        if (secret !== CRON_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const db = getDb();
        const today = new Date().toISOString().split('T')[0];

        const usersSnap = await getDocs(collection(db, 'users'));
        const totalUsers = usersSnap.docs.length;

        let savedCount = 0;
        const batchSize = 10;
        const users = usersSnap.docs;

        for (let i = 0; i < users.length; i += batchSize) {
            const batch = users.slice(i, i + batchSize);

            await Promise.all(batch.map(async (userDoc) => {
                const userData = userDoc.data() as any;
                const userId = userDoc.id;
                const points = userData.greenPoints || 0;

                const docId = `${userId}_${today}`;
                const snapshotRef = doc(db, 'points_snapshots', docId);

                await setDoc(snapshotRef, {
                    userId,
                    points,
                    date: today,
                    createdAt: serverTimestamp()
                }, { merge: true });

                savedCount++;
            }));
        }

        return NextResponse.json({
            success: true,
            message: `Saved ${savedCount} snapshots`,
            date: today,
            usersCount: savedCount,
            totalUsers
        });

    } catch (err: any) {
        console.error('[CRON] Snapshot error:', err);
        return NextResponse.json({
            error: 'Failed to save snapshots',
            message: err?.message
        }, { status: 500 });
    }
}

export async function POST(req: Request) {
    return GET(req);
}
