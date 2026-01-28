import { NextResponse } from 'next/server';
import { getDb } from '../../../lib/firebase';
import { collection, query, where, getDocs, doc, runTransaction, serverTimestamp, increment, addDoc } from 'firebase/firestore';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { provider, value, pointsRequired, userId } = body;

    // Validate input
    if (!provider || !value || !userId || typeof pointsRequired !== 'number') {
      return NextResponse.json({ error: 'invalid_payload', message: 'Thiếu thông tin cần thiết' }, { status: 400 });
    }

    if (pointsRequired < 0) {
      return NextResponse.json({ error: 'invalid_points', message: 'Điểm không hợp lệ' }, { status: 400 });
    }

    const db = getDb();

    // Find one available card
    const cardsRef = collection(db, 'cards');
    const q = query(cardsRef, where('provider', '==', provider), where('value', '==', value), where('used', '==', false));
    const snaps = await getDocs(q);

    if (snaps.empty) {
      return NextResponse.json({ error: 'no_card', message: 'Không còn thẻ loại này' }, { status: 404 });
    }

    const cardDoc = snaps.docs[0];
    const cardRef = doc(db, 'cards', cardDoc.id);
    const userRef = doc(db, 'users', userId);
    const redeemsRef = collection(db, 'redeems');

    // Use transaction to ensure atomicity - chống gian lận
    const result = await runTransaction(db, async (tx) => {
      // 1. Kiểm tra thẻ còn tồn tại và chưa dùng
      const cardSnap = await tx.get(cardRef);
      if (!cardSnap.exists()) {
        throw new Error('card_not_found');
      }
      const cardData = cardSnap.data() as any;
      if (cardData.used) {
        throw new Error('card_already_used');
      }

      // 2. Kiểm tra user tồn tại và đủ điểm
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists()) {
        throw new Error('user_not_found');
      }
      const userData = userSnap.data() as any;
      const currentPoints = userData.greenPoints || 0;

      // 3. Kiểm tra đủ điểm - KHÔNG cho phép âm điểm
      if (currentPoints < pointsRequired) {
        throw new Error('insufficient_points');
      }

      // 4. TRƯỚC TIÊN: Trừ điểm user
      tx.update(userRef, {
        greenPoints: increment(-pointsRequired),
        lastGreenPointsUpdate: serverTimestamp()
      });

      // 5. SAU ĐÓ: Đánh dấu thẻ đã dùng
      tx.update(cardRef, {
        used: true,
        usedBy: userId,
        usedAt: serverTimestamp()
      });

      return {
        code: cardData.code || null,
        serial: cardData.serial || null,
        cardId: cardDoc.id,
        provider: cardData.provider,
        value: cardData.value,
        pointsDeducted: pointsRequired
      };
    });

    // 6. Ghi lịch sử redeem (ngoài transaction vì không critical)
    try {
      await addDoc(redeemsRef, {
        provider,
        value,
        cardId: result.cardId,
        code: result.code,
        serial: result.serial,
        userId,
        pointsUsed: pointsRequired,
        status: 'Thành công',
        createdAt: serverTimestamp()
      });
    } catch (e) {
      console.error('Failed to save redeem history:', e);
      // Không throw error vì transaction đã thành công
    }

    return NextResponse.json({
      success: true,
      message: 'Đổi thẻ thành công!',
      ...result
    });

  } catch (err: any) {
    console.error('API redeem error:', err);
    const message = err?.message || 'server_error';

    // Map error codes to user-friendly messages
    const errorMessages: Record<string, string> = {
      'card_not_found': 'Không tìm thấy thẻ',
      'card_already_used': 'Thẻ đã được sử dụng',
      'user_not_found': 'Không tìm thấy người dùng',
      'insufficient_points': 'Không đủ điểm để đổi thẻ này'
    };

    return NextResponse.json({
      error: message,
      message: errorMessages[message] || 'Lỗi hệ thống, vui lòng thử lại'
    }, { status: 500 });
  }
}
