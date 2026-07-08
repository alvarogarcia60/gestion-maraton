import { NextResponse } from 'next/server';
import clientPromise from '@/utils/mongodb';

const DB_NAME = 'programafutbol';
const COLLECTION_NAME = 'tournaments';

export async function GET() {
  try {
    if (!process.env.MONGODB_URI) {
      return NextResponse.json(
        { error: 'MongoDB connection string (MONGODB_URI) is not configured in environment variables.' },
        { status: 500 }
      );
    }
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const tournaments = await db
      .collection(COLLECTION_NAME)
      .find({})
      .sort({ lastModified: -1 })
      .toArray();

    // Map Mongo's _id so we don't return raw ObjectId directly if not needed
    return NextResponse.json(tournaments);
  } catch (error: any) {
    console.error('Error fetching tournaments from MongoDB:', error);
    return NextResponse.json(
      { error: error.message || 'Database error occurred while fetching tournaments.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    if (!process.env.MONGODB_URI) {
      return NextResponse.json(
        { error: 'MongoDB connection string (MONGODB_URI) is not configured in environment variables.' },
        { status: 500 }
      );
    }
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: 'Missing tournament id' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(DB_NAME);

    // Save tournament (Upsert: replace existing by custom string ID)
    const result = await db.collection(COLLECTION_NAME).replaceOne(
      { id: body.id },
      body,
      { upsert: true }
    );

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error('Error saving tournament to MongoDB:', error);
    return NextResponse.json(
      { error: error.message || 'Database error occurred while saving tournament.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    if (!process.env.MONGODB_URI) {
      return NextResponse.json(
        { error: 'MongoDB connection string (MONGODB_URI) is not configured in environment variables.' },
        { status: 500 }
      );
    }
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing tournament id' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const result = await db.collection(COLLECTION_NAME).deleteOne({ id });

    return NextResponse.json({ success: true, deletedCount: result.deletedCount });
  } catch (error: any) {
    console.error('Error deleting tournament from MongoDB:', error);
    return NextResponse.json(
      { error: error.message || 'Database error occurred while deleting tournament.' },
      { status: 500 }
    );
  }
}
