import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Link } from "@/models/Link";

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    // Validate input
    if (!text || typeof text !== "string" || text.trim() === "") {
      return NextResponse.json(
        { error: "Text is required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if link already exists
    const existingLink = await Link.findOne({ text: text.trim() });
    
    if (existingLink) {
      // Format the date as YYYY/M/D (matching user's example format)
      const savedDate = new Date(existingLink.createdAt);
      const year = savedDate.getFullYear();
      const month = savedDate.getMonth() + 1;
      const day = savedDate.getDate();
      const formattedDate = `${year}/${month}/${day}`;

      return NextResponse.json(
        { 
          error: `Error. You save this data at ${formattedDate}`,
          savedAt: existingLink.createdAt
        },
        { status: 409 } // 409 Conflict status code
      );
    }

    // Save new link
    const newLink = new Link({
      text: text.trim(),
    });

    await newLink.save();

    return NextResponse.json(
      {
        message: "Link saved successfully",
        link: {
          id: newLink._id,
          text: newLink.text,
          createdAt: newLink.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Save link error:", error);
    
    // Handle duplicate key error (in case unique constraint fails)
    if (error.code === 11000) {
      return NextResponse.json(
        { error: "This link already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

