import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

// ტრეიდების წამოღება ბაზიდან
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db('trading_journal'); // ბაზის სახელი
    const trades = await db.collection('trades').find({}).toArray();
    return NextResponse.json(trades, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch trades' }, { status: 500 });
  }
}

// ახალი ტრეიდის დამატება ბაზაში
export async function POST(request) {
  try {
    const body = await request.json();
    const client = await clientPromise;
    const db = client.db('trading_journal');
    
    // MongoDB-ს რომ '_id'-თან პრობლემა არ ჰქონდეს, ვინახავთ სუფთა ობიექტს
    const result = await db.collection('trades').insertOne(body);
    return NextResponse.json({ success: true, id: result.insertedId }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to insert trade' }, { status: 500 });
  }
}