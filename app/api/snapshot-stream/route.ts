import { NextResponse } from 'next/server';
import { getDb } from '../../../lib/firebase';
import { collection, getDocs, doc, setDoc, serverTimestamp } from 'firebase/firestore';

// API lưu snapshot với progress - gọi từ client
export async function POST(req: Request) {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            try {
                const db = getDb();
                const today = new Date().toISOString().split('T')[0];

                // Lấy tất cả users
                const usersSnap = await getDocs(collection(db, 'users'));
                const totalUsers = usersSnap.docs.length;

                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'start', total: totalUsers })}\n\n`));

                let savedCount = 0;
                const users = usersSnap.docs;

                for (let i = 0; i < users.length; i++) {
                    const userDoc = users[i];
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

                    // Gửi progress mỗi 5 users
                    if (savedCount % 5 === 0 || savedCount === totalUsers) {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                            type: 'progress',
                            current: savedCount,
                            total: totalUsers,
                            percent: Math.round((savedCount / totalUsers) * 100)
                        })}\n\n`));
                    }
                }

                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                    type: 'complete',
                    date: today,
                    usersCount: savedCount
                })}\n\n`));

                controller.close();
            } catch (err: any) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                    type: 'error',
                    message: err?.message || 'Unknown error'
                })}\n\n`));
                controller.close();
            }
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}
